/**
 * The theme a reader derived for themselves, kept across pages and reloads.
 */

/** Where the reader's derived theme is kept. */
export const SITE_THEME_KEY = 'fusion-site-theme'

/**
 * The prefix the theme owns on the root element.
 *
 * Every property written under it is removable as a group, which is what makes
 * a reset possible without a list of names to keep in step with the engine.
 */
export const OWNED = '--helix-'

/** The flag that turns the token layer's own declarations back on. */
export const THEME_FLAG = 'helixTheme'

/**
 * The flag on the root while the theme has a brand color.
 *
 * **A stylesheet cannot tell a brand from ink by its tokens.** With no brand,
 * `--helix-color-primary` is the ink, the same color as the foreground, and a
 * style that wants a second tone has to know which of the two it has.
 */
export const BRAND_FLAG = 'siteBrand'

/** What a reader set, which is what the controls need back. */
export interface ThemeSettings {
  accentHue: number
  brand: string
  chromaScale: number
  density: number
  radius: number
  scheme: 'dark' | 'light'
}

/** What the engine made of it, which is what the page needs back. */
export interface StoredTheme {
  seeds: Record<string, string>
  settings: ThemeSettings
  tokens: readonly { hex: string; name: string }[]
  /**
   * What shape the record is in, and which engine wrote it.
   */
  version: 2
}

/**
 * The only version this build will read back.
 *
 * **2 since Helix 0.141.0, the release that made ink the default.** That
 * release gave each fill its own label token, `foreground-on-primary` among
 * them, and a theme saved before it has none. Restored, its old colors stood
 * beside the stylesheet's new labels: in dark mode the home page's "Coming
 * soon" tag came out white on white. A theme saved before is now left unread,
 * and the page draws in its own palette until the reader picks again.
 */
export const THEME_VERSION = 2

/**
 * Reads the stored theme, or nothing.
 *
 * Wrapped, because storage throws rather than returning null in a private
 * window and a theme is not worth a blank page, and because what is in there is
 * a string a reader could have edited.
 */
export const readSiteTheme = (): StoredTheme | null => {
  try {
    const raw = window.localStorage.getItem(SITE_THEME_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as StoredTheme
    if (parsed?.version !== THEME_VERSION || !Array.isArray(parsed.tokens)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/** Writes it, and says nothing if it cannot. */
export const writeSiteTheme = (theme: Omit<StoredTheme, 'version'>): void => {
  try {
    window.localStorage.setItem(
      SITE_THEME_KEY,
      JSON.stringify({ ...theme, version: THEME_VERSION }),
    )
  } catch {
    // A private window, or a quota. The page is themed either way for this
    // visit; only the next one loses it.
  }
}

/**
 * Takes the theme off the root element.
 *
 * Deleting it on teardown throws that away, and it showed as a hard flash of
 * light-mode blue on every reload. The mechanism is worth keeping written down,
 * because it is not obvious: the caller registers this as an effect cleanup,
 * and React runs effects mount, cleanup, mount under StrictMode, which
 * `next.config.ts` turns on. So on load the attribute was set by the script,
 * stripped here, and set again. In the frame between, `light-dark()` fell
 * back to `prefers-color-scheme`, `--helix-color-background` resolved light,
 * and the aura read that value once to decide which half of its palette to
 * draw: a full-viewport field at light-mode brightness under chrome that is
 * already dark.
 */
export const clearSiteThemeFrom = (node: HTMLElement): void => {
  for (const name of [...node.style]) {
    if (name.startsWith(OWNED)) {
      node.style.removeProperty(name)
    }
  }
  delete node.dataset[THEME_FLAG]
  delete node.dataset[BRAND_FLAG]
}

/**
 * **The root is one of two elements the palette is painted onto.**
 *
 * `paintRoot` writes it to the document root, for the aura and the wordmark,
 * which read tokens from outside any scope a page can set. `applyScope` writes
 * the same palette onto the scope element the page itself lives in. Clearing
 * only the root put the storage, the root and the controls back and left the
 * page wearing the palette regardless: measured after a reset, the root held no
 * `--helix-*` at all and the scope still held 41, so the hero stayed in the
 * reader's color while every control said it had gone.
 */
export const clearSiteThemeFromRoot = (): void => {
  const root = document.documentElement
  clearSiteThemeFrom(root)
  /* **The same nudge `paintRoot` ends with, and for the same reason.** The aura
     resolves `--helix-color-primary` through a controller that observes this
     element with `attributeFilter: ['data-color-mode']` and nothing else, so
     removing the properties tells it nothing: a reset put every other surface
     back and left the aura painted in the reader's brand.

     Same value is fine; the mutation record is what the controller wants. Only
     when the attribute is already there, because absent means "follow the
     operating system" and adding one would pin the mode a reset never touched. */
  const mode = root.getAttribute('data-color-mode')
  if (mode !== null) {
    root.setAttribute('data-color-mode', mode)
  }
}

/**
 * Announced, because the page that made the theme may still be open.
 *
 * An event rather than shared state: the drawer is in the site chrome and the
 * scope is inside a page, neither contains the other, and a context spanning
 * both would exist only for this.
 */
export const THEME_RESET_EVENT = 'fusion-theme-reset'

/** Forgets it entirely: off the page, out of storage, and said out loud. */
export const forgetSiteTheme = (): void => {
  clearSiteThemeFromRoot()
  try {
    window.localStorage.removeItem(SITE_THEME_KEY)
  } catch {
    // Nothing was stored if storage is unavailable.
  }
  window.dispatchEvent(new Event(THEME_RESET_EVENT))
}
