'use client'

import { initTheme, type ThemeEngine } from '@fusion.dev/helix-theme'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import {
  clearSiteThemeFromRoot,
  paintSiteTheme,
  readSiteTheme,
  THEME_RESET_EVENT,
  THEME_SELECTOR,
  writeSiteTheme,
} from '@/utils/site-theme/site-theme'
import { accentFrom, INITIAL, SITE_BRAND } from '@/utils/theme-defaults/theme-defaults'
import { THEME_ENGINE } from '@/utils/theme-engine/theme-engine'
import styles from './theme-context.module.css'

/** What the last derivation produced, for anything that wants to show it. */
export interface Derived {
  /** Both modes as one block, which is what the page is painted with. */
  css: string
  /** Track gradients for the sliders, built from the derived primary. */
  ramps: { accent?: string; saturation?: string }
  /** The mode the site is in, which is what the controls show. */
  theme: { seeds: Record<string, string>; tokens: readonly { hex: string; name: string }[] }
  /** Roles too close to tell apart. Empty is the good case. */
  collisions: readonly string[]
  /** A few role hexes, for a swatch strip. */
  swatches: readonly { hex: string; name: string }[]
  /** How many roles carried a measured contrast in this derivation. Not the
   *  same as the count on the metrics page, and not presented as one. */
  measured: number
  /** Pairs it could not clear. Empty is the good case. */
  violations: readonly string[]
}

interface Controls {
  derived: Derived | null
  accentHue: number
  brand: string
  chromaScale: number
  density: number
  radius: number
  scheme: 'dark' | 'light'
  setAccentHue: (value: number) => void
  setBrand: (value: string) => void
  setChromaScale: (value: number) => void
  setDensity: (value: number) => void
  setRadius: (value: number) => void
  setScheme: (value: 'dark' | 'light') => void
  /**
   * Whether a reader has taken the palette over.
   *
   * Exposed for the reset controls, which have to be able to say there is
   * nothing to reset. `derived` cannot answer that: it is filled the moment the
   * engine loads, whether or not anything has been painted from it.
   */
  touched: boolean
}

const ThemeControls = createContext<Controls | null>(null)

/** Throws rather than returning null, so a chrome outside the scope says so. */
export const useThemeControls = (): Controls => {
  const value = useContext(ThemeControls)
  if (!value) {
    throw new Error('A preview theme control has to sit inside ThemeScope.')
  }
  return value
}

/** The roles worth showing: a ground, an ink, the brand and what sits on it. */
const SHOWN = [
  'color-background',
  'color-surface',
  'color-foreground',
  'color-primary',
  'color-accent',
  'color-success',
  'color-warning',
  'color-danger',
]

const derive = (
  engine: ThemeEngine,
  settings: Omit<Controls, `set${string}` | 'derived' | 'touched'>,
): Derived => {
  /**
   * **Every field the builder passes, not the six this control moves.**
   */
  /* An empty brand is no brand, which the engine reads as ink. Handed over as
     an empty string, it is a color the engine cannot read, and it throws. */
  const accent = settings.brand ? accentFrom(settings.accentHue) : undefined
  /* **Both modes in one call**, so the page follows the site's mode on every
     page without the engine: the block is a `light-dark()` pair per color. */
  const modes = engine.deriveModes(
    {
      ...(accent ? { accent } : {}),
      ...(settings.brand ? { brand: settings.brand } : {}),
      chroma: { scale: settings.chromaScale / 100 },
      contrastTarget: INITIAL.contrastTarget,
      density: settings.density / 100,
      font: { base: INITIAL.textBase, scale: INITIAL.textScale / 100 },
      material: { blur: INITIAL.blur, opacity: INITIAL.translucency / 100 },
      radius: settings.radius / 100,
      separation: {
        floating: INITIAL.floating as 'border' | 'fill' | 'shadow',
        surface: INITIAL.surface,
      },
      status: { allowance: INITIAL.allowance, harmony: INITIAL.harmony / 100 },
    },
    [THEME_SELECTOR],
  )
  const theme = modes[settings.scheme]

  /* The engine measures every pair it derives and reports what it could not
     clear, and that report is returned rather than dropped: a palette anybody
     can generate is not interesting, and a palette that says which of its own
     pairs are legible is. */
  const byName = new Map(theme.tokens.map((t) => [t.name, t.hex]))

  /**
   * **The tracks are painted with the palette they control.**
   */
  const primary = theme.tokens.find((t) => t.name === 'color-primary')?.value
  const ramps = primary
    ? {
        accent: `linear-gradient(to right, ${Array.from(
          { length: 13 },
          (_, step) =>
            `oklch(${primary.lightness} ${primary.chroma} ${(primary.hue + step * 30) % 360})`,
        ).join(', ')})`,
        saturation: `linear-gradient(to right, oklch(${primary.lightness} 0 ${primary.hue}), oklch(${primary.lightness} ${primary.chroma} ${primary.hue}))`,
      }
    : {}

  return {
    collisions: theme.collisions ?? [],
    css: modes.css[THEME_SELECTOR] ?? '',
    measured: theme.tokens.filter((t) => typeof t.contrast === 'number').length,
    ramps,
    swatches: SHOWN.filter((n) => byName.has(n)).map((n) => ({
      hex: byName.get(n) as string,
      name: n,
    })),
    theme,
    violations: (theme.violations ?? []).map((v) => String(v)),
  }
}

