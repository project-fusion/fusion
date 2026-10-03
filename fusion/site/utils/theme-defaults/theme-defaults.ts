/**
 * What a fresh builder starts as, stated once.
 */
import type { ThemeEngine, ThemeIntent } from '@fusion.dev/helix-theme'

/**
 * The selector the emitted block is written for.
 */
export const SCOPE = '[data-theme="preview"]'

/** The motion characters, plus the absence of one. */
export type Character = '' | 'gentle' | 'instant' | 'precise' | 'snappy' | 'springy'

/** What separates a surface from what is behind it. */
export type Mechanism = 'border' | 'fill' | 'shadow' | 'space'

/** Every value a reader can move, at rest. */
export interface Settings {
  accentHue: number
  allowance: number
  blur: number
  bodyFace: string
  brand: string
  chromaScale: number
  contrastTarget: number
  density: number
  displayFace: string
  floating: Mechanism
  harmony: number
  monoFace: string
  motion: Character
  /** The page's color in dark, as a hex, or empty for pure black. */
  pageDark: string
  /** The page's color in light, as a hex, or empty for pure white. */
  pageLight: string
  radius: number
  /** Which half a reader sees: the site's own mode, or light or dark whatever the site shows. */
  scheme: 'dark' | 'light' | 'site'
  surface: Mechanism
  textBase: number
  textScale: number
  translucency: number
}

export const INITIAL: Settings = {
  accentHue: 0,
  allowance: 20,
  blur: 16,
  bodyFace: '',
  brand: '#3b82f6',
  chromaScale: 100,
  contrastTarget: 4.5,
  density: 100,
  displayFace: '',
  floating: 'shadow',
  harmony: 50,
  monoFace: '',
  motion: '',
  pageDark: '',
  pageLight: '',
  radius: 50,
  scheme: 'site',
  surface: 'border',
  textBase: 14,
  textScale: 132,
  translucency: 100,
}

/** The stack a face becomes, so a fetch that has not landed still reads. */
const stack = (family: string, fallback: string): string =>
  family ? `"${family}", ${fallback}` : ''

/**
 * The accent an angle asks for, where none at all is the brand.
 *
 * **Not a relation at 0 degrees**, which the engine rotates out of the brand's
 * way and hands back as a near miss of it. The engine's own default is the
 * brand itself, reached by naming no accent, so a slider at rest names none.
 */
export function accentFrom(hue: number): ThemeIntent['accent'] {
  return hue % 360 === 0 ? undefined : { from: 'brand', rotate: hue }
}

/**
 * The intent these settings describe, in `site` where they follow the site:
 * the engine derives a light half or a dark one, so following the site is a
 * choice between them made where the site's mode is known. Light on the
 * server, which cannot know it.
 */
export function intentFrom(settings: Settings, site: 'dark' | 'light' = 'light'): ThemeIntent {
  const {
    accentHue,
    allowance,
    blur,
    bodyFace,
    brand,
    chromaScale,
    contrastTarget,
    density,
    displayFace,
    floating,
    harmony,
    monoFace,
    motion,
    pageDark,
    pageLight,
    radius,
    scheme,
    surface,
    textBase,
    textScale,
    translucency,
  } = settings
  const accent = accentFrom(accentHue)

  return {
    ...(accent ? { accent } : {}),
    ...(pageDark || pageLight
      ? {
          background: {
            ...(pageDark ? { dark: pageDark } : {}),
            ...(pageLight ? { light: pageLight } : {}),
          },
        }
      : {}),
    brand,
    chroma: { scale: chromaScale / 100 },
    contrastTarget,
    density: density / 100,
    ...(motion ? { motion: { character: motion } } : {}),
    font: {
      base: textBase,
      scale: textScale / 100,
      ...(bodyFace ? { body: stack(bodyFace, 'system-ui, sans-serif') } : {}),
      ...(displayFace ? { display: stack(displayFace, 'system-ui, sans-serif') } : {}),
      ...(monoFace ? { mono: stack(monoFace, 'ui-monospace, monospace') } : {}),
    },
    material: { blur, opacity: translucency / 100 },
    radius: radius / 100,
    scheme: scheme === 'site' ? site : scheme,
    separation: { floating: floating as 'border' | 'fill' | 'shadow', surface },
    status: { allowance, harmony: harmony / 100 },
  }
}

