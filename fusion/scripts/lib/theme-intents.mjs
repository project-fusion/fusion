/**
 * The intents every theme assertion is derived from.
 *
 * **Stated here as well as in Rust, and the duplication is checked rather than
 * merely tolerated.** `oracle::intent_for` is what the engine derives from and
 * this is what `turbo run wasm-check` feeds to the browser distribution, and the two are
 * compared against each other every time that check runs: it drives the WASM
 * module with the intent from this file and asserts the result against the
 * oracle theme of the same label, which Rust built from its own. A drift between
 * them is a failure with the offending token named, rather than two lists
 * quietly meaning different things.
 *
 * The alternative was serializing the resolved intent into the oracle so this
 * file could be deleted, which needs a `Serialize` on every shape in the
 * vocabulary including three unions with hand-written readers. A list of small
 * literals held to each other by a check is the cheaper honest answer.
 *
 * Chosen so each one changes a different phase: the scheme flips the whole
 * ladder, the separation policy scales it, a ceiling of 0 makes every derived
 * color gray, AAA moves every solved lightness, and a brand that *is* a status
 * color is the case the hue repair cannot fully answer and reports instead.
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
  /* An accent named both ways. Unnamed, an accent is the brand and never
     rotates or pins, so without these the oracle would hold no accent that
     does. `complement` is what every intent above defaulted to before. */
  { intent: { accent: { from: 'brand', rotate: 180 }, brand: '#3b82f6' }, label: 'complement' },
  { intent: { accent: '#db2777', brand: '#3b82f6' }, label: 'pinned-accent' },
  /* No brand, which is ink: the primary held at the neutral's near-black or
     near-white, a fill that turns light in the dark with the page's color on it,
     and statuses at their own chroma. The accent named as a color is the one
     second color an ink theme can have, and its label is the near-white beside
     the ink's page-colored one. */
  { intent: {}, label: 'ink' },
  { intent: { scheme: 'dark' }, label: 'ink-dark' },
  { intent: { accent: '#db2777' }, label: 'ink-accent' },
]
