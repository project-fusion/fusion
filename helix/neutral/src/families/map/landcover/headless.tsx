import { headless, string, web } from '../../../render.js'

/**
 * Map Landcover's headless tier: the ground tinted by what covers it, which the frame draws.
 *
 * **It draws nothing itself**, on either platform. The frame reads it among
 * its children and draws it with the rest of the map: through the page's
 * renderer on the web, and through MapLibre Native or the frame's still
 * drawing on a phone.
 *
 * **Held to `helix-map-landcover`.**
 */
export default headless('map-landcover', {
  props: {
    description: string(),
    fallbackLabel: 'Land cover',
    group: string(),
    label: '',
  },
  events: {
    mapPartChange: web(['kind']),
  },
  states: ['settled'],
  render: () => <></>,
})
