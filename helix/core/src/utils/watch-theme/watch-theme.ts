/** Where an element's theme is decided: every element above it, across shadow roots. */
const above = (element: Element): Element[] => {
  const chain: Element[] = []
  let at: Element | null = element
  while (at) {
    chain.push(at)
    const root: Node = at.getRootNode()
    at = at.parentElement ?? (root instanceof ShadowRoot ? root.host : null)
  }
  return chain
}

/** The attributes a theme or a mode is set by, on the element or any above it. */
const THEMING = ['class', 'data-color-mode', 'data-helix-theme', 'style']

/**
 * Calls `changed` once a frame after anything that can move an element's
 * theme: a class, a mode, a theme's own marker or an inline token on the
 * element or any element above it, or the reader's light or dark preference.
 *
 * **Above it and not beside it.** A theme reaches an element only through
 * the elements it is inside, so each of those is watched for its own
 * attributes and nothing below them is: a page-wide watch heard a map's own
 * markers being placed, every frame of every pan, and threw each one away.
 *
 * Returns what stops watching.
 */
export const watchTheme = (element: Element, changed: () => void): (() => void) => {
  let pending = 0
  const soon = (): void => {
    cancelAnimationFrame(pending)
    pending = requestAnimationFrame(() => changed())
  }
  const observer = new MutationObserver(soon)
  for (const one of above(element)) {
    observer.observe(one, { attributeFilter: THEMING, attributes: true })
  }
  const scheme =
    typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null
  scheme?.addEventListener('change', soon)
  return () => {
    cancelAnimationFrame(pending)
    observer.disconnect()
    scheme?.removeEventListener('change', soon)
  }
}
