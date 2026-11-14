import { Announce, headless, object, Slot, View } from '../../../render.js'
import { bind, derive } from '../../../tree.js'

/**
 * Orb's headless tier: an animated shape that shows what an agent is doing.
 *
 * **The host carries what a screen reader hears**: a busy progress bar named
 * for its state, such as "Thinking", an image named "Done" once it is done,
 * and a status region under `announce`, which says each new state. A state
 * the orb does not draw is drawn and named as `thinking`. Each state is also
 * a custom state, such as `:state(working)`.
 *
 * **The dots are drawn on the GPU**: a canvas on the web, and
 * react-native-skia on a phone, an optional peer, from core's `OrbClock`.
 * A phone without it draws one still frame of the same dots. The dots stop
 * while the page or the app pauses its motion, and with reduced motion they
 * are one still frame.
 *
 * **A shape of the page's own goes in the default region**, and the dots give
 * way to it.
 *
 * **Held to `helix-orb`.** `helix system check` compares the props, the
 * states, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('orb', {
  props: {
    announce: false,
    label: '',
    state: 'thinking',
    stateLabels: object(),
  },
  events: {},
  states: [
    'connecting',
    'done',
    'fetching',
    'listening',
    'settled',
    'thinking',
    'waiting',
    'working',
  ],
  derived: {
    spokenBusy: derive('orb-busy'),
    spokenLabel: derive('orb-name'),
    spokenRole: derive('orb-role'),
    word: derive('orb-word'),
  },
  host: {
    busy: bind('spokenBusy'),
    label: bind('spokenLabel'),
    role: bind('spokenRole'),
  },
  orb: { shown: 'shown' },
  render: ({ derived, props, slots }) => (
    <>
      <View
        ariaHidden
        hidden={slots.default}
        part="canvas"
      />
      <Slot />
      {props.announce && <Announce part="live">{derived.word}</Announce>}
    </>
  ),
})
