/**
 * What a layer's machine reads of its element at one render: its node, the
 * props its attributes bind or the values written on it, and whether it is a
 * sheet in the window it is drawn in.
 */
import { presentedAs, SHEET_BELOW } from '@fusion.dev/helix-core/layers'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { Family, Node } from '../style/form'
import { useTheme } from '../theme/theme'
import { valued } from './gives'
import { type ClosedBy, closedByOf, type Placement, placementOf } from './layering'
import { boundTo } from './props'

/** The node a layer's machine is bound to, by its part. */
export const layerNode = (nodes: readonly Node[], part: string): Node | undefined => {
  for (const node of nodes) {
    if (node.kind === 'layer' && node.name === part) {
      return node
    }
    const inside = layerNode(node.children ?? [], part)
    if (inside !== undefined) {
      return inside
    }
  }
  return undefined
}

/**
 * An attribute written on the node, or the string a prop's value picks for
 * it, as a tooltip's `presses` is `none` under `persist`.
 */
const picked = (family: Family, props: Props, written: unknown): unknown => {
  if (typeof written !== 'object' || written === null || !('pick' in written)) {
    return written
  }
  const { otherwise, pick, values } = written as {
    readonly otherwise?: unknown
    readonly pick?: unknown
    readonly values?: Readonly<Record<string, unknown>>
  }
  const by = valued(family, props, typeof pick === 'string' ? pick : undefined)
  const key = typeof by === 'boolean' ? String(by) : by
  return typeof key === 'string' && values !== undefined && key in values ? values[key] : otherwise
}

/** What a machine bound before the layer computes under a name, where one does. */
type Stated = (name: string) => unknown

/**
 * What one of a layer's attributes says: what a machine bound before it
 * computes under the name it binds, the prop it binds, as the element was
 * given it, or the value written on the node.
 */
const said = (
  family: Family,
  props: Props,
  use: MachineUse,
  name: string,
  node?: Node,
  stated?: Stated,
) => {
  const prop = boundTo(use, name, 'prop')
  if (prop === undefined) {
    return picked(family, props, node?.attributes?.[name])
  }
  return stated?.(prop) ?? valued(family, props, prop)
}

/** What a press drawn in a layer's anchor does to it, as its `presses` says. */
export type Presses = 'close' | 'none' | 'toggle'

/** `presses` where it names one of the three, and `none` otherwise. */
const pressesOf = (asked: unknown): Presses =>
  asked === 'close' || asked === 'toggle' ? asked : 'none'

/** Where focus goes as a layer its anchor opens closes, as its `returns` says. */
export type Returns = 'always' | 'dismissed' | 'held'

/** `returns` where it names one of the three, and `always` otherwise. */
const returnsIn = (asked: unknown): Returns =>
  asked === 'dismissed' || asked === 'held' ? asked : 'always'

/** Where focus goes as a layer opens, as its `enters` says. */
export type Enters = 'always' | 'down' | 'press'

/** `enters` where it names one of the three, and `always` otherwise. */
const entersOf = (asked: unknown): Enters =>
  asked === 'down' || asked === 'press' ? asked : 'always'

/** A number an attribute says, or `fallback` where it says none. */
const numberOf = (value: unknown, fallback: number): number => {
  const read = Number(value ?? fallback)
  return Number.isFinite(read) ? read : fallback
}

