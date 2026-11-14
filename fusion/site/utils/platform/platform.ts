/**
 * Where the reader's platform choice is kept, and what it may say.
 *
 * Kept beside the API tier's key and read the same way: the pre-paint script
 * in the root layout writes it onto the document as `data-platform`, so a page
 * styles on the attribute and `usePlatform` renders from it.
 */
export const PLATFORM_KEY = 'fusion-platform'

/**
 * What the key is allowed to hold. `web` documents the custom elements, and
 * `native` the React Native components where Helix draws a family natively.
 */
export type Platform = 'native' | 'web'

/**
 * The platform the document is set to. Anything but `native` is the web, which
 * is the resting value and is never written.
 */
export const readPlatform = (root: HTMLElement): Platform =>
  root.dataset.platform === 'native' ? 'native' : 'web'

/**
 * Puts the platform on the document, where CSS and `usePlatform` read it.
 *
 * `web` removes the attribute, so a page with no choice made and a page set to
 * the web are the same document.
 */
export const applyPlatform = (root: HTMLElement, platform: Platform): void => {
  if (platform === 'web') {
    delete root.dataset.platform
    return
  }
  root.dataset.platform = platform
}
