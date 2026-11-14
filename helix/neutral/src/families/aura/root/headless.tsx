import { bare, headless, number, Pressable, Slot, string, View, web } from '../../../render.js'

/**
 * Aura's headless tier: a drifting background of light, drawn in the theme's
 * colors.
 *
 * **The field is drawn on the GPU**: a WebGL shader on the web, and the same
 * shader as a react-native-skia runtime effect on a phone, an optional peer,
 * from core's `AuraField`. Without it the aura draws its gradient, the same
 * stops ramped from the top right. The field stops while the page or the app
 * pauses its motion, and with reduced motion it is one still frame.
 *
 * **Decorative**: the canvas is hidden from screen readers, and the content in
 * the default region is drawn over the field and read as it is.
 *
 * **Its own pause control under `pause-control`**, in the trailing corner, a
 * toggle named by `pause-label` that says it is pressed while the field is
 * paused, and sends `change` as it turns.
 *
 * **The web's**: the pointer's wake (`interactive`), which a phone has no
 * pointer to draw, and `fallback`, which a phone without the peer draws as
 * its gradient without saying so.
 *
 * **Held to `helix-aura`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('aura', {
  props: {
    bloom: 0.5,
    drift: 0,
    gain: 1,
    interaction: string(),
    interactive: false,
    pattern: string(),
    pauseControl: false,
    paused: false,
    pauseLabel: 'Pause the motion',
    reach: 1,
    scale: 1,
    speed: 1,
    terminus: number(),
    tilt: 14,
    variance: 1,
  },
  events: {
    auraFallback: web(['reason']),
    change: bare(),
  },
  states: ['drawing', 'fallback', 'settled'],
  aura: {
    glyph: 'glyph',
    held: 'held',
  },
  render: ({ aura, props }) => (
    <>
      <View
        ariaHidden
        part="canvas"
      />
      <View part="content">
        <Slot />
      </View>
      {props.pauseControl && (
        <Pressable
          label={props.pauseLabel}
          part="pause"
          pressed={aura.held}
          role="button"
        >
          <View
            ariaHidden
            icon={aura.glyph}
            part="pause-mark"
          />
        </Pressable>
      )}
    </>
  ),
})
