import { headless, number, oneOf, string, web } from '../../../render.js'

/**
 * Map Contours's headless tier: contour lines from elevation tiles, which the web draws.
 *
 * **It draws nothing itself**, on either platform. The frame reads it among
 * its children and draws it with the rest of the map: through the page's
 * renderer on the web, and through MapLibre Native or the frame's still
 * drawing on a phone.
 *
 * **Held to `helix-map-contours`.**
 */
export default headless('map-contours', {
  props: {
    attribution: string(),
    description: string(),
    encoding: oneOf(['mapbox', 'terrarium'], 'terrarium'),
    fallbackLabel: 'Contour lines',
    group: string(),
    label: '',
    maxZoom: number(),
    src: string(),
    unit: oneOf(['feet', 'meters'], 'meters'),
  },
  events: {
    mapPartChange: web(['kind']),
  },
  states: ['settled'],
  render: () => <></>,
})
