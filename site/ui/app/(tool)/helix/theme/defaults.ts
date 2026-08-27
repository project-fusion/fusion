/**
 * What a fresh builder starts as, stated once.
 *
 * **It was stated three times in `builder.tsx` and is now needed in a fourth
 * place**, which is what forced this out. The nineteen values appeared as
 * `useState` initialisers, again in the `pristine` comparison that decides
 * whether the reset control is live, and again in `reset` itself. A default
 * changed in two of the three is a builder whose reset goes somewhere the reader
 * never was, and nothing would have said so.
 *
 * The fourth place is the server. The page derives this intent before it renders
 * so the first paint carries a real palette, which is what the engine being
 * synchronous used to buy for free.
 *
 * **Chosen to be what already ships**, not what this file would prefer: the
 * sliders start where the stylesheet already is, so moving one is a departure a
 * reader can see rather than a jump.
 */
import type { ThemeIntent } from '@helix-io/theme'

/**
 * The selector the emitted block is written for.
 *
 * **A data attribute rather than a class**, because this is not styling: it
 * names *which theme* a subtree is in, the same way `data-helix-theme` names
 * that a subtree is themed at all and `data-color-mode` names which half of
 * `light-dark()` resolves. A class would say the preview looks a certain way,
 * where the attribute says it is a particular theme, and the emitted block is
 * about the second.
 *
 * **The preview is styled by exactly the CSS the page is showing**, which is
 * the one property a builder has to have: what you copy is what you saw. The
 * alternative, setting properties on the node and rendering a separate string,
 * is two derivations of the same answer, and this session spent most of its
 * time finding bugs of exactly that shape.
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
  radius: number
  scheme: 'dark' | 'light'
  surface: Mechanism
  textBase: number
  textScale: number
  translucency: number
}

export const INITIAL: Settings = {
  accentHue: 180,
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
  radius: 50,
  scheme: 'light',
  surface: 'border',
  textBase: 14,
  textScale: 132,
  translucency: 100,
}

/** The stack a face becomes, so a fetch that has not landed still reads. */
const stack = (family: string, fallback: string): string =>
  family ? `"${family}", ${fallback}` : ''

/** The intent these settings describe. */
export function intentFrom(settings: Settings): ThemeIntent {
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
    radius,
    scheme,
    surface,
    textBase,
    textScale,
    translucency,
  } = settings

  return {
    accent: { from: 'brand', rotate: accentHue },
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
    scheme,
    separation: { floating: floating as 'border' | 'fill' | 'shadow', surface },
    status: { allowance, harmony: harmony / 100 },
  }
}

/**
 * The bounds every numeric control answers to, stated once.
 *
 * **They were stated in the JSX and are now needed twice**, which is the same
 * pressure that produced this file. A URL carries whatever somebody puts in it,
 * so a value arriving that way has to be clamped to the range the slider offers
 * or the builder shows a control sitting outside its own track, unable to
 * return to the value it is displaying. Clamping against a copy of the numbers
 * would drift from the sliders the first time one moved.
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
 *
 * **The query rather than the fragment, and that is the whole design.** A
 * fragment never reaches a server, so a shared link would arrive with the
 * default palette in the HTML and jump to the shared one a moment after
 * hydration, which is precisely the first-paint property `serverTheme` exists
 * to hold. A query string is on the request, so the page derives the theme
 * somebody sent before it renders anything. The insights grid and the component
 * gallery both already seed from the URL on the server for the same reason.
 *
 * **Only departures are written.** Nineteen values would make every link a
 * paragraph, and a reader who changed two things gets two parameters. It also
 * means an empty query is the shipped theme, so `reset` clears the URL by
 * having nothing to say rather than by knowing how to erase it.
 *
 * The keys are the `name` each control already carries, so a field in the form
 * and a parameter in the link are the same word.
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
 *
 * **Validated because it is written into a stylesheet.** The brand reaches the
 * engine and the engine's output reaches a `<style>` block, so a string from
 * somebody else's link that is not a color is a string from somebody else's
 * link inside a declaration. Six hex digits is the whole vocabulary, and
 * anything else is the default rather than an error: a link that has been
 * mangled in a chat client should still open the builder.
 */
const color = (raw: string | string[] | undefined, fallback: string): string => {
  const value = one(raw)
  return value && /^#?[0-9a-f]{6}$/i.test(value)
    ? `#${value.replace('#', '').toLowerCase()}`
    : fallback
}

/**
 * A face, if it is one we offer.
 *
 * Same reasoning as the color and one step further: a family name is
 * interpolated into a `font-family` *and* into a request to Google, so an
 * unchecked one is both a declaration somebody else wrote and a fetch somebody
 * else aimed. The catalog is the vocabulary, and `mono` decides which half of
 * it applies, so a mono field cannot be handed a display face.
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
  /* **`!== 1` rather than `=== 0`**, the third field having become a category
     rather than a monospace flag. Monospace kept the 1 it had, so the mono test
     is unchanged and the proportional one is every other category rather than
     the single value that used to mean "not mono". Written the old way, a serif
     arriving in a link would have been refused as though it were mono. */
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
    radius: bounded(params.radius, BOUNDS.radius, INITIAL.radius),
    scheme: oneOf(params.scheme, ['light', 'dark'] as const, INITIAL.scheme),
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
