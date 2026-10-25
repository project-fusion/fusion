import type { KeyPress } from '../types.generated.js'
import type { Keys } from './contract.generated.js'

/**
 * A `keydown` as the press it carries, with the modifiers held. A listener
 * nearer the key that prevented its default has claimed it.
 */
const pressOf = (event: KeyboardEvent): KeyPress => ({
  alt: event.altKey,
  claimed: event.defaultPrevented,
  control: event.ctrlKey,
  key: event.key,
  meta: event.metaKey,
  repeat: event.repeat,
  shift: event.shiftKey,
})

/**
 * Hears each `keydown` on the part, and calls `preventDefault()` on a press
 * the host takes.
 *
 * **Anywhere, it hears each `keydown` on the part's window**, in the capture
 * phase, so before the part with focus hears it, and a press the host takes
 * also goes no further: a dialog the part is in does not close on the Escape
 * a drag took.
 *
 * **A press an input method is composing is left to it.** A reader typing
 * Japanese, Chinese, or Korean presses Enter to accept a candidate and arrows
 * to choose one, and a host that took either would send a half-finished word
 * or move away from it. A `KeyPress` carries no flag for composing, so the
 * host could not tell, and the press never reaches it.
 */
export const webKeys: Keys<HTMLElement> = {
  listen: (node, heard) => {
    const listener = (event: KeyboardEvent): void => {
      if (!event.isComposing && heard(pressOf(event))) {
        event.preventDefault()
      }
    }
    node.addEventListener('keydown', listener)
    return () => {
      node.removeEventListener('keydown', listener)
    }
  },
  listenAnywhere: (node, heard) => {
    const view = node.ownerDocument.defaultView ?? window
    const listener = (event: KeyboardEvent): void => {
      if (!event.isComposing && heard(pressOf(event))) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    view.addEventListener('keydown', listener, true)
    return () => {
      view.removeEventListener('keydown', listener, true)
    }
  },
}
