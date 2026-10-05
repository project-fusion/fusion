/**
 * Marks a region busy for as long as something is loading into it, and
 * counts, so two loaders in one region do not clear each other.
 *
 * Beside the family's `index.ts`, because which element is busy and how many
 * claims it holds is bookkeeping about elements, not about a loader's
 * template.
 */

/** How many loaders hold each region busy. Weak, so a region a page removes takes its count. */
const CLAIMS = new WeakMap<Element, number>()

/**
 * Adds a claim on the region, setting `aria-busy="true"` on the first.
 *
 * Only an `aria-busy` this file wrote is ever taken off again: a region the
 * page marked busy itself keeps its own attribute.
 */
export const claimBusy = (region: Element): void => {
  const held = CLAIMS.get(region) ?? 0
  if (held === 0 && region.getAttribute('aria-busy') === 'true') {
    return
  }
  CLAIMS.set(region, held + 1)
  if (held === 0) {
    region.setAttribute('aria-busy', 'true')
  }
}

/** Takes a claim back, and the attribute with the last one. */
export const releaseBusy = (region: Element): void => {
  const held = CLAIMS.get(region)
  if (held === undefined) {
    return
  }
  if (held <= 1) {
    CLAIMS.delete(region)
    region.removeAttribute('aria-busy')
  } else {
    CLAIMS.set(region, held - 1)
  }
}

/**
 * Calls `found` with the region `find` answers once it is in `root`, and
 * returns the call that stops waiting.
 *
 * For a loader whose region is not on the page yet: a framework often draws
 * the loader before the list it stands for, and a region looked up once, a
 * frame after connecting, was never marked. Watches for children and ids being
 * written, and stops at the first answer.
 */
export const awaitRegion = (
  root: Node,
  find: () => Element | null,
  found: (region: Element) => void,
): (() => void) => {
  const observer = new MutationObserver(() => {
    const region = find()
    if (region) {
      observer.disconnect()
      found(region)
    }
  })
  observer.observe(root, { attributeFilter: ['id'], childList: true, subtree: true })
  return () => observer.disconnect()
}
