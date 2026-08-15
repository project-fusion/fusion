/** The least a member must be for a group to disable it. */
export interface DisableableItem extends HTMLElement {
  /** Whether the item is out of play, from either source. */
  disabled: boolean
}

/**
 * What each item declared for itself, before any group wrote to it.
 *
 * A `WeakMap` because the alternative is reading the attribute back, and the
 * attribute is the thing being written: `disabled` reflects, so the second pass
 * would read what the first pass wrote and the item would never come back.
 */
const own = new WeakMap<Element, boolean>()

/**
 * Disables a group's members without forgetting what they said themselves.
 *
 * A group and its members are two sources for one fact: a member is out of play
 * if either says so. Written the obvious way that is
 * `item.disabled = group || item.disabled`, and it latches. The first pass with
 * the group disabled writes `true` onto every member; the next pass reads its
 * own writing back as the member's own answer; and enabling the group leaves
 * every member disabled for good. Nothing about it is visible until something
 * re-enables a group, which is rare enough to ship and miserable to find.
 *
 * So what a member said itself is recorded before it is first overridden, and
 * given back when the group lets go. Restoring is the half that matters: a
 * version that only recorded would read the overridden value as the member's
 * own the moment the group was enabled, which is the same latch by a longer
 * route.
 *
 * Once given back, the record is dropped, so a consumer disabling a member
 * afterwards is its own answer again and is left alone.
 */
export const inheritDisabled = (disabled: boolean, items: DisableableItem[]): void => {
  for (const item of items) {
    if (disabled) {
      if (!own.has(item)) {
        own.set(item, item.disabled)
      }
      item.disabled = true
      continue
    }
    /* Only where this held it down. An item nothing overrode is the consumer's
       business and is not touched, which is what keeps a group that was never
       disabled from writing to its members at all. */
    if (own.has(item)) {
      item.disabled = own.get(item) ?? false
      own.delete(item)
    }
  }
}

/**
 * Forgets what a group recorded about an item.
 *
 * For an item leaving a group, which would otherwise carry the group's last
 * word into wherever it goes next.
 */
export const forgetDisabled = (item: Element): void => {
  own.delete(item)
}