/** What a layer reads of its element. */
export interface LayerRead {
  /** The part it is placed against, where it names one. */
  readonly anchorPart?: string | undefined
  /** Whether Down and Up on a press in its anchor open it. */
  readonly arrows: boolean
  readonly closedBy: ClosedBy
  /** How far it slides along the side it stands on, in points. */
  readonly crossOffset: number
  /** Whether it turns to the other side of its anchor where its own has no room. */
  readonly flip: boolean
  /** Whether it stands under its anchor across the whole window, as a megamenu's band does. */
  readonly band: boolean
  /**
   * Whether focus enters it as it opens however it opened, `always`, only
   * as a press or a key in its anchor opens it, `press`, as a menu's does,
   * or only on Down on a press in its anchor, `down`, as a megamenu's does.
   */
  readonly enters: Enters
  /**
   * Whether closing gives focus to the anchor however it closed, `always`,
   * only where the layer held focus, `held`, as a menu's does, or only where
   * a reader dismissed it, `dismissed`, as a megamenu's does.
   */
  readonly returns: Returns
  /** The words it describes each press in its anchor with, where it is a tooltip that names them. */
  readonly hint?: string | undefined
  /** Whether a long press on a press in its anchor opens it, as that press's own. */
  readonly holds: boolean
  readonly modal: boolean
  readonly node?: Node | undefined
  readonly notice: boolean
  /** Its distance from its anchor, in points. */
  readonly offset: number
  /** Whether its prop or its node says it stands open, where no toggle holds it. */
  readonly open: boolean
  readonly part: string
  /**
   * Whether it is placed against an anchor part or a registered target: a
   * `target` that holds no id, as a dialog stop's, places it in the window.
   */
  readonly placedAgainst: boolean
  readonly placement: Placement
  /**
   * The presentation it asks for, where it is an anchored layer that names
   * one: `auto`, `popover`, or `sheet`. Absent for any other layer, which is
   * never a sheet.
   */
  readonly presentation?: unknown
  /** What a press drawn in its anchor does to it. */
  readonly presses: Presses
  /** The id of the registered view it is placed against, where its `target` holds one. */
  readonly target?: string | undefined
  /** Whether its `target` binds a prop. */
  readonly targeting: boolean
}

/**
 * Reads a layer of `family`, as `use` binds it, under `props`, and what the
 * machines bound before it compute under the names its attributes bind.
 */
export const readLayer = (
  family: Family,
  props: Props,
  use: MachineUse,
  stated?: Stated,
): LayerRead => {
  const part = boundTo(use, 'part', 'part') ?? ''
  const anchorPart = boundTo(use, 'anchor', 'part')
  const node = layerNode(family.tree ?? [], part)
  const read = (name: string) => said(family, props, use, name, node, stated)
  const targetProp = boundTo(use, 'target', 'prop')
  const target = targetProp === undefined ? undefined : read('target')
  const placedAgainst =
    anchorPart !== undefined || (targetProp !== undefined && target !== '' && target !== undefined)
  const modal = read('modal') === true
  const presents =
    placedAgainst &&
    (boundTo(use, 'presentation', 'prop') !== undefined ||
      node?.attributes?.presentation !== undefined)
  const hint = read('hint')
  return {
    anchorPart,
    arrows: read('arrows') === true,
    band: node?.attributes?.band === true,
    closedBy: closedByOf(read('closedby'), modal),
    crossOffset: numberOf(read('cross-offset'), 0),
    enters: entersOf(read('enters')),
    flip: read('flip') !== false,
    hint: typeof hint === 'string' ? hint : undefined,
    holds: read('holds') === true,
    modal,
    node,
    notice: node?.attributes?.notice === true,
    offset: numberOf(read('offset'), 0),
    open: read('open') === true,
    part,
    placedAgainst,
    placement: placementOf(read('placement')),
    returns: returnsIn(read('returns')),
    ...(presents ? { presentation: read('presentation') ?? 'auto' } : {}),
    presses: pressesOf(read('presses')),
    target: typeof target === 'string' ? target : undefined,
    targeting: targetProp !== undefined,
  }
}

/**
 * Whether a layer that asks for `presentation` is a sheet in a window
 * `width` points wide: under `auto` where the window is narrower than 30rem
 * at the reader's text size, as a media query's rem is the reader's font
 * size on the web. A layer that asks for none is never one.
 */
export const useSheet = (presentation: unknown, width: number): boolean => {
  const { rem } = useTheme()
  if (presentation === undefined) {
    return false
  }
  return presentedAs(presentation, width < Number.parseFloat(SHEET_BELOW) * rem) === 'sheet'
}
