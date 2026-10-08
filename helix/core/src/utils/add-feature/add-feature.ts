/** An element class whose elements can be asked to draw again. */
type Redrawn = abstract new (...args: never[]) => Element & { requestUpdate(): void }

/**
 * The elements of a class already on the page, in the document and in every
 * open shadow root in it.
 */
const onPage = <T extends Element>(
  of: abstract new (...args: never[]) => T,
  root: ParentNode,
): T[] =>
  [...root.querySelectorAll('*')].flatMap((node) => [
    ...(node instanceof of ? [node] : []),
    ...(node.shadowRoot ? onPage(of, node.shadowRoot) : []),
  ])

/**
 * Adds what a feature's own entry draws to an element class, and has the
 * elements of the class already on the page draw again.
 *
 * **A feature with an entry of its own** is code a page that never imports it
 * does not carry, as Map's compass is: the element asks its class for the
 * feature when it draws, and draws nothing there until an entry has added it.
 * Each tier's entry adds to its own tier's class, so the styled entry can hand
 * in its sheet, and a styled class without one reads the headless tier's.
 *
 * **Elements already on the page draw again.** A page that imports the element
 * and then the entry has its elements built, and drawn, before this runs, so
 * the ones in the document and its open shadow roots are asked to update.
 */
export const addFeature = (element: Redrawn, additions: object): void => {
  Object.assign(element, additions)
  if (typeof document !== 'undefined') {
    for (const one of onPage(element, document)) {
      one.requestUpdate()
    }
  }
}
