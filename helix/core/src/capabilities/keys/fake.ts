import type { KeyPress } from '../types.generated.js'
import type { Keys } from './contract.generated.js'

/**
 * The modifiers held with a key, whether it repeats, and whether something
 * nearer the key claimed it first. Each one left out is `false`.
 */
export type Held = Partial<Omit<KeyPress, 'key'>>

/** One press, as a spec pressed it. */
export interface Pressed<N> {
  readonly node: N
  readonly press: KeyPress
  /** Whether a listener answered `true`, which on the web stops the browser acting on the key. */
  readonly taken: boolean
}

/**
 * A keys capability that a spec presses keys on.
 *
 * **It has one window**, so a listener anywhere hears a press on any node,
 * whatever node it named.
 */
export interface FakeKeys<N> extends Keys<N> {
  /** How many listeners are hearing `node`. */
  readonly listening: (node: N) => number
  /** How many listeners are hearing the keys anywhere. */
  readonly listeningAnywhere: () => number
  /**
   * Presses `key` on `node`, with the modifiers in `held`, and returns whether
   * it was taken. Each listener anywhere hears it first, then each listener on
   * `node`, each in the order it started listening, as `keydown` listeners on
   * the window in the capture phase and on the part do on the web. A press a
   * listener anywhere takes reaches no listener on `node`.
   */
  readonly press: (node: N, key: string, held?: Held) => boolean
  /** Every press, in order. */
  readonly pressed: readonly Pressed<N>[]
}

/** One call to `listen`, kept whole, so the same function listening twice is two listeners. */
interface Listener {
  readonly heard: (press: KeyPress) => boolean
}

/** Starts `heard` listening among `on`, until stopped. */
const join = (on: Set<Listener>, heard: (press: KeyPress) => boolean): (() => void) => {
  const entry: Listener = { heard }
  on.add(entry)
  return () => {
    on.delete(entry)
  }
}

/**
 * Hands `press` to each listener in `on`, and answers whether any took it.
 * Each one is looked for again before it hears the press, so one stopped by
 * an earlier listener hears nothing, as on the web. Every listener still
 * hears a press an earlier one took.
 */
const hear = (on: Set<Listener>, press: KeyPress): boolean => {
  let taken = false
  for (const one of [...on]) {
    if (on.has(one) && one.heard(press)) {
      taken = true
    }
  }
  return taken
}

/** A fake that hears the keys a spec presses on a node, and keeps each press. */
export const fakeKeys = <N>(): FakeKeys<N> => {
  const listeners = new Map<N, Set<Listener>>()
  const anywhere = new Set<Listener>()
  const pressed: Pressed<N>[] = []
  return {
    listen: (node, heard) => {
      const on = listeners.get(node) ?? new Set<Listener>()
      listeners.set(node, on)
      return join(on, heard)
    },
    listenAnywhere: (_node, heard) => join(anywhere, heard),
    listening: (node) => listeners.get(node)?.size ?? 0,
    listeningAnywhere: () => anywhere.size,
    press: (node, key, held = {}) => {
      const press: KeyPress = {
        alt: false,
        claimed: false,
        control: false,
        meta: false,
        repeat: false,
        shift: false,
        ...held,
        key,
      }
      const taken = hear(anywhere, press) || hear(listeners.get(node) ?? new Set(), press)
      pressed.push({ node, press, taken })
      return taken
    },
    pressed,
  }
}
