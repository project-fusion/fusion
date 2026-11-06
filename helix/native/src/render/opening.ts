/**
 * The open phase of a part that opens and closes, as a stage, a panel or a
 * callout's body does: `closed`, `opening`, `open`, or `closing`.
 *
 * **A phase that moves ends on its motion-done signal.** `opening` becomes
 * `open`, and `closing` becomes `closed`, once the motion that moves it has
 * run, and a part that does not move, under reduced motion or a transition
 * of no length, goes straight to `open` or `closed`. A turn back while it
 * moves starts the other way from where it stands.
 */

/** Where a part that opens and closes stands. */
export type OpenPhase = 'closed' | 'closing' | 'open' | 'opening'

/** What moves a phase: the part is asked to open or to close, or its motion is done. */
export type OpenEvent = 'close' | 'done' | 'open'

/** The phase `event` moves `phase` to. `moves` is whether a motion runs between them. */
export const phaseAfter = (phase: OpenPhase, event: OpenEvent, moves: boolean): OpenPhase =>
  (moves ? MOVED : AT_ONCE)[phase][event]

/** Each phase's next, by the event, where a motion runs between them. */
const MOVED: Readonly<Record<OpenPhase, Readonly<Record<OpenEvent, OpenPhase>>>> = {
  closed: { close: 'closed', done: 'closed', open: 'opening' },
  closing: { close: 'closing', done: 'closed', open: 'opening' },
  open: { close: 'closing', done: 'open', open: 'open' },
  opening: { close: 'closing', done: 'open', open: 'opening' },
}

/** Each phase's next, by the event, where no motion runs. */
const AT_ONCE: Readonly<Record<OpenPhase, Readonly<Record<OpenEvent, OpenPhase>>>> = {
  closed: { close: 'closed', done: 'closed', open: 'open' },
  closing: { close: 'closing', done: 'closed', open: 'open' },
  open: { close: 'closed', done: 'open', open: 'open' },
  opening: { close: 'closed', done: 'open', open: 'opening' },
}

/** Whether the phase is a motion, which a motion-done signal ends. */
export const moving = (phase: OpenPhase): boolean => phase === 'opening' || phase === 'closing'

/** The phase a part opens in when it is first drawn: no motion runs then. */
export const firstPhase = (open: boolean): OpenPhase => (open ? 'open' : 'closed')

/**
 * The height a part that fits its content draws at, in its phase, from its
 * content's measured height. **Open, it takes no height of its own**, so
 * content that grows or shrinks while open moves the part with it at once.
 * Opening, it moves to the measured height, and to the new one where the
 * content changes on the way. Closing starts at the measured height, which
 * `armed` then takes to none, so the move has a length to start from.
 */
export const fittedHeight = (
  phase: OpenPhase,
  measured: number | undefined,
  armed: boolean,
): number | undefined => {
  switch (phase) {
    case 'closed':
      return 0
    case 'open':
      return undefined
    case 'opening':
      return measured
    case 'closing':
      return armed ? 0 : measured
  }
}
