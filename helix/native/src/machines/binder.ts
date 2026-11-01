import type { AnchorPress } from '../render/anchored'
import type { Behavior, Props } from '../render/behavior'
import type { Pager } from '../render/scroll'
import type { Copied } from './copy'
import type { Entered } from './entry'
import type { Joined } from './join'
import type { OverAsked } from './layer-over'
import type { Spun } from './spin'
import type { Tail } from './tail'
import type { Turned } from './toggle'

/** What every machine of one element reads beside its props, at one render. */
export interface Around {
  /**
   * What the element's layer gives the presses drawn in its anchor, which
   * the layer's machine writes before the presses are bound: a press the
   * element draws there reads it, as a speed dial's own trigger does, since
   * it reads no context its own element provides.
   */
  readonly anchored: { part?: string; press?: AnchorPress | undefined }
  /** What the machines bound before this one gave, in order. */
  readonly bound: readonly Behavior[]
  /** The set's choice, which its selection writes as it draws, for the verdict on it. */
  readonly chosen: { current: string | undefined }
  /** The copy a press on its pressable runs, where the element declares one. */
  readonly copied?: Copied | undefined
  /** The text the element holds, where a reader types into it. */
  readonly entered?: Entered | undefined
  /**
   * Methods the element's ref holds beside the verdict's `validate`, which
   * a machine writes as it draws, as the files machine offers `removeAt`.
   */
  readonly handle: { current: Readonly<Record<string, unknown>> }
  /**
   * What a machine bound before the element's layer answers for it, and
   * what the layer tells it back, as a tour stop's: the layer asks
   * `dismiss` before it dismisses itself, and writes `holds`, whether focus
   * is inside it, and `view`, its own view, as it draws.
   */
  readonly layering: {
    dismiss?: (by: 'outside' | 'request' | 'swipe') => boolean
    holds?: () => boolean
    /** Stands the layer over its anchor, as a Select's `position="item-aligned"`. */
    over?: OverAsked
    view?: () => unknown
  }
  /** The set the element joined as an item, where it is one. */
  readonly joined: Joined | undefined
  /** The pager of each scrolling part, by the part's name, once it is drawn. */
  readonly pagers: ReadonlyMap<string, Pager>
  /**
   * What is wrong with a number a reader types and steps, which its spin
   * writes as it draws, for the verdict on it.
   */
  readonly spun: { current: Spun | undefined }
  /**
   * What a press does in a stack of pages, which the stack's machines write
   * before the presses are bound: the part whose press goes back one page,
   * and, on a row that holds a page, the move into it.
   */
  readonly stacked: {
    back?: { readonly go: () => void; readonly part: string }
    enter?: () => void
    /** Goes back one page where a page below the top shows, and says whether it did. */
    leave?: () => boolean
  }
  /** The element's toggle, where it turns on and off. */
  readonly toggled: Turned | undefined
  /** The box that follows its newest content, which a machine draws in. */
  readonly tail: { current: Tail | undefined }
  /** Touches the verdict on the element's answer, as a change does. */
  readonly touch: () => void
}

/** A machine a family binds, as the hooks that host it at each render of one element. */
export type Binder = (props: Props, around: Around) => Behavior
