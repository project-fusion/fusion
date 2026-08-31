/**
 * The theme a reader derived for themselves, kept across pages and reloads.
 *
 * **A plain module, for the reason `color-mode.ts` is one.** The root layout
 * interpolates the key below into a pre-paint script, and a server component
 * that imports a value from a `'use client'` module gets a client reference
 * rather than the value: the constant arrives as `undefined` and the script
 * ships `localStorage.getItem(undefined)`, silently, otherwise intact. Nothing
 * here is a component and nothing here is client-only.
 *
 * **What is stored is the answer, not the question.** The settings are kept so
 * the panel can open showing what is applied, but the palette is kept as the
 * derived hexes, because the thing that has to run before first paint cannot
 * derive anything: the engine is wasm, loading it is asynchronous, and a page
 * that waited for it would paint the shipped palette first and swap. Storing
 * what the engine already produced turns restoring a theme into writing a list
 * of custom properties, which a synchronous script can do before the first
 * frame.
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
   * What shape the record is in.
   *
   * A stored palette is a snapshot of what one version of the engine produced,
   * and the roles it names are not promised to be stable. A reader carrying a
   * palette from before a role was renamed would restore a page with a gap in
   * it, and the gap would be invisible to them and unreportable to us. So the
   * number is checked on the way in and anything else is dropped, which costs
   * that reader their theme once and never leaves them on a broken page.
   */
  version: 1
}

/** The only version this build will read back. */
export const THEME_VERSION = 1

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
 * Removes what the prefix owns and the flag, and nothing else.
 *
 * **`data-color-mode` is not ours to remove.** `paintRoot` writes it as a
 * nudge, to make the token controller notice a palette it has already been
 * handed, but the attribute itself belongs to the reader: `preferences.tsx`
 * persists it and the pre-paint script restores it before the first frame.
 *
 * Deleting it on teardown throws that away, and it showed as a hard flash of
 * light-mode blue on every reload. The mechanism is worth keeping written down,
 * because it is not obvious: the caller registers this as an effect cleanup,
 * and React runs effects mount, cleanup, mount under StrictMode, which
 * `next.config.ts` turns on. So on load the attribute was set by the script,
 * stripped here, and set again — and in the frame between, `light-dark()` fell
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
 *
 * One function over a node rather than a second one written for the scope,
 * because `OWNED` above is the answer to "which properties are ours" and this
 * module holds it precisely so that a second copy cannot drift from it.
 */
export const clearSiteThemeFromRoot = (): void => clearSiteThemeFrom(document.documentElement)

/**
 * Announced, because the page that made the theme may still be open.
 *
 * The reset lives in the preferences drawer and the controls live in
 * `ThemeScope`, and on the two pages that carry a scope both are on screen at
 * once. Clearing storage and the root alone would leave those controls still
 * holding the reader's numbers and still believing they are in charge, so the
 * next nudge of any slider would repaint the palette that was just reset —
 * a reset that undoes itself on the next interaction.
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
