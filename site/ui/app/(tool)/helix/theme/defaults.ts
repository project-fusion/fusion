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
