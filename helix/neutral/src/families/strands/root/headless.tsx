import { headless, number, Slot, string, View, web } from '../../../render.js'

/**
 * Strands' headless tier: a ribbon of fine strands of light, drawn in the
 * theme's colors, in its own box.
 *
 * **The ribbon is drawn on the GPU**: a WebGL pipeline on the web, and on a
 * phone react-native-skia, an optional peer, from the strands core's
 * `ribbonMesh` lays, added together and bloomed. Without it the ribbon draws
 * its gradient, the band the web lays under its canvas. It stops while the
 * page or the app pauses its motion, and with reduced motion it is one still
 * frame.
 *
 * **Decorative**: the canvas is hidden from screen readers, and the content in
 * the default region is drawn over the ribbon and read as it is.
 *
 * **The web's**: `quiet`, which names elements by id, the stops' `for`, which
 * does too, and `travel`, which lays the ribbon down a scrolling document. A
 * phone has no document to find an id in or to scroll, so it draws the
 * ribbon in its own box, and `fallback`, which a phone without the peer
 * draws as its gradient without saying so.
 *
 * **Held to `helix-strands`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('strands', {
  props: {
    at: number(),
    bloom: 1,
    clear: false,
    contrast: 1,
    density: 0.8,
    depth: 1,
    drift: 1,
    dust: 1,
    gain: 1,
    pattern: string(),
    quiet: web(string()),
    softness: 0,
    speed: 1,
    spread: 1,
    travel: false,
  },
  events: {
    strandsFallback: web(['reason']),
  },
  states: ['drawing', 'fallback', 'settled'],
  strands: {},
  render: () => (
    <>
      <View
        ariaHidden
        part="canvas"
      />
      <View part="content">
        <Slot />
      </View>
    </>
  ),
})
