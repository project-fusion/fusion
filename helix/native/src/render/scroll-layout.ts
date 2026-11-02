/**
 * What a part that scrolls works out before it draws: which of its style goes
 * to its frame and which to its content, the width its words wrap at, where its
 * scroll buttons hold, and how its scroll view takes a touch.
 */
import type { Node } from '../style/form'
import type { Snap, Style, Transition } from '../style/resolved'

/** The style a scroll view's content takes, which its frame does not. */
const CONTENT = new Set([
  'alignContent',
  'alignItems',
  'columnGap',
  'flexDirection',
  'flexWrap',
  'gap',
  'justifyContent',
  'padding',
  'paddingBottom',
  'paddingEnd',
  'paddingHorizontal',
  'paddingStart',
  'paddingTop',
  'paddingVertical',
  'rowGap',
])

/** A scrolling part's style as what its frame takes and what its content takes. */
export const parted = (box: Style): readonly [frame: Style, content: Style] => {
  const frame: Record<string, number | string> = {}
  const content: Record<string, number | string> = {}
  for (const [key, each] of Object.entries(box)) {
    if (CONTENT.has(key)) {
      content[key] = each
    } else {
      frame[key] = each
    }
  }
  return [frame, content]
}

/** A length in points a content style sets, or nothing where it sets none or a share. */
const pointsOf = (style: Style, ...keys: readonly string[]): number | undefined => {
  for (const key of keys) {
    const set = style[key]
    if (typeof set === 'number') {
      return set
    }
  }
  return undefined
}

/**
 * The width words wrap at inside a part that scrolls both ways: its frame,
 * less the padding at each side of its content, as the web wraps a paragraph
 * at the scroll box's content width.
 */
export const wrapWidth = (frame: number | undefined, content: Style): number | undefined => {
  if (frame === undefined) {
    return undefined
  }
  const start = pointsOf(content, 'paddingStart', 'paddingHorizontal', 'padding')
  const end = pointsOf(content, 'paddingEnd', 'paddingHorizontal', 'padding')
  return Math.max(0, frame - (start ?? 0) - (end ?? 0))
}

/** Whether a node is a scroll button, or a `when` holding one, which the frame holds over the content. */
export const isControl = (node: Node): boolean =>
  node.kind === 'when'
    ? (node.children ?? []).some(isControl)
    : node.kind === 'pressable' && typeof node.attributes?.scrolls === 'string'

/** Where a scroll button holds: the edge it scrolls toward, over what passes under it. */
export const controlEdge = (
  toward: 'end' | 'start',
  axis: 'x' | 'y' = 'x',
): Readonly<Record<string, number | string>> => ({
  position: 'absolute',
  zIndex: 1,
  ...(axis === 'x'
    ? { bottom: 0, top: 0, [toward]: 0 }
    : { left: 0, right: 0, [toward === 'start' ? 'top' : 'bottom']: 0 }),
})

/** The transitions a frame takes, where its part has any. */
export const movesOf = (
  transitions: Readonly<Record<string, Transition>> | undefined,
): { readonly transitions?: Readonly<Record<string, Transition>> } =>
  transitions === undefined ? {} : { transitions }

/**
 * Whether content that scrolls is laid out at the frame's width, as `useSpread`
 * says: content across, unless its part hugs it or snaps, whose content is as
 * long as the boxes in it make it.
 */
export const spreads = (
  axis: 'both' | 'x' | 'y',
  hugs: boolean | undefined,
  snap: Snap | undefined,
): boolean => axis === 'x' && hugs !== true && snap === undefined

/** The scroll view's style: it fills its frame, unless its part hugs its content. */
export const growing = (hugs: boolean | undefined) => ({ flexGrow: hugs === true ? 0 : 1 })

/**
 * What a part that may take no touch between what it holds gives its scroll
 * view: `box-none` on its content, on the scroll view while nothing scrolls,
 * and no scrolling then, so nothing bounces under a finger.
 */
export const passingThrough = (
  pointerEvents: unknown,
  more: { readonly end: boolean; readonly start: boolean },
  locked: boolean,
) => {
  const passes = pointerEvents === 'box-none'
  const still = passes && !more.end && !more.start
  return {
    content: passes ? { pointerEvents: 'box-none' as const } : {},
    scrollEnabled: !locked && !still,
    scroller: still ? { pointerEvents: 'box-none' as const } : {},
  }
}
