/*
 * When a page has had its chance to register its icons, which is when a name
 * that drew nothing is worth reporting.
 *
 * Beside the family's `index.ts`, because it is about the page and not about
 * the element's template.
 */

/**
 * Calls back once the page has loaded and painted a frame after it: every
 * module a page lists has run by then, and with it every `registerIcons` and
 * `registerIconLibrary` they hold. A page that has loaded already waits only
 * the frame.
 */
export const afterPageSettles = (callback: () => void): void => {
  const frame = (): void => {
    requestAnimationFrame(() => callback())
  }
  if (document.readyState === 'complete') {
    frame()
    return
  }
  window.addEventListener('load', frame, { once: true })
}
