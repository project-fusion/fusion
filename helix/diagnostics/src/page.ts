/**
 * Everything on a page, gathered in one walk.
 *
 * **One walk for every check in a run.** The stylesheets, the usage, the
 * attributes, the version evidence, and the duplicate check each walked the
 * whole page, shadow roots included, before this: five walks a run, which a
 * run by hand never feels and a run after every change would.
 */

/**
 * The tag of the overlay `initDiagnostics()` puts on a page: the one element
 * diagnostics adds, which it leaves out of everything it counts and reads.
 */
export const OVERLAY = 'helix-diagnostics-overlay'

/** Every element on a page and every shadow root, from one walk. */
export interface Page {
  /**
   * Every element, the document's and every shadow root's, each shadow
   * root's elements following the host it belongs to.
   */
  elements: Element[]
  /** Every shadow root, nested ones included. */
  roots: ShadowRoot[]
}

/** How deep shadow roots are followed, so a pathological page still ends. */
const DEPTH = 32

/** Walks `from` once, shadow roots included. */
export const pageOf = (from: ParentNode): Page => {
  const elements: Element[] = []
  const roots: ShadowRoot[] = []
  const visit = (root: ParentNode, depth: number): void => {
    if (depth > DEPTH) {
      return
    }
    for (const element of root.querySelectorAll('*')) {
      elements.push(element)
      const shadow = element.shadowRoot
      if (shadow) {
        roots.push(shadow)
        visit(shadow, depth + 1)
      }
    }
  }
  visit(from, 0)
  return { elements, roots }
}
