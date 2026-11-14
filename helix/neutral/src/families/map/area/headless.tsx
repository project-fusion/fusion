import { headless, object, oneOf, string, web } from '../../../render.js'

/**
 * Map Area's headless tier: a shape on the map, such as a delivery zone, which the frame draws.
 *
 * **It draws nothing itself**, on either platform. The frame reads it among
 * its children and draws it with the rest of the map: through the page's
 * renderer on the web, and through MapLibre Native or the frame's still
 * drawing on a phone.
 *
 * **Held to `helix-map-area`.**
 */
export default headless('map-area', {
  props: {
    caption: string(),
    captionPlacement: oneOf(['inside', 'outside'], 'inside'),
    description: string(),
    fallbackLabel: 'Area',
    group: string(),
    label: '',
    points: object(),
  },
  events: {
    mapPartChange: web(['kind']),
  },
  states: ['settled'],
  render: () => <></>,
})
