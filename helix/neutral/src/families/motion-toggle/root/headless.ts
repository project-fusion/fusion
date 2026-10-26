import {
  bind,
  box,
  derive,
  event,
  headless,
  pressable,
  prop,
  region,
  toggle,
  unless,
  when,
} from '../../../tree.js'

/**
 * Motion Toggle's headless tier: one toggle button that pauses every motion
 * on the page that starts by itself, and lets it run again.
 *
 * **The choice is the page's, and no prop holds it.** The web keeps it on the
 * document element as `data-helix-motion="paused"`, so two of these on one
 * page agree. A phone keeps it in the native runtime, where every Motion
 * Toggle in the app reads and writes the one choice, and an app reads it or
 * sets it with `motionPaused` and `pauseMotion`.
 *
 * **A phone cannot set the reader's own motion setting**, which iOS and
 * Android keep for the reader alone. While the app's motion is paused, every
 * Helix component draws as it does when the reader asks for reduced motion:
 * a keyframe stops or slows as its reduced-motion rule says, and a transition
 * takes no time.
 *
 * **A press asks, then turns**: `before-check`, with `checked` `true` where
 * the press pauses, which a handler can refuse to leave the motion as it is,
 * then `change`. It is announced as a toggle button named by `label`, pressed
 * while the motion is paused.
 *
 * **The icon shows what a press does next**: pause while motion runs, and
 * play while it is paused. The web draws it from its own icon set. A phone
 * draws the glyph of that name with the app's `Glyph`, and an icon passed
 * into `icon` replaces it on both.
 *
 * **Held to Motion Toggle's web element.** `helix family check` compares these
 * props, the events, the states, the regions, and the parts with what the
 * manifest says `helix-motion-toggle` has. The two glyphs are a phone's alone.
 */
export default headless('motion-toggle', {
  derived: { name: derive('motion-toggle-name') },
  events: [
    event('before-check', { cancelable: true, detail: ['checked'] }),
    event('change', { bare: true }),
  ],
  props: [
    prop('fallback-label', 'string', { default: 'Pause motion' }),
    prop('label', 'string', { default: '' }),
  ],
  states: ['paused', 'settled'],
  toggle: toggle({ after: 'change', before: 'before-check', held: 'page-motion' }),
  tree: [
    pressable('button', { label: bind('name'), role: 'button', toggles: true }, [
      box('icon', {}, [
        region('icon', {}, [
          unless('paused', box('glyph', { decorative: true, glyph: 'pause', platform: 'native' })),
          when('paused', box('glyph', { decorative: true, glyph: 'play', platform: 'native' })),
        ]),
      ]),
      region('default'),
    ]),
  ],
})
