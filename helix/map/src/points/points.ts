import type { MapPlace } from '../connect-map/connect-map.js'

/** A points layer's places as a renderer draws them and a press reports them. */
export interface MapPoints {
  /** Each place's name, where it has one, and `''` where it does not. */
  names: string[]
  /** Where each is. */
  points: MapPlace[]
  /** What pressing each reports: its id, or its name, or where it is in the list. */
  values: string[]
}

/** A number that is one, rather than `NaN` or a string that looked like one. */
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/**
 * A points layer's data as places: a GeoJSON collection of `Point` features,
 * longitude first as GeoJSON writes it, or a list of `{ lat, lng }` places.
 *
 * **What is not a point is left out**, rather than drawn at the origin or
 * thrown over: a line or a polygon in the collection, a point with no
 * coordinates, a coordinate that is not a number. A multipoint is its points.
 */
export const pointsFrom = (data: unknown, nameKey = 'name'): MapPoints => {
  const found: MapPoints = { names: [], points: [], values: [] }
  const add = (lat: unknown, lng: unknown, name: unknown, id: unknown): void => {
    if (!finite(lat) || !finite(lng)) {
      return
    }
    const named = typeof name === 'string' ? name : ''
    found.names.push(named)
    found.points.push({ lat, lng })
    found.values.push(
      typeof id === 'string' || finite(id) ? String(id) : named || String(found.points.length - 1),
    )
  }
  if (Array.isArray(data)) {
    for (const place of data as { id?: unknown; label?: unknown; lat?: unknown; lng?: unknown }[]) {
      add(place?.lat, place?.lng, place?.label, place?.id)
    }
    return found
  }
  const features = (data as { features?: unknown } | null)?.features
  if (!Array.isArray(features)) {
    return found
  }
  for (const feature of features as {
    geometry?: { coordinates?: unknown; type?: unknown } | null
    id?: unknown
    properties?: Record<string, unknown> | null
  }[]) {
    const geometry = feature?.geometry
    const properties = feature?.properties ?? {}
    const id = feature?.id ?? properties.id
    const coordinates = geometry?.coordinates
    if (geometry?.type === 'Point' && Array.isArray(coordinates)) {
      add(coordinates[1], coordinates[0], properties[nameKey], id)
    } else if (geometry?.type === 'MultiPoint' && Array.isArray(coordinates)) {
      for (const one of coordinates) {
        if (Array.isArray(one)) {
          add(one[1], one[0], properties[nameKey], id)
        }
      }
    }
  }
  return found
}
