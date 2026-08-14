/**
 * Registers a custom element, once.
 *
 * A drop-in replacement for Lit's `@customElement` that does not throw when the
 * tag is already registered.
 *
 * The duplicate is not hypothetical. Next.js evaluates a module in both the
 * server and client graphs, so a component imported by a server component and a
 * client component runs its registration twice against one registry, and
 * `customElements.define` throws:
 *
 * > Failed to execute 'define': the name "helix-card" has already been used
 *
 * That failure takes down the whole prerender, and it appears only once an app
 * mixes server and client usage of the same component, which is exactly what a
 * real app does.
 *
 * The analyzer detects `@customElement` **by decorator name**, not by where it
 * is imported from, so the manifest still records `tagName` and nothing
 * downstream changes.
 */
export const customElement =
  (tagName: string) =>
  (target: CustomElementConstructor): void => {
    // Lit SSR shims the registry, but a bare Node context may have none.
    if (typeof customElements === 'undefined' || customElements.get(tagName)) {
      return
    }
    customElements.define(tagName, target)
  }
