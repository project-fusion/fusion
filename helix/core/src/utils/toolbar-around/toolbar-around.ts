/**
 * What counts as a toolbar: the page's own `role="toolbar"`, and either tier's
 * Toolbar, whose role is on a part inside its shadow root where `closest`
 * cannot see it.
 */
const TOOLBAR = '[role="toolbar"], helix-toolbar, helix-headless-toolbar'

/**
 * The toolbar an element sits in, or `null`.
 *
 * Read from the parent up, so a toolbar is never its own. One answer for every
 * family that changes inside a toolbar: Toolbar becomes a group of the outer
 * one, a multiple Toggle Group becomes a group, and Divider turns across the
 * toolbar's axis. By tag and by role, since a family other than Toolbar cannot
 * import Toolbar's class; Toolbar adds its own class for a third tag.
 *
 * `closest` stops at a shadow root, which is what a slotted child wants: its
 * toolbar is its light-DOM parent or above.
 */
export const toolbarAround = (element: Element): Element | null =>
  element.parentElement?.closest(TOOLBAR) ?? null

/**
 * The axis a toolbar runs along: its own `orientation`, else the page's
 * `aria-orientation`, else horizontal, which is the role's default.
 */
export const toolbarAxis = (toolbar: Element): 'horizontal' | 'vertical' =>
  (toolbar.getAttribute('orientation') ?? toolbar.getAttribute('aria-orientation')) === 'vertical'
    ? 'vertical'
    : 'horizontal'
