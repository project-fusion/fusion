/**
 * The nearest ancestor that is an instance of a class, crossing shadow roots.
 *
 * **Identity rather than tag name.** Matching `helix-accordion-item` ties the
 * headless tier to the styled one by string, and only `@fusion.dev/helix`
 * registers a `helix-*` tag.
 *
 * The consequence is silent rather than loud. Subclassing a headless element under
 * a different tag is exactly what the headless tier exists to allow, and it is
 * what `helix/styled` itself does. Under a third tag a lookup by tag returns
 * `null`, so an accordion's `mode` is ignored and every section behaves as
 * `multiple` with no error anywhere.
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
