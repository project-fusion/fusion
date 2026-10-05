import type { PressPointerType } from '../../events/details.js'

/** The pointer kinds a press is named by as they are. */
const POINTERS: ReadonlySet<string> = new Set(['mouse', 'pen', 'touch'])

/** What the control saw before the click, which the click does not carry everywhere. */
export interface RecentPress {
  /** Whether Enter or Space started this press. */
  key?: boolean
  /** The `pointerType` of the last `pointerdown` on the control. */
  pointer?: string
}

/**
 * What a `click` came from, for `HelixPressEvent`.
 *
 * **Read in order.** The click's own pointer kind first, which Chromium and
 * Firefox put on it. Then a key, which the caller saw start the press, because
 * a keyboard press and a script's `click()` arrive alike. Then, for a click
 * with a press count (`detail` above zero), the last pointer's kind, or
 * `mouse` where none was seen, which is how Safari's click arrives. A click
 * with none of these is `virtual`, as React Aria reads one: a screen reader's
 * press or a script's `click()`.
 */
export const pressType = (click: MouseEvent, recent: RecentPress = {}): PressPointerType => {
  const own = (click as MouseEvent & { pointerType?: string }).pointerType ?? ''
  if (POINTERS.has(own)) {
    return own as PressPointerType
  }
  if (recent.key === true) {
    return 'keyboard'
  }
  if (click.detail > 0) {
    const last = recent.pointer ?? ''
    return POINTERS.has(last) ? (last as PressPointerType) : 'mouse'
  }
  return 'virtual'
}
