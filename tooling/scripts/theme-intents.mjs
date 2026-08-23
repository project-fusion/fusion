/**
 * The intents every theme assertion is derived from.
 *
 * **Their own module, and the reason is a deletion that has not happened yet.**
 * These are data, and `build-oracle.mjs` reaches for the TypeScript engine to
 * turn them into an oracle. `check-wasm.mjs` needs the same list and must not
 * pull that engine in with it: the whole point of the WASM distribution is that
 * `derive.ts` can go, and a check that imports it dies on the day it does, for a
 * reason whose stack trace is about module resolution.
 *
 * It is also why this file is `.mjs` with no TypeScript import in it. Node runs
 * it directly; `build-oracle.mjs` still needs bun, because it imports `.ts`.
 *
 * Chosen so each one changes a different phase: the scheme flips the whole
 * ladder, the separation policy scales it, a ceiling of 0 makes every derived
 * colour grey, AAA moves every solved lightness, and a brand that *is* a status
 * colour is the case the hue repair cannot fully answer and reports instead.
 */
export const INTENTS = [
  { intent: { brand: '#3b82f6' }, label: 'default' },
  { intent: { brand: '#3b82f6', scheme: 'dark' }, label: 'dark' },
  { intent: { brand: '#3b82f6', separation: { surface: 'fill' } }, label: 'fill' },
  { intent: { brand: '#3b82f6', separation: { surface: 'space' } }, label: 'space' },
  {
    intent: { brand: '#3b82f6', scheme: 'dark', separation: { surface: 'fill' } },
    label: 'dark-fill',
  },
  { intent: { brand: '#3b82f6', chroma: { ceiling: 0 } }, label: 'monotone' },
  { intent: { brand: '#3b82f6', contrastTarget: 7 }, label: 'aaa' },
  { intent: { brand: '#c1272d' }, label: 'red' },
  { intent: { brand: '#f59e0b' }, label: 'amber' },
  /* Quiet enough that the status floor binds and the chroma is still non-zero.
     `monotone` binds the floor too and cannot show it: its ceiling of 0 zeroes
     the status chroma, so the floor is multiplied into nothing. Measured before
     adding this: pull 0.525 against a floor of 0.55, danger chroma 0.0058. */
  { intent: { brand: '#3b82f6', chroma: { scale: 0.05 } }, label: 'quiet' },
  { intent: { brand: '#3b82f6', neutral: { chroma: 0.01, hue: 250 } }, label: 'cast' },
  /* Pinned tokens, which are the only phase whose *position* in the list is a
     decision rather than a consequence: `color-primary` replaces an entry the
     assembly already emitted and keeps its place, `color-house-teal` is one the
     assembly never emits and lands at the end. Both halves are exercised here
     because a port that appends unconditionally passes on either alone. */
  {
    intent: {
      brand: '#3b82f6',
      tokens: { 'color-house-teal': '#0f766e', 'color-primary': '#7c3aed' },
    },
    label: 'pinned',
  },
  /* A brand no page surface can hold at its own lightness, which is the only
     input that makes the brand mark walk at all. Every other theme's brand
     clears 3:1 where it stands, so step 0 answers and the search's direction
     never shows in an output. */
  { intent: { brand: '#fef08a' }, label: 'pale' },
  /* Everything below the tokens in the emitted block, none of which any intent
     above turns on. Each of these is a branch that emits nothing when omitted,
     so a port that dropped the whole tail would pass on all thirteen themes.
     The namespace goes here too, being the input that makes the spring easing
     reference correct for more than one consumer. */
  {
    intent: {
      brand: '#3b82f6',
      font: { base: 16, body: 'Inter', mono: 'Berkeley Mono', scale: 1.25, weight: 'strong' },
      material: { blur: 12, opacity: 0.72 },
      motion: { character: 'springy', scale: 1.2 },
      namespace: 'acme',
      separation: { floating: 'shadow', surface: 'shadow' },
    },
    label: 'expressive',
  },
  /* `instant` is the character that emits durations and refuses curves, and it
     ignores the scale beside it rather than multiplying by it. A port emitting
     three curves of zero length passes every other check. */
  {
    intent: { brand: '#3b82f6', motion: { character: 'instant', scale: 3 } },
    label: 'instant',
  },
  /* A base small enough that the floor binds, which nothing else reaches: at 12
     the two steps below body are 10 and 11 and both clamp to 11. Removing the
     floor entirely was invisible to every other theme, because a ramp built from
     14 or 16 never goes near it. */
  { intent: { brand: '#3b82f6', font: { base: 12 } }, label: 'tiny' },
  /* A pace with no character, which takes the multiplier straight from the
     scale, and a display face with no body face, which is the one font branch
     that falls back the other way. `blur: 0` is `none` rather than `blur(0px)`,
     and is a decision rather than a rounding. */
  {
    intent: {
      brand: '#3b82f6',
      font: { display: 'Playfair Display', weight: 'light' },
      material: { blur: 0, opacity: 1 },
      motion: { scale: 0.5 },
      separation: { floating: 'border' },
    },
    label: 'paced',
  },
]
