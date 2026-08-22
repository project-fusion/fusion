import type { HelixAura } from '@helix-io/web'
import type { Topic } from './insights'

/**
 * A field of light for each topic, drawn by the same component as the hero.
 *
 * **`Aura` rather than a drawing, which is the whole point.** The schematic this
 * replaced was five compositions in the gallery's vocabulary, and it read as
 * documentation: correct, legible, and the wrong register for writing. What the
 * hero does is atmosphere, and a card that opens onto the same light belongs to
 * the same publication.
 *
 * **Per topic, and the shape is the only thing that varies.** Eleven are
 * available and five are used, one per topic, so two Engineering pieces are the
 * same field rather than two arbitrary ones. The rest of the knobs are held
 * still on purpose: a card is a thumbnail, and a field tuned per post is five
 * decisions nobody can defend later.
 *
 * **Slow and quiet, because this sits behind a title rather than under a
 * masthead.** `speed` is a third of the hero's and `gain` is under half, so the
 * card reads as a lit surface rather than as something competing with the words
 * on it. `Aura` stops on its own when it is off screen or the tab is in the
 * background, and answers `prefers-reduced-motion` with a single still frame,
 * so a page of these is not a page of running shaders.
 */
const FIELD: Record<
  Topic,
  { gain: number; scale: number; shape: NonNullable<HelixAura['shape']> }
> = {
  /* Braid: strands running together, which is what a company is. */
  Company: { gain: 0.42, scale: 1.4, shape: 'braid' },
  /* Lattice: a regular field, the thing a system is. */
  'Design systems': { gain: 0.38, scale: 1.2, shape: 'lattice' },
  /* Threads: many lines under tension, holding. */
  Engineering: { gain: 0.4, scale: 1.3, shape: 'threads' },
  /* Caustics: light gathered and focused, which is what reading a signal is. */
  Intelligence: { gain: 0.44, scale: 1.5, shape: 'caustics' },
  /* Aurora: a field that is entirely its own and owes nothing. */
  Sovereignty: { gain: 0.4, scale: 1.6, shape: 'aurora' },
}

/**
 * The field across the top of an insight card.
 *
 * `slot` is a declared prop rather than a spread, because React types an
 * intrinsic element's props from the element rather than from the component
 * around it: without it the attribute is refused at the call site and the field
 * renders inside the card's inset like content.
 */
export function InsightArt({ slot, topic }: { slot?: string; topic: Topic }) {
  const field = FIELD[topic]
  return (
    <helix-aura
      class="insightArt"
      gain={field.gain}
      scale={field.scale}
      shape={field.shape}
      slot={slot}
      speed={0.3}
    ></helix-aura>
  )
}
