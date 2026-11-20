import { headless, string, web } from '../../../render.js'

/**
 * Map Buildings's headless tier: the buildings raised to their heights, which the frame draws where its renderer can.
 *
 * **It draws nothing itself**, on either platform. The frame reads it among
 * its children and draws it with the rest of the map: through the page's
 * renderer on the web, and through MapLibre Native or the frame's still
 * drawing on a phone.
 *
 * **Held to `helix-map-buildings`.**
 */
export default headless('map-buildings', {
  props: {
    description: string(),
    fallbackLabel: '3D buildings',
    group: string(),
    label: '',
  },
  events: {
    mapPartChange: web(['kind']),
  },
  states: ['settled'],
  render: () => <></>,
})
