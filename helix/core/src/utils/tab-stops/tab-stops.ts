/**
 * Every element in `root` that Tab stops at, in the order Tab reaches them,
 * through shadow roots and slots.
 *
 * Through them because a panel's controls are inside the component it holds,
 * and often a button's inside that, so a light-DOM query such as
 * `focusableElements` finds none of them. Walked in the composed tree's order:
 * a host's shadow root in place of its children, and a slot's assigned
 * elements in place of its fallback. A host that delegates its focus is
 * passed through to what it delegates to, and anything `hidden`, `inert`,
 * disabled or without a box is left out.
 *
 * `MixinPickerField` keeps Tab inside a picker's panel with it, reading the
 * first and last of these as the ends of the dialog.
 */
export const tabStops = (root: Element): HTMLElement[] => {
  const found: HTMLElement[] = []
  const visit = (node: Element): void => {
    const element = node as HTMLElement
    if (element.hidden || element.inert) {
      return
    }
    if (
      element.tabIndex >= 0 &&
      !element.shadowRoot?.delegatesFocus &&
      !(element as HTMLButtonElement).disabled &&
      element.getClientRects().length > 0
    ) {
      found.push(element)
    }
    const assigned = node instanceof HTMLSlotElement ? node.assignedElements() : []
    const children = assigned.length > 0 ? assigned : [...(node.shadowRoot ?? node).children]
    for (const child of children) {
      visit(child)
    }
  }
  visit(root)
  return found
}
