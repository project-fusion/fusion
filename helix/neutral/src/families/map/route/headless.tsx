import { headless, number, object, string, web } from '../../../render.js'

/**
 * Map Route's headless tier: a line along the map, such as a delivery route, which the frame draws.
 *
 * **It draws nothing itself**, on either platform. The frame reads it among
 * its children and draws it with the rest of the map: through the page's
 * renderer on the web, and through MapLibre Native or the frame's still
 * drawing on a phone.
 *
 * **Held to `helix-map-route`.**
 */
export default headless('map-route', {
  props: {
    description: string(),
    fallbackLabel: 'Route',
    group: string(),
    label: '',
    points: object(),
    progress: number(),
  },
  events: {
    mapPartChange: web(['kind']),
  },
  states: ['settled'],
  render: () => <></>,
})
