import { headless, number, oneOf, string, web } from '../../../render.js'

/**
 * Map Terrain's headless tier: the land shaded by its slopes, which the frame draws where its renderer can, and raised in 3D on the web.
 *
 * **It draws nothing itself**, on either platform. The frame reads it among
 * its children and draws it with the rest of the map: through the page's
 * renderer on the web, and through MapLibre Native or the frame's still
 * drawing on a phone.
 *
 * **Held to `helix-map-terrain`.**
 */
export default headless('map-terrain', {
  props: {
    attribution: string(),
    description: string(),
    encoding: oneOf(['mapbox', 'terrarium'], 'terrarium'),
    exaggeration: 1,
    fallbackLabel: 'Terrain',
    group: string(),
    label: '',
    maxZoom: number(),
    raised: false,
    src: string(),
  },
  events: {
    mapPartChange: web(['kind']),
  },
  states: ['settled'],
  render: () => <></>,
})
