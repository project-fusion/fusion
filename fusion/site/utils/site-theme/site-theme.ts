/**
 * The theme a reader derived for themselves, kept across pages and reloads.
 */

/** Where the reader's derived theme is kept. */
export const SITE_THEME_KEY = 'fusion-site-theme'

/**
 * The `<style>` element the theme is written into, one per document.
 *
 * **A stylesheet, so the theme follows the mode by itself.** It held one mode's
 * colors as inline properties on the root, and nothing but the landing page
 * re-derived them when the mode changed: measured on Cortex with a theme kept,
 * the site's mode went to dark and every token stayed on its light value, the
 * graph and the page with it. The engine's two-mode block writes each color as
 * a `light-dark()` pair, the way the shipped stylesheet writes its own, so the
 * mode the root is in picks the half on every page.
 */
export const THEME_STYLE_ID = 'site-theme'

/**
 * Where the theme's block is declared: on the root, while it is marked.
 *
 * **Two classes of specificity, which is what lets it win.** The shipped tokens
 * are declared under `:root` and under `[data-helix-theme]`, one class each, so
 * a block under `:root` alone would win or lose by where its `<style>` lands in the
 * document.
 */
export const THEME_SELECTOR = ':root[data-helix-theme]'

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
}

/** What the engine made of it, which is what the page needs back. */
export interface StoredTheme {
  /**
   * The engine's block for both modes, under `THEME_SELECTOR`.
   */
  css: string
  settings: ThemeSettings
  /**
   * What shape the record is in, and which engine wrote it.
   */
  version: 3
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
 *
 * **3 since the theme holds both modes.** A theme saved as 2 holds one mode's
 * colors, which is the record that left the page in that mode whatever the site
 * was set to, so it is left unread the same way.
 */
export const THEME_VERSION = 3

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
    if (parsed?.version !== THEME_VERSION || typeof parsed.css !== 'string') {
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
 * Tells what watches the root's mode that the palette under it changed.
 *
 * **The aura resolves `--helix-color-primary` through a controller that
 * observes the root with `attributeFilter: ['data-color-mode']` and nothing
 * else**, so a palette written or removed without touching that attribute
 * tells it nothing: a reset put every other surface back and left the aura
 * painted in the reader's brand. Writing the same value is enough, since the
 * mutation record is what the controller wants.
 *
 * **Set and removed where there is none**, because absent means "follow the
 * operating system", and leaving one behind would pin the mode for a reader
 * who never chose one. Both records are taken in one task, and the controller
 * reads the root after it, with the attribute gone.
 */
const nudgeMode = (root: HTMLElement): void => {
  const mode = root.getAttribute('data-color-mode')
  if (mode !== null) {
    root.setAttribute('data-color-mode', mode)
    return
  }
  root.setAttribute('data-color-mode', 'light')
  root.removeAttribute('data-color-mode')
}

/**
 * Writes the theme onto the page: the block into its `<style>`, and the marks
 * onto the root.
 *
 * **The root is the only element the palette is painted onto**, and the page's
 * scope inherits it, as do the aura and the wordmark, which sit outside any
 * scope a page can set. So clearing the root clears the page. Keep it the only
 * one: a second copy on the scope once outlived a reset, and the hero stayed in
 * the reader's color while every control said it had gone.
 */
export const paintSiteTheme = (css: string, brand: string): void => {
  const root = document.documentElement
  let sheet = document.getElementById(THEME_STYLE_ID)
  if (!sheet) {
    sheet = document.createElement('style')
    sheet.id = THEME_STYLE_ID
    document.head.append(sheet)
  }
  sheet.textContent = css
  root.dataset[THEME_FLAG] = ''
  if (brand) {
    root.dataset[BRAND_FLAG] = ''
  } else {
    delete root.dataset[BRAND_FLAG]
  }
  nudgeMode(root)
}

/**
 * Takes the theme off the page.
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
export const clearSiteThemeFromRoot = (): void => {
  const root = document.documentElement
  document.getElementById(THEME_STYLE_ID)?.remove()
  delete root.dataset[THEME_FLAG]
  delete root.dataset[BRAND_FLAG]
  nudgeMode(root)
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
