import proj4 from 'proj4'
import { logger } from '@/utils/logger.js'

const log = logger.scoped('mapGeoUtils')

export const shouldUseTWD97 = (loadedGeojsonLayers = {}) => {
  return Object.values(loadedGeojsonLayers).some(layer => layer?.srid === 3826)
}

export const convertPointFromTWD97 = (coords, onFirstPoint) => {
  try {
    const [x, y] = coords
    const wgs84 = proj4('EPSG:3826', 'EPSG:4326', [x, y])
    const result = [wgs84[0], wgs84[1]]
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

  const convertedGeoJSON = JSON.parse(JSON.stringify(geojson))
  convertedGeoJSON.features.forEach((feature) => {
    if (feature.geometry?.coordinates) {
      feature.geometry.coordinates = convertCoordinatesFromTWD97(
        feature.geometry.coordinates,
        feature.geometry.type,
        convertPoint
      )
    }
  })

  return convertedGeoJSON
}

export const extractAllCoordinates = (geometry) => {
  const coords = []
  if (!geometry) return coords

  if (geometry.type === 'Point') coords.push(geometry.coordinates)
  if (geometry.type === 'LineString') coords.push(...geometry.coordinates)
  if (geometry.type === 'Polygon') geometry.coordinates.forEach(ring => coords.push(...ring))
  if (geometry.type === 'MultiPoint') coords.push(...geometry.coordinates)
  if (geometry.type === 'MultiLineString') geometry.coordinates.forEach(line => coords.push(...line))
  if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(polygon => polygon.forEach(ring => coords.push(...ring)))
  }

  return coords
}

export const calculateGeoJSONBounds = (geojson, convertPoint = convertPointFromTWD97) => {
  if (!geojson?.features?.length) return null

  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity

  geojson.features.forEach(feature => {
    extractAllCoordinates(feature.geometry).forEach((coord) => {
      const [lng, lat] = convertPoint(coord)
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
    })
  })

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