/**
 * What the site is currently showing.
 */
const readSiteScheme = (): 'dark' | 'light' => {
  if (typeof document === 'undefined') {
    return 'light'
  }
  const chosen = document.documentElement.dataset.colorMode
  if (chosen === 'dark' || chosen === 'light') {
    return chosen
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const clearRoot = (): void => {
  /* **Only when nothing is stored.**
   *
   * A theme a reader asked to keep is theirs to leave on. Wiping it here makes
   * the palette survive a reload, because the pre-paint script restores it, and
   * die on a click to the next page, because this runs on the way out: the
   * worse of the two failures, since it looks like the feature works until you
   * navigate.
   *
   * This owns the unsaved case: a reader who moved a slider, looked, and left
   * without keeping it. */
  if (readSiteTheme()) {
    return
  }
  clearSiteThemeFromRoot()
}

/**
 * The theme state, held once, above every draft.
 *
 * **Split from the chrome because the chrome is what varies.** Drafts A and B
 * wear a bar across the top and C wears a dock floating at the bottom, and all
 * three drive one derivation over one scope. Holding the state in each chrome
 * would mean a reader who set a color on A and clicked to C re-picked it on
 * arrival, which is the one thing that makes the comparison worthless.
 */
export const ThemeScope = ({ children }: { children: ReactNode }) => {
  const [engine, setEngine] = useState<ThemeEngine | null>(null)
  const [derived, setDerived] = useState<Derived | null>(null)

  const [brand, setBrand] = useState(SITE_BRAND)
  const [chromaScale, setChromaScale] = useState(INITIAL.chromaScale)
  const [accentHue, setAccentHue] = useState(INITIAL.accentHue)
  const [radius, setRadius] = useState(INITIAL.radius)
  const [density, setDensity] = useState(INITIAL.density)
  /* Seeded light for hydration, which is what the server rendered, then moved
     to the site's mode by the effect below. Light is right for a blank canvas
     and wrong for a page inside a dark site: left
     there, the scope paints itself white under dark chrome and the reel's scrim,
     which is the background color at 70%, becomes a white blob over the field.
     The theme holds both modes, so this follows the site's mode always, and
     picks which of them the controls describe. */
  const [scheme, setScheme] = useState<'dark' | 'light'>('light')

  useEffect(() => {
    let live = true
    initTheme(THEME_ENGINE)
      .then((loaded) => {
        if (live) {
          setEngine(loaded)
        }
      })
      /* **Caught rather than voided.** `showcase.tsx` writes
         `void initTheme(...).then(...)`, so an engine that fails to load rejects
         into nothing and the panel silently keeps the stylesheet's own tokens,
         looking like a design decision. A scope covering a whole page failing
         the same way would be worse. */
      .catch((reason: unknown) => {
        console.error('theme engine failed to load', reason)
      })
    return () => {
      live = false
    }
  }, [])

  /**
   * **Nothing is painted until a reader moves something.**
   */
  const [touched, setTouched] = useState(false)

  /**
   * **A theme the reader kept comes back, and comes back already painted.**
   */
  useEffect(() => {
    const stored = readSiteTheme()
    if (!stored) {
      return
    }
    setBrand(stored.settings.brand)
    setChromaScale(stored.settings.chromaScale)
    setAccentHue(stored.settings.accentHue)
    setRadius(stored.settings.radius)
    setDensity(stored.settings.density)
    setTouched(true)
  }, [])

  /* The site's mode, from both of its sources: the attribute a reader sets, and
     the operating system's answer where none is set. */
  useEffect(() => {
    const follow = () => setScheme(readSiteScheme())
    const modes = new MutationObserver(follow)
    modes.observe(document.documentElement, {
      attributeFilter: ['data-color-mode'],
      attributes: true,
    })
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    follow()
    query.addEventListener('change', follow)
    return () => {
      modes.disconnect()
      query.removeEventListener('change', follow)
    }
  }, [])

  useEffect(() => {
    if (!engine) {
      return
    }
    /* One derivation, for the controls and the root. Deriving twice would run
       the search twice for one keystroke and risk the two drifting apart. */
    const report = derive(engine, { accentHue, brand, chromaScale, density, radius, scheme })
    setDerived(report)
    /* The report is for the controls and can exist from the first frame. The
       page itself still waits, so it opens in exactly what the stylesheet
       ships. */
    if (touched) {
      paintSiteTheme(report.css, brand)
      /* **Stored at the same moment it is painted, and storing the same
         thing.** The alternative was to save on a control's change handler,
         which would have written the settings a frame before the engine turned
         them into a palette, and the palette is the half that has to be
         written, because it is what the pre-paint script restores. Saving here
         means what comes back is exactly what was on the screen.
         `touched` gates it, so a page that has painted nothing stores
         nothing. */
      writeSiteTheme({
        css: report.css,
        settings: { accentHue, brand, chromaScale, density, radius },
      })
    }
  }, [accentHue, brand, chromaScale, density, engine, radius, scheme, touched])

  /**
   * Somebody pressed reset in the preferences drawer.
   */
  useEffect(() => {
    const forget = () => {
      /* Nothing to clear here. `forgetSiteTheme` has already taken the palette
         off the root, and the scope only ever inherited it from there. */
      setBrand(SITE_BRAND)
      setChromaScale(INITIAL.chromaScale)
      setAccentHue(INITIAL.accentHue)
      setRadius(INITIAL.radius)
      setDensity(INITIAL.density)
      setTouched(false)
    }
    window.addEventListener(THEME_RESET_EVENT, forget)
    return () => window.removeEventListener(THEME_RESET_EVENT, forget)
  }, [])

  /* The site is not ours to leave themed, unless the reader kept it. */
  useEffect(() => clearRoot, [])

  const value = useMemo<Controls>(
    () => ({
      accentHue,
      brand,
      chromaScale,
      density,
      derived,
      radius,
      scheme,
      setAccentHue: (value: number) => {
        setTouched(true)
        setAccentHue(value)
      },
      setBrand: (value: string) => {
        setTouched(true)
        setBrand(value)
      },
      setChromaScale: (value: number) => {
        setTouched(true)
        setChromaScale(value)
      },
      setDensity: (value: number) => {
        setTouched(true)
        setDensity(value)
      },
      setRadius: (value: number) => {
        setTouched(true)
        setRadius(value)
      },
      /* **Only the controls move.** The theme holds both modes, and the toggle
         sets the site's mode; this moves the controls with it a frame early. */
      setScheme,
      touched,
    }),
    [accentHue, brand, chromaScale, density, derived, radius, scheme, touched],
  )

  return (
    <ThemeControls.Provider value={value}>
      {/* Paints its own ground rather than inheriting the site's: see
          `.themedScope` for the light-on-dark failure that put it there. */}
      <div className={styles.themedScope}>{children}</div>
    </ThemeControls.Provider>
  )
}
