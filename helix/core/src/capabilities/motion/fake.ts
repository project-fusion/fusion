import { environment } from '../environment/index.js'
import type { Frame, Transition } from '../types.generated.js'
import type { Motion } from './contract.generated.js'

/** One place or glide, as it was asked for. */
export type MotionCall<N> =
  | {
      readonly call: 'glide'
      readonly node: N
      readonly to: Frame
      readonly transition: Transition
    }
  | { readonly call: 'place'; readonly node: N; readonly to: Frame }

/** A glide on its way: where it ends, and how it runs. */
export interface Gliding {
  readonly to: Frame
  readonly transition: Transition
}

/**
 * A motion capability that keeps where each node is drawn and every call, and
 * holds each glide until a spec lands it.
 */
export interface FakeMotion<N> extends Motion<N> {
  /**
   * Lands the glide `node` is in: the node is drawn at its end, and the glide
   * calls back. A node in no glide is left as it is.
   */
  readonly arrive: (node: N) => void
  /** Every place and glide, in order. */
  readonly calls: readonly MotionCall<N>[]
  /** The glide `node` is in, or `null` where it is in none. */
  readonly gliding: (node: N) => Gliding | null
  /**
   * Where `node` is drawn: each field it was placed at or a glide landed it
   * at. A glide on its way has not moved it yet.
   */
  readonly where: (node: N) => Frame
}

/** A glide the fake holds, with the call back it owes. */
interface Held extends Gliding {
  readonly done: () => void
}

/** `to` drawn over `from`: each field `to` leaves out keeps the value it had. */
const over = (from: Frame, to: Frame): Frame => ({
  ...from,
  ...Object.fromEntries(Object.entries(to).filter(([, value]) => value !== undefined)),
})

/**
 * Whether a glide arrives at once, as on the web: where the environment
 * capability says the reader asks for reduced motion, or where it has no
 * length.
 */
const atOnce = (transition: Transition): boolean =>
  environment().read().reducedMotion || !(transition.duration > 0)

/**
 * A fake that keeps each place and glide and where each node is drawn. A glide
 * waits for `arrive`, and arrives at once where the web's would: under reduced
 * motion, as the environment capability reads it, or with no length. A place,
 * a later glide, or a stop ends a glide without calling it back.
 */
export const fakeMotion = <N>(): FakeMotion<N> => {
  const calls: MotionCall<N>[] = []
  const frames = new Map<N, Frame>()
  const glides = new Map<N, Held>()
  const draw = (node: N, to: Frame): void => {
    glides.delete(node)
    frames.set(node, over(frames.get(node) ?? {}, to))
  }
  return {
    arrive: (node) => {
      const glide = glides.get(node)
      if (glide) {
        draw(node, glide.to)
        glide.done()
      }
    },
    calls,
    glide: (node, to, transition, done) => {
      calls.push({ call: 'glide', node, to, transition })
      if (atOnce(transition)) {
        draw(node, to)
        done()
        return () => undefined
      }
      const glide: Held = { done, to, transition }
      glides.set(node, glide)
      return () => {
        if (glides.get(node) === glide) {
          glides.delete(node)
        }
      }
    },
    gliding: (node) => {
      const glide = glides.get(node)
      return glide ? { to: glide.to, transition: glide.transition } : null
    },
    place: (node, to) => {
      calls.push({ call: 'place', node, to })
      draw(node, to)
    },
    where: (node) => ({ ...frames.get(node) }),
  }
}