/**
 * The bounds every numeric control answers to, stated once.
 *
 * The step is here for the same reason: a value is snapped to it on the way in,
 * so a URL saying `density=97` produces the 95 a reader could have reached
 * rather than a slider that can never show that number again.
 */
export const BOUNDS = {
  accentHue: { max: 360, min: 0, step: 15 },
  allowance: { max: 60, min: 0, step: 10 },
  blur: { max: 40, min: 0, step: 2 },
  chromaScale: { max: 100, min: 0, step: 5 },
  density: { max: 120, min: 80, step: 5 },
  harmony: { max: 100, min: 0, step: 10 },
  radius: { max: 150, min: 0, step: 10 },
  textBase: { max: 18, min: 12, step: 1 },
  textScale: { max: 160, min: 110, step: 2 },
  translucency: { max: 100, min: 40, step: 4 },
} as const

/** The contrast targets on offer, which are ratios rather than a range. */
export const CONTRASTS = [3, 4.5, 7] as const

/** The motion characters, in the order the select offers them. */
export const CHARACTERS: readonly Character[] = [
  '',
  'snappy',
  'gentle',
  'springy',
  'precise',
  'instant',
]

/** What may separate a surface in flow, and what may separate a floating one. */
export const SURFACES: readonly Mechanism[] = ['border', 'shadow', 'fill', 'space']
export const FLOATING: readonly Mechanism[] = ['shadow', 'border', 'fill']

/**
 * What a reader's URL carries, keyed by the field name the control already has.
 */
export type Params = Record<string, string | string[] | undefined>

/** One value, whatever a duplicated parameter did to it. */
const one = (raw: string | string[] | undefined): string | undefined =>
  Array.isArray(raw) ? raw[0] : raw

/** A number inside its own control's range, snapped to that control's step. */
const bounded = (
  raw: string | string[] | undefined,
  bounds: { max: number; min: number; step: number },
  fallback: number,
): number => {
  const value = Number(one(raw))
  if (one(raw) === undefined || one(raw) === '' || !Number.isFinite(value)) {
    return fallback
  }
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(value / bounds.step) * bounds.step))
}

/** A value that has to be one of a known set, or the shipped one. */
const oneOf = <T>(raw: string | string[] | undefined, set: readonly T[], fallback: T): T => {
  const value = set.find((member) => String(member) === one(raw))
  return value === undefined ? fallback : value
}

/**
 * A color, or the shipped one.
 */
const color = (raw: string | string[] | undefined, fallback: string): string => {
  const value = one(raw)
  return value && /^#?[0-9a-f]{6}$/i.test(value)
    ? `#${value.replace('#', '').toLowerCase()}`
    : fallback
}

/**
 * A face, if it is one we offer.
 */
const face = (
  raw: string | string[] | undefined,
  mono: boolean,
  fallback: string,
  catalog: readonly (readonly [string, string, number])[],
): string => {
  const value = one(raw)
  if (value === undefined || value === '') {
    return fallback
  }
  /* **`!== 1` rather than `=== 0`.** The catalog's third field is a category,
     not a monospace flag: 1 is monospace and every other value is proportional,
     so a serif tested with `=== 0` would be refused as though it were mono. */
  return catalog.some((row) => row[0] === value && (mono ? row[2] === 1 : row[2] !== 1))
    ? value
    : fallback
}

/**
 * The settings a link describes, with anything it got wrong left as shipped.
 *
 * Every field falls back on its own, so a link carrying one bad value loses
 * that value and keeps the rest. The alternative, refusing the whole query,
 * turns a typo into a theme somebody cannot open.
 */
