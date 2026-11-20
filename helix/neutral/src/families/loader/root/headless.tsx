import { Circle, headless, Slot, Svg, View, web } from '../../../render.js'
import { bind, derive, not } from '../../../tree.js'

/**
 * Loader's headless tier: work of unknown length in progress.
 *
 * **The host is a busy progress bar named by `label`**, with no reading,
 * since a loader claims no proportion. It draws a track and an arc that
 * turns, and a `mark` at the center for a logo, which stays still.
 *
 * **`delay` keeps quick work from flashing a loader.** While the wait runs,
 * the loader is `waiting`: its drawing keeps its box and is not drawn, and a
 * screen reader hears nothing. The web and a phone run core's one `delay`.
 *
 * **The loader can stand in for what it wraps.** The `content` region keeps
 * its box, hidden and inert, while the work runs. While `idle`, the loader
 * draws nothing of its own, has no role and is not busy, and the content
 * shows. Clearing `idle` starts `delay` again.
 *
 * **`for`, which marks a region of the page busy by its id, is the web's**:
 * a phone's components name no other component by id.
 */
export default headless('loader', {
  props: {
    /* Milliseconds; the web's attribute also takes a CSS time, `300ms`. */
    delay: 0,
    fallbackLabel: 'Loading',
    for: web(''),
    idle: false,
    label: '',
  },
  events: {},
  states: ['settled', 'waiting'],
  derived: {
    spokenLabel: derive('loader-name'),
    spokenRole: derive('loader-role'),
  },
  delay: { duration: 'delay', idleWhen: 'idle', pending: 'waiting' },
  host: {
    busy: not('idle'),
    ariaHidden: bind('waiting'),
    label: bind('spokenLabel'),
    role: bind('spokenRole'),
  },
  render: ({ props }) => (
    <>
      <View
        inert={!props.idle}
        part="content"
      >
        <Slot name="content" />
      </View>
      {!props.idle && (
        <Svg
          ariaHidden
          part="svg"
          viewBox="0 0 24 24"
        >
          <Circle
            cx={12}
            cy={12}
            part="track"
            r={10}
          />
          <Circle
            cx={12}
            cy={12}
            part="indicator"
            r={10}
          />
        </Svg>
      )}
      {!props.idle && (
        <View
          ariaHidden
          part="mark"
        >
          <Slot />
        </View>
      )}
    </>
  ),
})
