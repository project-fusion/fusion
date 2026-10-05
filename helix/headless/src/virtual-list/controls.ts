import { focusableElements } from '@fusion.dev/helix-core'

/**
 * A row's own links, buttons and fields, taken out of the tab order while
 * another row holds the list's tab stop.
 *
 * **The list is one tab stop, and Tab moves on into the focused row's own
 * controls.** Left as they are, the links in every drawn row stay in the tab
 * order, so Tab and Shift+Tab walked through the rows that happened to be drawn
 * and skipped the rest of the set. The arrows reach every item, so the other
 * rows' controls wait until their row is focused, the way a grid's cells hold
 * theirs.
 *
 * Each control's own `tabindex` is kept, and put back when its row takes the
 * stop.
 */
const held = new WeakMap<Element, string | null>()

/** Takes the controls in `rows` out of the tab order. */
export const holdControls = (rows: Element[]): void => {
  for (const row of rows) {
    if (!(row instanceof HTMLElement)) {
      continue
    }
    for (const control of focusableElements(row)) {
      held.set(control, control.getAttribute('tabindex'))
      control.setAttribute('tabindex', '-1')
    }
  }
}

/** Puts the controls in `rows` back in the tab order, as they were written. */
export const releaseControls = (rows: Element[]): void => {
  for (const row of rows) {
    for (const control of row.querySelectorAll('[tabindex]')) {
      if (!held.has(control)) {
        continue
      }
      const was = held.get(control)
      held.delete(control)
      if (was === null || was === undefined) {
        control.removeAttribute('tabindex')
      } else {
        control.setAttribute('tabindex', was)
      }
    }
  }
}
