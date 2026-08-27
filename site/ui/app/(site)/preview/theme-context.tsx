'use client'

import { initTheme, type ThemeEngine } from '@helix-io/theme'
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { THEME_ENGINE } from '@/utils/theme-engine/theme-engine'
import { INITIAL } from '../../(tool)/helix/theme/defaults'
import styles from './preview.module.css'

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

const paint = (
  engine: ThemeEngine,
  node: HTMLElement,
  settings: Omit<Controls, `set${string}` | 'derived'>,
): Derived => {
  /**
   * **Every field the builder passes, not the six this control moves.**
   *
   * `intentFrom` in the theme tool hands the engine twelve fields. This passed
   * six and let the engine default the rest, which is not the same thing: the
   * shipped stylesheet was derived against a specific `contrastTarget` and
   * `status` allowance, so omitting them re-derives the palette against the
   * engine's own defaults instead. The visible result is that a draft sitting at
   * the default brand produced a primary that did not match the live page's, and
   * the logo and the aura, which both read that token, changed color for no
   * reason a reader could see.
   *
   * The six the pill moves come from state. The rest are pinned to `INITIAL`,
   * which is what the builder opens on and what the stylesheet ships.
   */
  const theme = engine.derive({
    accent: { from: 'brand', rotate: settings.accentHue },
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

  /* Set before the values, because a `var()` inside a custom property is
     substituted on the element the property is declared on: a seed written on a
     plain element is read by nothing until this attribute re-runs those
     declarations. Learned by `showcase.tsx` the hard way. */
  node.dataset.helixTheme = ''
  /* Not `--helix-*`: that prefix belongs to the design system, and squatting
     on it made `check:tokens` read this as one of its tokens, renamed or
     mistyped. It is a page-local flag and now says so. */
  node.style.setProperty('--preview-color-scheme', settings.scheme)
  for (const token of theme.tokens) {
    node.style.setProperty(`--helix-${token.name}`, token.hex)
  }
  for (const [name, value] of Object.entries(theme.seeds)) {
    node.style.setProperty(`--helix-${name}`, value)
  }

  /* **Returned rather than thrown away.** The engine measures every pair it
     derives and reports what it could not clear, and until now the page set the
     colors and dropped the report on the floor. That report is the whole
     argument: a palette anybody can generate is not interesting, and a palette
     that says which of its own pairs are legible is. */
  const byName = new Map(theme.tokens.map((t) => [t.name, t.hex]))

  /**
   * **The tracks are painted with the palette they control.**
   *
   * Lifted from the theme builder, which computes the same two: a saturation
   * ramp from gray to the brand's own chroma at its own lightness and hue, and a
   * hue wheel stepped every thirty degrees from it. A slider whose track shows
   * the range it moves through needs no label to say what it does, which is most
   * of what a nameless control in a dock is missing.
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
 *
 * Two signals, because the preference has three states: the drawer writes
 * `data-color-mode` for an explicit choice and deletes it for "system", so the
 * media query alone answers only the third. Lifted from `showcase.tsx`, which
 * already had to solve this.
 *
 * Read lazily inside `useState`, so the server render and the first client
 * render agree on `INITIAL.scheme` and the correction happens in the effect
 * below rather than as a hydration mismatch.
 */
const readSiteScheme = (): 'dark' | 'light' => {
  if (typeof document === 'undefined') {
    return INITIAL.scheme
  }
  const chosen = document.documentElement.dataset.colorMode
  if (chosen === 'dark' || chosen === 'light') {
    return chosen
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Pushes the same palette onto the document root.
 *
 * **Two things on this page read tokens from somewhere this scope cannot
 * reach.** The aura resolves `--helix-color-primary` and three siblings through
 * a controller that watches `document.documentElement` for `data-color-mode`
 * and nothing else, so it never noticed a wrapper div's inline styles. The
 * wordmark already maps its three gradient stops onto the same primary, and it
 * lives in the site header, above `main` and outside any scope a page can set.
 *
 * So the root gets the palette too. Touching `data-color-mode` is what makes the
 * aura re-read: `setAttribute` queues a mutation record even when the value is
 * unchanged, which is the signal its controller is already listening for.
 *
 * **Cleaned up on unmount**, or navigating away from a draft would leave the
 * rest of the site wearing whatever color was last picked.
 */
const OWNED = '--helix-'

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
  const root = document.documentElement
  for (const name of [...root.style]) {
    if (name.startsWith(OWNED)) {
      root.style.removeProperty(name)
    }
  }
  delete root.dataset.helixTheme
  root.removeAttribute('data-color-mode')
}

/**
 * The theme state, held once, above every draft.
 *
 * **Split from the chrome because the chrome is what varies.** Drafts A and B
 * wear a bar across the top and C wears a dock floating at the bottom, and all
 * three drive one derivation over one scope. Holding the state in each chrome
 * would mean a reader who set a color on A and clicked to C re-picked it on
 * arrival, which is the one thing that makes the comparison worthless.
 *
 * A layout is not remounted on a route change within it, so the provider living
 * here is what carries a reader's color across the three.
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
  /* **The site's mode, not the builder's default.** `INITIAL.scheme` is
     `light`, which is right for a tool that opens on a blank canvas and wrong
     for a page inside a dark site: the scope painted itself white under dark
     chrome, and the reel's scrim, which is the background color at 70%, became a
     white blob over the field. A draft should look like the site until a reader
     says otherwise. */
  const [scheme, setScheme] = useState<'dark' | 'light'>(INITIAL.scheme)

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
         looking like a design decision. That is how it went unnoticed, and a
         scope covering a whole page failing the same way would be worse. */
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
   * **Nothing is derived until a reader moves something.**
   *
   * The engine and the shipped stylesheet compute the same palette two different
   * ways: the stylesheet steps a ramp with fixed relative-color offsets, the
   * engine runs a contrast search. They agree on direction and not on the exact
   * numbers, so deriving on arrival meant this page opened in a palette
   * measurably unlike every other page on the site, and its aura, which reads
   * four of those tokens, was visibly a different blue from the one on `/`.
   *
   * At rest the page is now exactly what the stylesheet ships. The first time
   * somebody touches a control it derives and keeps deriving. That also removes
   * the flash: there is no longer a first paint in one palette followed by a
   * swap into another.
   */
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (chosen) {
      return
    }
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const follow = () => setScheme(readSiteScheme())
    follow()
    query.addEventListener('change', follow)
    const modes = new MutationObserver(follow)
    modes.observe(document.documentElement, {
      attributeFilter: ['data-color-mode'],
      attributes: true,
    })
    return () => {
      query.removeEventListener('change', follow)
      modes.disconnect()
    }
  }, [chosen])

  useEffect(() => {
    const node = scope.current
    if (!touched) {
      return
    }
    if (engine && node) {
      /* One derivation, two destinations. Deriving twice would run the search
         twice for one keystroke and risk the two drifting apart. */
      const report = paint(engine, node, { accentHue, brand, chromaScale, density, radius, scheme })
      setDerived(report)
      paintRoot(report.theme, scheme)
    }
  }, [accentHue, brand, chromaScale, density, engine, radius, scheme, touched])

  /* The site is not ours to leave themed. */
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
    }),
    [accentHue, brand, chromaScale, density, derived, radius, scheme],
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
