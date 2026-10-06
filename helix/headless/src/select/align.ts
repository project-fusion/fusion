/** A box on the screen, in viewport pixels. */
export interface Box {
  height: number
  left: number
  top: number
  width: number
}

/** What places a list over its trigger. */
export interface Over {
  /** How far inside the screen's edges the list stays, in pixels. */
  margin: number
  /** The option to sit on the trigger: its top within the list, and its height. */
  option: { height: number; top: number }
  /** The list's own size. */
  panel: { height: number; width: number }
  /** Whether the line of text runs right to left, which aligns the end edges. */
  rtl: boolean
  /** The trigger. */
  trigger: Box
  /** The screen. */
  viewport: { height: number; width: number }
}

/**
 * Where a list opened over its trigger goes, so the option it opens on sits
 * where the trigger is: the native select's place on macOS, and Radix's
 * `item-aligned`.
 *
 * The option's middle on the trigger's middle, then kept on the screen: a
 * list that would run off the bottom moves up, and one that would run off the
 * top moves down, so near an edge the option is beside the trigger rather than
 * on it. A list taller than the screen starts at its top edge. The start edges
 * line up, the left in English and the right in Arabic, kept on the screen the
 * same way.
 */
export const over = ({
  margin,
  option,
  panel,
  rtl,
  trigger,
  viewport,
}: Over): {
  left: number
  top: number
} => {
  const centered = trigger.top + trigger.height / 2 - (option.top + option.height / 2)
  const top = Math.max(margin, Math.min(centered, viewport.height - margin - panel.height))
  const start = rtl ? trigger.left + trigger.width - panel.width : trigger.left
  const left = Math.max(margin, Math.min(start, viewport.width - margin - panel.width))
  return { left: Math.round(left), top: Math.round(top) }
}
