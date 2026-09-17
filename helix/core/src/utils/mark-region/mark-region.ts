import { slotFilled } from '../slot-filled/slot-filled.js'

/** What a region may hold besides what a consumer slotted. */
export interface RegionOptions {
  /**
   * Whether an empty region leaves the box tree as well as being marked.
   *
   * True everywhere but one place, and that exception is why this is an option
   * rather than the behavior. A region a component paints into while it is
   * empty has to keep its box: `Chat.Message` draws its typing indicator into a
   * content region whose emptiness is exactly what says to draw it, so hiding
   * the region would take the indicator with it.
   */
  hide?: boolean

  /**
   * A selector for something the component itself renders into the region.
   *
   * A region holding only what the component drew is not empty. Data Table's
   * footer holds its own pagination and Notifications' header its own mark-all
   * control, and both would otherwise be hidden out from under the thing they
   * were rendered to carry.
   */
  occupied?: string
}

/**
 * Says on a rendered region whether anything is in it.
 *
 * Nine families ask one question of a slot and write the same two attributes on
 * the box around it, and three of them carried this method byte for byte. What
 * differs between them is the region's name, which slots count toward it, and
 * whether the component draws into the region itself, so those are the
 * arguments and nothing else is. `slotFilled` beside this is the half that
 * answers whether there is anything there, and carries the reason no selector
 * can.
 *
 * **The empty string names the default slot**, and it resolves to
 * `slot:not([name])` rather than to a bare `slot`, which matches whichever slot
 * comes first in the shadow root and is the right answer only while a component
 * has one.
 *
 * On the region inside the shadow root rather than on the host: an attribute
 * written onto the host is a change to markup the consumer rendered, which
 * React reports on hydration and does not patch up.
 */
export const markRegion = (
  root: ParentNode | null | undefined,
  part: string,
  slots: readonly string[],
  options: RegionOptions = {},
): void => {
  const region = root?.querySelector<HTMLElement>(`[part="${part}"]`)
  const filled =
    slots.some((name) =>
      slotFilled(
        root?.querySelector<HTMLSlotElement>(
          name === '' ? 'slot:not([name])' : `slot[name="${name}"]`,
        ),
      ),
    ) || Boolean(options.occupied && root?.querySelector(options.occupied))
  region?.toggleAttribute('data-empty', !filled)
  if (options.hide !== false) {
    region?.toggleAttribute('hidden', !filled)
  }
}
