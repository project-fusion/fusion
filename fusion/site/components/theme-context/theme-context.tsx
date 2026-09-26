'use client'

import { initTheme, type ThemeEngine } from '@fusion.dev/helix-theme'
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  clearSiteThemeFrom,
  clearSiteThemeFromRoot,
  OWNED,
  readSiteTheme,
  THEME_RESET_EVENT,
  writeSiteTheme,
} from '@/utils/site-theme/site-theme'
import { accentFrom, INITIAL } from '@/utils/theme-defaults/theme-defaults'
import { THEME_ENGINE } from '@/utils/theme-engine/theme-engine'
import styles from './theme-context.module.css'

/** What the last derivation produced, for anything that wants to show it. */
export interface Derived {
  /** Track gradients for the sliders, built from the derived primary. */
  ramps: { accent?: string; saturation?: string }
  /** The derivation itself, so the root can be painted from the same one. */
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
  const accent = accentFrom(settings.accentHue)
  const theme = engine.derive({
    ...(accent ? { accent } : {}),
    brand: settings.brand,
    chroma: { scale: settings.chromaScale / 100 },
    contrastTarget: INITIAL.contrastTarget,
    density: settings.density / 100,
    font: { base: INITIAL.textBase, scale: INITIAL.textScale / 100 },
    material: { blur: INITIAL.blur, opacity: INITIAL.translucency / 100 },
    radius: settings.radius / 100,
    scheme: settings.scheme,
    separation: {
      floating: INITIAL.floating as 'border' | 'fill' | 'shadow',
      surface: INITIAL.surface,
    },
    status: { allowance: INITIAL.allowance, harmony: INITIAL.harmony / 100 },
  })

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

/**
 * Writes an already-derived theme onto the scope.
 */
const applyScope = (
  node: HTMLElement,
  theme: Derived['theme'],
  scheme: Controls['scheme'],
): void => {
  /* Set before the values, because a `var()` inside a custom property is
     substituted on the element the property is declared on: a seed written on a
     plain element is read by nothing until this attribute re-runs those
     declarations. */
  node.dataset.helixTheme = ''
  /* Not `--helix-*`: that prefix belongs to the design system, and squatting on
     it made the `tokens` rule read this as one of its tokens, renamed or
     mistyped. It is a page-local flag. */
  node.style.setProperty('--preview-color-scheme', scheme)
  for (const token of theme.tokens) {
    node.style.setProperty(`--helix-${token.name}`, token.hex)
  }
  for (const [name, value] of Object.entries(theme.seeds)) {
    node.style.setProperty(`--helix-${name}`, value)
  }
}

/**
 * Pushes the same palette onto the document root.
 */
const paintRoot = (
  theme: { seeds: Record<string, string>; tokens: readonly { hex: string; name: string }[] },
  scheme: 'dark' | 'light',
): void => {
  const root = document.documentElement
  root.dataset.helixTheme = ''
  for (const token of theme.tokens) {
    root.style.setProperty(`${OWNED}${token.name}`, token.hex)
  }
  for (const [name, value] of Object.entries(theme.seeds)) {
    root.style.setProperty(`${OWNED}${name}`, value)
  }
  /* The nudge. Same value is fine; the record is what the controller wants. */
  root.setAttribute('data-color-mode', scheme)
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
  const scope = useRef<HTMLDivElement | null>(null)
  const [engine, setEngine] = useState<ThemeEngine | null>(null)
  const [derived, setDerived] = useState<Derived | null>(null)

  const [brand, setBrand] = useState(INITIAL.brand)
  const [chromaScale, setChromaScale] = useState(INITIAL.chromaScale)
  const [accentHue, setAccentHue] = useState(INITIAL.accentHue)
  const [radius, setRadius] = useState(INITIAL.radius)
  const [density, setDensity] = useState(INITIAL.density)
  /* Seeded light for hydration, which is what the server rendered, then moved
     to the site's mode by the effects below. Light is right for a blank canvas
     and wrong for a page inside a dark site: left
     there, the scope paints itself white under dark chrome and the reel's scrim,
     which is the background color at 70%, becomes a white blob over the field. A
     draft should look like the site until a reader says otherwise. */
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

  /* Adopt the site's mode on arrival, and keep following it while nobody has
     touched the toggle. Once they have, `chosen` latches and the page stops
     changing under them. */
  const [chosen, setChosen] = useState(false)

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
    setScheme(stored.settings.scheme)
    /* Latched, so the two effects that follow the site's mode stop overriding
       the scheme this theme was derived in. */
    setChosen(true)
    setTouched(true)
  }, [])

  /**
   * Two sources, and only one of them stops being listened to.
   */
  useEffect(() => {
    const follow = () => setScheme(readSiteScheme())
    const modes = new MutationObserver(follow)
    modes.observe(document.documentElement, {
      attributeFilter: ['data-color-mode'],
      attributes: true,
    })
    return () => modes.disconnect()
  }, [])

  useEffect(() => {
    if (chosen) {
      return
    }
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const follow = () => setScheme(readSiteScheme())
    follow()
    query.addEventListener('change', follow)
    return () => query.removeEventListener('change', follow)
  }, [chosen])

  useEffect(() => {
    const node = scope.current
    if (!engine || !node) {
      return
    }
    /* One derivation, two destinations. Deriving twice would run the search
       twice for one keystroke and risk the two drifting apart. */
    const report = derive(engine, { accentHue, brand, chromaScale, density, radius, scheme })
    setDerived(report)
    /* The report is for the controls and can exist from the first frame. The
       page itself still waits, so it opens in exactly what the stylesheet
       ships. */
    if (touched) {
      applyScope(node, report.theme, scheme)
      paintRoot(report.theme, scheme)
      /* **Stored at the same moment it is painted, and storing the same
         thing.** The alternative was to save on a control's change handler,
         which would have written the settings a frame before the engine turned
         them into a palette, and the palette is the half that has to be
         written, because it is what the pre-paint script restores. Saving here
         means what comes back is exactly what was on the screen.
         `touched` gates it, so a page that has painted nothing stores
         nothing. */
      writeSiteTheme({
        seeds: report.theme.seeds,
        settings: { accentHue, brand, chromaScale, density, radius, scheme },
        tokens: report.theme.tokens,
      })
    }
  }, [accentHue, brand, chromaScale, density, engine, radius, scheme, touched])

  /**
   * Somebody pressed reset in the preferences drawer.
   */
  useEffect(() => {
    const forget = () => {
      /* **The scope is this component's to clear, and nothing else clears it.**
         `forgetSiteTheme` takes the palette off the root and out of storage,
         which is everything it can reach: the scope element is a ref in here.
         Without this the reset put the controls back and left the page painted,
         because `applyScope` only runs while `touched` and `touched` is about to
         go false. */
      if (scope.current) {
        clearSiteThemeFrom(scope.current)
      }
      setBrand(INITIAL.brand)
      setChromaScale(INITIAL.chromaScale)
      setAccentHue(INITIAL.accentHue)
      setRadius(INITIAL.radius)
      setDensity(INITIAL.density)
      setTouched(false)
      /* Unlatched as well, so the scope goes back to following the site's mode
         the way it does before anybody touches anything. */
      setChosen(false)
      setScheme(readSiteScheme())
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
      setScheme: (value: 'dark' | 'light') => {
        setChosen(true)
        setTouched(true)
        setScheme(value)
      },
      touched,
    }),
    [accentHue, brand, chromaScale, density, derived, radius, scheme, touched],
  )

  return (
    <ThemeControls.Provider value={value}>
      {/* Paints its own ground rather than inheriting the site's: see
          `.themedScope` for the light-on-dark failure that put it there. */}
      <div className={styles.themedScope} ref={scope}>
        {children}
      </div>
    </ThemeControls.Provider>
  )
}
