import { deepActiveElement } from '../../utils/focusable-elements/focusable-elements.js'
import type { Focus } from './contract.generated.js'

/**
 * Moves focus with the element's `focus()`, and reads it from
 * `document.activeElement`.
 *
 * **`focused` follows shadow roots down** to the element that has focus, as
 * `deepActiveElement` does, so a component that delegates focus reads back as
 * the control inside it. The document puts focus on the body when no element
 * has it, so the body reads as `null`.
 */
export const webFocus: Focus<Element> = {
  /* `Element` is the type `activeElement` gives, so `focused` hands back what
     `focus` takes. Every element that can hold focus has `focus()`: HTML, SVG,
     and MathML elements alike. */
  focus: (node, preventScroll) => (node as HTMLElement).focus({ preventScroll }),
  focused: () => {
    const active = deepActiveElement()
    return active === document.body || active === document.documentElement ? null : active
  },
}
