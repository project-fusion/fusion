/**
 * The surface model: what a colour token is for, and what lands on what.
 *
 * **This is the foundation the components are built on rather than a record of
 * what they currently do.** The alternative was to enumerate pairs by scanning
 * `helix/web` for inks and grounds used together, and it is the wrong direction
 * twice over: it makes the guarantee a description of today's stylesheets, and
 * it means a component pairing two tokens nobody intended would teach the
 * engine that the pairing is legitimate. The model says what is intended, the
 * engine solves for it, and a stylesheet that departs from it is wrong.
 *
 * **Ten hand-written pairs is what this replaces.** `derive.ts` carried a list
 * of ten, which was a claim about ten pairs rather than about a theme: a tag on
 * a raised card, a hovered filled button, a focus ring, and every status fill
 * were all unmeasured. Derived from the model there are more than fifty, and
 * adding a ground to an ink adds its pairs everywhere at once.
 */

/**
 * A surface something is painted on.
 *
 * `bounded` is the interesting field. Contrast is measured against a known
 * ground, and some grounds are not knowable when the theme is derived: text
 * over a photograph, or a scrim over whatever the reader scrolled under it.
 * Those pairs come back `unverifiable`, which is not a softer failure and is
 * not folded into one.
 */
export interface Ground {
  /** False when what sits behind it cannot be known at derivation time. */
  bounded: boolean
  name: string
}

/**
 * Something painted on a ground.
 *
 * `contrast` picks the target. Text answers to the theme's `contrastTarget`,
 * which is 4.5 by default because that is what WCAG 2.1 AA asks of body text
 * and what the European Accessibility Act points at. A `component` is a border,
 * a ring or a mark that has to be *seen* rather than read, which WCAG 1.4.11
 * puts at 3:1.
 */
export interface Ink {
  contrast: 'component' | 'text'
  grounds: string[]
  name: string
}

/** The page's own ladder, from furthest back to nearest front. */
export const PAGE_SURFACES = [
  'color-background',
  'color-surface',
  'color-surface-raised',
  'color-surface-overlay',
  'color-surface-sunken',
] as const

/** Tinted grounds a quiet badge or a selected row sits on. */
export const TINTS = ['color-primary-subtle', 'color-accent-subtle'] as const

/**
 * Filled grounds, every one of which carries `foreground-on-accent`.
 *
 * **The hover states are grounds too, and they were the gap.** A filled button
 * under a pointer is a different colour with the same text on it, and the ink
 * was solved against the resting fill alone. Six families times two states is
 * twelve grounds, of which exactly one was being checked.
 */
export const FILLS = [
  'color-accent-surface',
  'color-accent-surface-hover',
  'color-danger-surface',
  'color-danger-surface-hover',
  'color-info-surface',
  'color-info-surface-hover',
  'color-primary-surface',
  'color-primary-surface-hover',
  'color-success-surface',
  'color-success-surface-hover',
  'color-warning-surface',
  'color-warning-surface-hover',
] as const

/** The four severities, which are inks on the page and fills of their own. */
export const STATUSES = ['danger', 'info', 'success', 'warning'] as const

export const GROUNDS: Ground[] = [
  ...PAGE_SURFACES.map((name) => ({ bounded: true, name })),
  ...TINTS.map((name) => ({ bounded: true, name })),
  ...FILLS.map((name) => ({ bounded: true, name })),
  { bounded: true, name: 'color-surface-inverse' },
  /* Not bounded, and this is the honest case rather than a placeholder. A
     caption over a photograph has whatever the photograph is behind it, and no
     derivation can know that. The mitigation is a scrim the component owns, and
     the engine's job is to say it did not measure this rather than to imply it
     did. */
  { bounded: false, name: 'color-surface-media' },
]

export const INKS: Ink[] = [
  { contrast: 'text', grounds: [...PAGE_SURFACES, ...TINTS], name: 'color-foreground' },
  { contrast: 'text', grounds: [...PAGE_SURFACES], name: 'color-foreground-muted' },
  { contrast: 'text', grounds: [...FILLS], name: 'color-foreground-on-accent' },
  { contrast: 'text', grounds: ['color-surface-inverse'], name: 'color-foreground-inverse' },
  { contrast: 'text', grounds: ['color-surface-media'], name: 'color-foreground-media' },
  {
    contrast: 'text',
    grounds: [...PAGE_SURFACES, 'color-primary-subtle'],
    name: 'color-primary',
  },
  {
    contrast: 'text',
    grounds: [...PAGE_SURFACES, 'color-accent-subtle'],
    name: 'color-accent',
  },
  ...STATUSES.map((status) => ({
    contrast: 'text' as const,
    grounds: [...PAGE_SURFACES],
    name: `color-${status}`,
  })),
  /* A ring has to be seen rather than read, so 3:1 under WCAG 1.4.11 and not
     the text target. It is in the model at all because it is the one mark whose
     absence makes a keyboard unusable, and the engine has never emitted it. */
  {
    contrast: 'component',
    grounds: [...PAGE_SURFACES],
    name: 'color-focus-ring',
  },
  /* **The one place the brand appears as itself.** Everywhere else it is
     solved: `primary` moves its lightness to clear 4.5 as text, and
     `primary-surface` moves further still to carry white on a fill. A mark is
     neither, and under WCAG 1.4.11 a graphic answers to 3:1, so it can sit far
     closer to the colour the consumer actually typed.

     Which is also what makes it worth a token rather than a reuse of
     `primary`: a reader who picks a bright yellow and sees olive buttons has no
     way to find their own colour anywhere on the page otherwise. */
  {
    contrast: 'component',
    grounds: [...PAGE_SURFACES],
    name: 'color-brand-mark',
  },
]

/**
 * `foreground-subtle` is deliberately absent, and the measurement is why.
 *
 * #124 solved the two quiet inks against every light ground and found the
 * readable range supports one quiet readable step and not two: `muted` and
 * `subtle` land three hundredths apart and no rearrangement inside the range
 * separates them. Emitting it here would be the engine claiming to have solved
 * something already measured as unsolvable, so the stylesheet keeps its own and
 * the engine does not pretend.
 */
export const NOT_EMITTED = ['color-foreground-subtle'] as const
