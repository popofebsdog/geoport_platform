import { DOMParser } from '@xmldom/xmldom';
import { kml } from '@tmcw/togeojson';
import proj4 from 'proj4';

export const vectorExtensions = ['.geojson', '.json', '.kml'];
export const maxVectorSize = 64 * 1024 * 1024;
const geometryTypes = new Set(['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection']);
const invalid = message => Object.assign(new Error(message), { status: 400 });

export function parseVectorFile(content, extension) {
  let data;
  try {
    if (extension === '.kml') {
      if (/<!DOCTYPE/i.test(content)) throw invalid('KML 不允許 DOCTYPE');
      const doc = new DOMParser({ onError: (_level, message) => { throw new Error(message); } }).parseFromString(content, 'application/xml');
      if (doc.documentElement?.localName !== 'kml') throw invalid('檔案內容不是 KML');
      data = kml(doc);
      if (!data.features.length) throw invalid('KML 沒有可顯示的幾何資料');
    } else {
      data = JSON.parse(content.replace(/^\uFEFF/, ''));
    }
  } catch (error) {
    throw invalid(error.status === 400 ? error.message : '無法解析圖資，請檢查 GeoJSON 或 KML 格式');
  }
  if (!data || typeof data !== 'object') throw invalid('檔案內容不是 GeoJSON');
  let features;
  if (data.type === 'FeatureCollection' && Array.isArray(data.features)) features = data.features;
  else if (data.type === 'Feature') features = [data];
  else if (geometryTypes.has(data.type)) features = [{ type: 'Feature', properties: null, geometry: data }];
  else throw invalid('需要 GeoJSON FeatureCollection、Feature 或 Geometry');

  const name = data.crs?.properties?.name;
  let srid;
  if (name) {
    if (/(?:^|[:/])3826$/i.test(name) || name === 'TWD97') srid = 3826;
    else if (/(?:^|[:/])4326$/i.test(name) || /(?:^|:)CRS84$/i.test(name) || name === 'WGS84') srid = 4326;
    else throw invalid(`不支援的座標系統：${name}，請使用 EPSG:4326 或 EPSG:3826`);
  }
  let bounds = null;
  const types = new Set();
  function position(point) {
    if (!Array.isArray(point) || point.length < 2 || !point.every(Number.isFinite)) throw invalid('坐標必須包含有效的數值 X、Y');
    const [x, y] = point;
    if (!srid) srid = x > 100000 && x < 500000 && y > 2000000 && y < 3000000 ? 3826 : 4326;
    if (srid === 4326 && (x < -180 || x > 180 || y < -90 || y > 90)) throw invalid('WGS84 坐標超出經緯度範圍，請確認座標系統');
    if (!bounds) bounds = { minX: x, minY: y, maxX: x, maxY: y };
    else {
      bounds.minX = Math.min(bounds.minX, x); bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x); bounds.maxY = Math.max(bounds.maxY, y);
    }
  }
  function array(value, minLength, visit) {
    if (!Array.isArray(value) || value.length < minLength) throw invalid('幾何資料的坐標結構或點數不正確');
    value.forEach(visit);
  }
  const line = coords => array(coords, 2, position);
  const ring = coords => {
    array(coords, 4, position);
    if (coords[0].length !== coords.at(-1).length || !coords[0].every((value, i) => value === coords.at(-1)[i])) throw invalid('Polygon 的邊界必須閉合');
  };
  const polygon = coords => array(coords, 1, ring);
  function geometry(value, depth = 0) {
    if (value === null) return;
    if (!value || !geometryTypes.has(value.type) || depth > 32) throw invalid('不支援的幾何資料');
    types.add(value.type === 'GeometryCollection' ? 'Collection' : value.type);
    switch (value.type) {
      case 'Point': position(value.coordinates); break;
      case 'MultiPoint': array(value.coordinates, 0, position); break;
      case 'LineString': line(value.coordinates); break;
      case 'MultiLineString': array(value.coordinates, 0, line); break;
      case 'Polygon': polygon(value.coordinates); break;
      case 'MultiPolygon': array(value.coordinates, 0, polygon); break;
      case 'GeometryCollection': array(value.geometries, 0, child => geometry(child, depth + 1)); break;
    }
  }
  for (const feature of features) {
    if (!feature || feature.type !== 'Feature' || (feature.properties != null && (typeof feature.properties !== 'object' || Array.isArray(feature.properties)))) throw invalid('GeoJSON Feature 格式不正確');
    geometry(feature.geometry);
  }
  return { geojson: { ...data, type: 'FeatureCollection', features }, srid: srid || 4326,
    spatialInfo: { geometryType: types.size === 1 ? [...types][0] : 'Collection', featureCount: features.length, bounds } };
}

export function boundsToWgs84(bounds, srid) {
  if (!bounds || Object.values(bounds).some(value => value == null || !Number.isFinite(Number(value)))) return null;
  const { minX, minY, maxX, maxY } = Object.fromEntries(Object.entries(bounds).map(([key, value]) => [key, Number(value)]));
  if (Number(srid) !== 3826) return { minX, minY, maxX, maxY };
  const projection = '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +units=m +no_defs';
  const corners = [[minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]].map(point => proj4(projection, 'EPSG:4326', point));
  return { minX: Math.min(...corners.map(point => point[0])), minY: Math.min(...corners.map(point => point[1])),
    maxX: Math.max(...corners.map(point => point[0])), maxY: Math.max(...corners.map(point => point[1])) };
}