export function settingsFrom(
  params: Params,
  catalog: readonly (readonly [string, string, number])[],
): Settings {
  return {
    accentHue: bounded(params.accent, BOUNDS.accentHue, INITIAL.accentHue),
    allowance: bounded(params.allowance, BOUNDS.allowance, INITIAL.allowance),
    blur: bounded(params['material-blur'], BOUNDS.blur, INITIAL.blur),
    bodyFace: face(params['body-face'], false, INITIAL.bodyFace, catalog),
    brand: color(params.brand, INITIAL.brand),
    chromaScale: bounded(params.chroma, BOUNDS.chromaScale, INITIAL.chromaScale),
    contrastTarget: oneOf(params.contrast, CONTRASTS, INITIAL.contrastTarget),
    density: bounded(params.density, BOUNDS.density, INITIAL.density),
    displayFace: face(params['display-face'], false, INITIAL.displayFace, catalog),
    floating: oneOf(params.floating, FLOATING, INITIAL.floating),
    harmony: bounded(params.harmony, BOUNDS.harmony, INITIAL.harmony),
    monoFace: face(params['mono-face'], true, INITIAL.monoFace, catalog),
    motion: oneOf(params.motion, CHARACTERS, INITIAL.motion),
    pageDark: color(params['page-dark'], INITIAL.pageDark),
    pageLight: color(params['page-light'], INITIAL.pageLight),
    radius: bounded(params.radius, BOUNDS.radius, INITIAL.radius),
    scheme: oneOf(params.scheme, ['site', 'light', 'dark'] as const, INITIAL.scheme),
    surface: oneOf(params.surface, SURFACES, INITIAL.surface),
    textBase: bounded(params['text-base'], BOUNDS.textBase, INITIAL.textBase),
    textScale: bounded(params['text-scale'], BOUNDS.textScale, INITIAL.textScale),
    translucency: bounded(params['material-opacity'], BOUNDS.translucency, INITIAL.translucency),
  }
}

/**
 * What a set of settings departs from the shipped ones by, as a query string.
 *
 * The caller passes an axis only when it is not the resting one: which context
 * and which layout lead is a fact about the generated lists rather than about a
 * theme, and this file does not know those lists.
 */
export function queryFrom(
  settings: Settings,
  preview: { context?: string; layout?: string } = {},
): string {
  const params = new URLSearchParams()
  const write = (key: string, value: number | string, shipped: number | string): void => {
    if (value !== shipped) {
      params.set(key, String(value))
    }
  }

  /* Alphabetical by key, so the same theme always produces the same link and
     two readers comparing URLs are comparing themes rather than orderings. */
  write('accent', settings.accentHue, INITIAL.accentHue)
  write('allowance', settings.allowance, INITIAL.allowance)
  write('body-face', settings.bodyFace, INITIAL.bodyFace)
  write('brand', settings.brand, INITIAL.brand)
  write('chroma', settings.chromaScale, INITIAL.chromaScale)
  write('contrast', settings.contrastTarget, INITIAL.contrastTarget)
  write('density', settings.density, INITIAL.density)
  write('display-face', settings.displayFace, INITIAL.displayFace)
  write('floating', settings.floating, INITIAL.floating)
  write('harmony', settings.harmony, INITIAL.harmony)
  if (preview.layout) {
    params.set('layout', preview.layout)
  }
  write('material-blur', settings.blur, INITIAL.blur)
  write('material-opacity', settings.translucency, INITIAL.translucency)
  write('mono-face', settings.monoFace, INITIAL.monoFace)
  write('motion', settings.motion, INITIAL.motion)
  write('page-dark', settings.pageDark, INITIAL.pageDark)
  write('page-light', settings.pageLight, INITIAL.pageLight)
  if (preview.context) {
    params.set('preview', preview.context)
  }
  write('radius', settings.radius, INITIAL.radius)
  write('scheme', settings.scheme, INITIAL.scheme)
  write('surface', settings.surface, INITIAL.surface)
  write('text-base', settings.textBase, INITIAL.textBase)
  write('text-scale', settings.textScale, INITIAL.textScale)

  return params.toString()
}

/**
 * A theme derived from an intent, and why its page was set aside where the
 * engine refused it.
 *
 * **A page no ink can be read on is refused, and the builder keeps going
 * without it**: the engine throws, and a page that threw on the server or on
 * a keystroke showed nothing at all. Derived again without `background`, so
 * the rest of the theme still shows, and the reason is handed back for the
 * field to say.
 */
export function deriveOr(
  engine: ThemeEngine,
  intent: ThemeIntent,
  selectors: readonly string[],
): { refused?: string; theme: ReturnType<ThemeEngine['derive']> } {
  try {
    return { theme: engine.derive(intent, selectors) }
  } catch (error) {
    if (!intent.background) {
      throw error
    }
    const { background: _, ...rest } = intent
    return {
      refused: error instanceof Error ? error.message : String(error),
      theme: engine.derive(rest, selectors),
    }
  }
}
