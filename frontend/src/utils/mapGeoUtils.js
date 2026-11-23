import proj4 from 'proj4'
import { logger } from '@/utils/logger.js'

const log = logger.scoped('mapGeoUtils')

export const getFeatureId = (feature, fallback = 0) => {
  const properties = feature.properties || {}
  return properties.Id ?? properties.ProfileId ?? properties.ID ?? properties.fid ?? properties.id ?? feature.id ?? fallback
}

export const shouldUseTWD97 = (loadedGeojsonLayers = {}) => {
  return Object.values(loadedGeojsonLayers).some(layer => layer?.srid === 3826)
}

export const convertPointFromTWD97 = (coords, onFirstPoint) => {
  try {
    const [x, y] = coords
    const wgs84 = proj4('EPSG:3826', 'EPSG:4326', [x, y])
    const result = [wgs84[0], wgs84[1], ...coords.slice(2)]
    if (onFirstPoint) onFirstPoint({ source: [x, y], result })
    return result
  } catch (error) {
    log.error('坐標轉換失敗:', error, coords)
    return coords
  }
}

export const convertCoordinatesFromTWD97 = (coords, geometryType, convertPoint = convertPointFromTWD97) => {
  if (geometryType === 'Point') return convertPoint(coords)
  if (geometryType === 'LineString') return coords.map(coord => convertPoint(coord))
  if (geometryType === 'Polygon') return coords.map(ring => ring.map(coord => convertPoint(coord)))
  if (geometryType === 'MultiPoint') return coords.map(coord => convertPoint(coord))
  if (geometryType === 'MultiLineString') return coords.map(line => line.map(coord => convertPoint(coord)))
  if (geometryType === 'MultiPolygon') {
    return coords.map(polygon => polygon.map(ring => ring.map(coord => convertPoint(coord))))
  }
  return coords
}

export const convertGeoJsonFromTWD97 = (geojson, convertPoint = convertPointFromTWD97) => {
  if (!geojson?.features) return geojson
  const convertGeometry = geometry => {
    if (!geometry) return geometry
    if (geometry.type === 'GeometryCollection') {
      return { ...geometry, geometries: geometry.geometries.map(convertGeometry) }
    }
    return { ...geometry, coordinates: convertCoordinatesFromTWD97(geometry.coordinates, geometry.type, convertPoint) }
  }
  // Copy coordinates only; feature attributes are read-only during projection.
  return { ...geojson, features: geojson.features.map(feature => ({ ...feature, geometry: convertGeometry(feature.geometry) })) }
}

function* positions(geometry) {
  if (!geometry) return
  if (geometry.type === 'GeometryCollection') {
    for (const child of geometry.geometries) yield* positions(child)
    return
  }
  function* walk(coords) {
    if (!Array.isArray(coords) || !coords.length) return
    if (typeof coords[0] === 'number') yield coords
    else for (const child of coords) yield* walk(child)
  }
  yield* walk(geometry.coordinates)
}

export const extractAllCoordinates = geometry => Array.from(positions(geometry))

export const calculateGeoJSONBounds = (geojson, convertPoint = point => point) => {
  if (!geojson?.features?.length) return null

  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity

  geojson.features.forEach(feature => {
    for (const coord of positions(feature.geometry)) {
      const [lng, lat] = convertPoint(coord)
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
    }
  })

  if (!Number.isFinite(minLat)) return null
  return {
    south: minLat,
    north: maxLat,
    west: minLng,
    east: maxLng
  }
}

export const parseCSVLine = (line) => {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}
