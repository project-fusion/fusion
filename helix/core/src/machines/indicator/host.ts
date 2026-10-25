import { measure } from '../../capabilities/measure/index.js'
import { motion } from '../../capabilities/motion/index.js'
import type { Rect as Box, Frame, Transition } from '../../capabilities/types.generated.js'
import type { Host, Performed } from '../runner.js'
import type * as compiled from './indicator.generated.js'
import type {
  IndicatorContext,
  IndicatorInput,
  Measurement,
  Placement,
  Rect,
  Surface,
} from './machine.js'

/** The effects a host performs for an indicator. */
export type IndicatorEffect = Performed<typeof compiled>

/**
 * What a family binds an indicator to: the mark, the chosen item and the
 * surface the mark is placed against, how the mark is drawn, and how what the
 * host reads reaches the machine.
 */
export interface IndicatorParts<N> {
  /** The chosen item, or `null` where nothing is chosen. */
  readonly chosen: () => N | null

  /** What the surface's box does not say: its border widths, and the direction its text runs. */
  readonly edges: (surface: N) => Pick<Surface, 'borderLeft' | 'borderTop' | 'direction'>

  /**
   * The frame that draws the mark at `at`. **The mark's style decides it**:
   * which of the item's width and height the mark takes, and where it sits
   * against the item, as a line under a tab takes the tab's width, keeps its
   * own height, and sits at the tab's bottom edge.
   */
  readonly frame: (at: Placement) => Frame

  /** Sends `LANDED` with `token`, the travel that ended. */
  readonly landed: (token: number) => void

  /** The mark, or `null` where it is not drawn. */
  readonly mark: () => N | null

  /** Sends `MEASURED` with what the measurement read and `token`, the measurement asked for. */
  readonly measured: (measurement: Measurement, token: number) => void

  /**
   * Shows the mark or hides it, as `data-placed` does on the web. A glide
   * under way goes on either way.
   */
  readonly show: (shown: boolean) => void

  /** The box the mark is placed against, its containing block, or `null` where it is not drawn. */
  readonly surface: () => N | null

  /** How the mark travels to a new place. */
  readonly transition: () => Transition
}

/** A box as the machine reads it. A part the measure capability has no box for has a box of zero by zero. */
const rectOf = (box: Box | null): Rect =>
  box === null
    ? { height: 0, left: 0, top: 0, width: 0 }
    : { height: box.height, left: box.x, top: box.y, width: box.width }

/** Whether a placement draws the mark where `drawn` already did, at the same size. */
const same = (drawn: Placement | null, at: Placement): boolean =>
  drawn !== null &&
  drawn.block === at.block &&
  drawn.inline === at.inline &&
  drawn.x === at.x &&
  drawn.y === at.y

/**
 * Reads the chosen item and the surface through the measure capability. A
 * chosen item with no box yet reads as a box of zero by zero, which the
 * machine leaves alone, and a surface with no mark to draw reads as none.
 */
const read = <N>(parts: IndicatorParts<N>): Measurement => {
  const item = parts.chosen()
  const surface = parts.mark() === null ? null : parts.surface()
  const own = surface === null ? null : measure().box(surface)
  return {
    item: item === null ? null : rectOf(measure().box(item)),
    surface: surface === null || own === null ? null : { ...rectOf(own), ...parts.edges(surface) },
  }
}

/**
 * What an indicator's effects do: `measure` reads both boxes through the
 * measure capability and sends what it read, `put` draws the mark through the
 * motion capability's `place`, and `glide` through its `glide`, which sends
 * `LANDED` as the glide arrives. `put` and `glide` show the mark, and `hide`
 * hides it.
 *
 * **A placement during a travel moves the travel's end.** On the web a
 * transition follows a value written partway through it, so a `put` while a
 * travel is under way glides to the new place under the same token, and
 * leaves a glide already on its way there alone.
 *
 * **`land` stops listening and moves nothing.** A travel the deadline ends
 * still arrives where it was going, and its arrival sends nothing. Hiding
 * the mark moves nothing either, so a travel goes on while the mark is hidden.
 *
 * The host keeps the travel it listens for and where it last drew the mark,
 * so a platform makes one host for each runner. No effect tells the consumer
 * anything.
 */
export const indicatorHost = <N>(
  parts: IndicatorParts<N>,
): Host<IndicatorContext, IndicatorEffect, IndicatorInput> => {
  /* The travel whose arrival sends `LANDED`, or 0 where none does. */
  let heard = 0
  /* Where the mark was last placed or is on its way to. */
  let drawn: Placement | null = null

  const travel = (mark: N, at: Placement, token: number): void => {
    heard = token
    drawn = at
    motion().glide(mark, parts.frame(at), parts.transition(), () => {
      if (heard === token) {
        heard = 0
        parts.landed(token)
      }
    })
  }

  const put = (context: IndicatorContext): void => {
    const mark = parts.mark()
    const { at, travel: token } = context
    if (mark === null || at === null) {
      return
    }
    if (token !== 0) {
      if (!same(drawn, at)) {
        travel(mark, at, token)
      }
      return
    }
    drawn = at
    motion().place(mark, parts.frame(at))
  }

  return {
    notifies: [],
    perform: {
      glide: (context) => {
        const mark = parts.mark()
        if (mark !== null && context.at !== null) {
          travel(mark, context.at, context.travel)
        }
        parts.show(true)
      },
      hide: () => {
        parts.show(false)
      },
      land: () => {
        heard = 0
      },
      measure: (context) => {
        parts.measured(read(parts), context.asked)
      },
      put: (context) => {
        put(context)
        parts.show(true)
      },
    },
  }
}
