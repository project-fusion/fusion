import { environment } from '@fusion.dev/helix-core/capabilities/environment'
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import type { RovingContext } from '@fusion.dev/helix-core/machines/roving-focus/machine'
import * as roving from '@fusion.dev/helix-core/machines/roving-focus/roving-focus.generated'
import type { Member } from './collection'
import { eventOf } from './roving-focus'

/**
 * Moves focus between the items of a set whose items open, as an
 * accordion's triggers, from the item the set knows by `from`: **Up and
 * Down, Left and Right to the one before and after, coming round at the
 * ends, and Home and End to the first and the last**, passing over a
 * disabled item. Arriving opens nothing, and each item stays a stop of its
 * own, as on the web.
 *
 * The move is core's roving focus, read from its compiled module, so a
 * phone counts the moves as the web's keyboard navigation does. Answers
 * whether the key moved focus, so the platform does nothing else with it.
 */
export const moveAmong = (
  members: readonly Member[],
  from: object | undefined,
  press: KeyPress,
): boolean => {
  const reached = members.filter((member) => !member.disabled && member.node?.() != null)
  const event = eventOf(press, environment().read().direction === 'rtl')
  const at = reached.findIndex((member) => member.key === from)
  if (event === undefined || press.claimed || at === -1) {
    return false
  }
  const seated: RovingContext = {
    at,
    count: reached.length,
    focus: true,
    selects: false,
    wrap: true,
  }
  const moved = roving.step(roving.start(seated), seated, event, undefined)
  const landed =
    moved === undefined || !('context' in moved) ? undefined : reached[moved.context.at]
  const node = landed?.node?.()
  if (node !== undefined && node !== null && landed !== reached[at]) {
    focus().focus(node, false)
  }
  return true
}
