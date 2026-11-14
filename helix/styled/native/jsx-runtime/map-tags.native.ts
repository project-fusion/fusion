/* Each Map tag as the native component of that name, and the layers a map
   reads, which draw nothing themselves. */
import { HelixMap, HelixMapMarker, HelixMapPoints, HelixMapPosition } from '../map/index.native'

/**
 * A layer a map reads, which draws nothing itself, as on the web: the frame
 * finds it among its children by its tag and draws it with the map.
 */
const mapLayer = (tag: string) => Object.assign(() => null, { displayName: tag, tag })

export const MAP_TAGS: Readonly<Record<string, unknown>> = {
  'helix-map': HelixMap,
  'helix-map-area': mapLayer('helix-map-area'),
  'helix-map-buildings': mapLayer('helix-map-buildings'),
  'helix-map-contours': mapLayer('helix-map-contours'),
  'helix-map-landcover': mapLayer('helix-map-landcover'),
  'helix-map-marker': HelixMapMarker,
  'helix-map-points': HelixMapPoints,
  'helix-map-position': HelixMapPosition,
  'helix-map-raster': mapLayer('helix-map-raster'),
  'helix-map-route': mapLayer('helix-map-route'),
  'helix-map-terrain': mapLayer('helix-map-terrain'),
}
