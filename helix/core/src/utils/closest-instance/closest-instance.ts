/**
 * The nearest ancestor that is an instance of a class, crossing shadow roots.
 *
 * **Identity rather than tag name, and the rule already existed.** `Accordion`'s
 * root states it two files from a violation of it: "Items are matched with
 * `instanceof`, never by tag name. Matching `helix-accordion-item` would tie
 * this tier to the styled one." Nine headless families resolve their
 * relationships that way; two did it by tag, and both named `helix-*` tags that
 * only `@helix-io/web` registers, which is a headless package depending on a
 * styled one by string.
 *
 * The consequence is silent rather than loud. Subclassing a base element under
 * a different tag is exactly what the headless tier exists to allow, and it is
 * what `helix/web` itself does. Under a third tag the lookup returned `null`,
 * so an accordion's `mode` was ignored and every section behaved as `multiple`
 * with no error anywhere.
 *
 * **`closest()` alone is not enough**, which is why this walks rather than
 * delegating. `closest()` stops at a shadow boundary: a component slotted into
 * another component's shadow root has a `parentNode` chain that ends at a
 * `ShadowRoot`, and `closest` will not step across it. Following `host` is what
 * makes a nested arrangement resolve, and nesting through a slot is the
 * ordinary case for anything composable.
 */
export const closestInstance = <T extends Element>(
  from: Element | null | undefined,
  Ctor: abstract new (...args: never[]) => T,
): T | null => {
  let node: Node | null = from ?? null
  while (node) {
    if (node instanceof Ctor) {
      return node
    }
    node = node.parentNode instanceof ShadowRoot ? node.parentNode.host : node.parentNode
  }
  return null
}
