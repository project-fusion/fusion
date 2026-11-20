import { headless, number, object, string, web } from '../../../render.js'

/**
 * Map Raster's headless tier: tiles drawn over the map, such as weather, or as its ground, such as imagery, which the frame draws.
 *
 * **It draws nothing itself**, on either platform. The frame reads it among
 * its children and draws it with the rest of the map: through the page's
 * renderer on the web, and through MapLibre Native or the frame's still
 * drawing on a phone.
 *
 * **Held to `helix-map-raster`.**
 */
export default headless('map-raster', {
  props: {
    attribution: string(),
    description: string(),
    fallbackLabel: 'Overlay',
    frame: number(),
    frames: object(),
    ground: false,
    group: string(),
    interval: 600,
    label: '',
    maxZoom: number(),
    opacity: 0.7,
    playing: false,
    src: string(),
  },
  events: {
    mapPartChange: web(['kind']),
  },
  states: ['settled'],
  render: () => <></>,
})
