import { measure } from '@fusion.dev/helix-core/capabilities/measure'
import type { Easing, Frame, Transition } from '@fusion.dev/helix-core/capabilities/types'
import { indicatorHost } from '@fusion.dev/helix-core/machines/indicator/host'
import * as indicator from '@fusion.dev/helix-core/machines/indicator/indicator.generated'
import type {
  IndicatorContext,
  IndicatorInput,
  Placement,
  Surface,
} from '@fusion.dev/helix-core/machines/indicator/machine'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { HostInstance, LayoutChangeEvent } from 'react-native'
import { layoutChanged } from '../capabilities/measure'
import { useMotion } from '../drivers/motion'
import type { MachineUse } from '../ir.generated'
import { useAround } from '../render/around'
import { type Behavior, type PartBinding, type Props, STILL } from '../render/behavior'
import { contextOf } from '../render/element'
import { useReducedMotion } from '../render/motion'
import { direction } from '../render/styles'
import type { Family, Node } from '../style/form'
import type { Resolved, Style } from '../style/resolved'
import { style } from '../style/style'
import { type Theme, useTheme } from '../theme/theme'
import type { Member } from './collection'
import { boundTo } from './props'
import { useMachine } from './use-machine'

/** Resolves a part of the element's style, with the lengths a placement measures where given. */
type Resolve = (part: string, measured?: Readonly<Record<string, number>>) => Resolved

/** The easing tokens a transition names, by their names after `easing-`. */
const EASINGS: readonly Easing[] = [
  'accelerate',
  'decelerate',
  'emphasized',
  'linear',
  'spring',
  'standard',
]

/** The style properties a frame moves, and the field of the frame each one is. */
const FIELDS = [
  ['height', 'height'],
  ['translateX', 'x'],
  ['translateY', 'y'],
  ['width', 'width'],
] as const

/**
 * The part state a style is read in: placed, as the mark is wherever it is
 * drawn or travels. The box around the mark is read in it too, and no rule
 * reads it there.
 */
const PLACED = { 'data-placed': true }

/**
 * A placement as the lengths the mark's style reads, by the custom properties
 * the web writes them as: `--indicator-x` and its kind.
 */
const measuredAt = (at: Placement): Readonly<Record<string, number>> => ({
  'indicator-block-size': at.block,
  'indicator-inline-size': at.inline,
  'indicator-x': at.x,
  'indicator-y': at.y,
})

/** The frame a style draws: each of its size and its offset that is a number of points. */
const frameOf = (drawn: Style): Frame => {
  const frame: Record<string, number> = {}
  for (const [property, field] of FIELDS) {
    const value = drawn[property]
    if (typeof value === 'number') {
      frame[field] = value
    }
  }
  return frame
}

/**
 * The transition the mark's style gives its offset. Its curve is named by
 * the easing token the theme resolves to that curve, and is `standard` where
 * none does. A style that moves no offset travels at once.
 */
const transitionOf = (resolved: Resolved, tokens: Theme['tokens']): Transition => {
  const move = resolved.transitions.translateX
  if (move === undefined) {
    return { duration: 0, easing: 'standard' }
  }
  const easing =
    move.easing === 'linear'
      ? 'linear'
      : (EASINGS.find((name) => tokens[`easing-${name}`] === move.easing) ?? 'standard')
  return { duration: move.duration, easing }
}

/**
 * The box nearest `part` that holds it, which a part placed absolutely is
 * placed against, or `undefined` where `part` is not in `tree`.
 */
const holderOf = (
  tree: readonly Node[] | undefined,
  part: string,
  around = 'host',
): string | undefined => {
  for (const node of tree ?? []) {
    if (node.name === part) {
      return around
    }
    const inner = holderOf(node.children, part, node.kind === 'box' ? node.name : around)
    if (inner !== undefined) {
      return inner
    }
  }
  return undefined
}

/** A border's width, where a style gives one. */
const widthOf = (value: number | string | undefined): number =>
  typeof value === 'number' ? value : 0

/**
 * What the surface's box does not say. The view a scrolling part lays its
 * content out in has no border, its part's border being drawn by the frame
 * around it.
 */
const edgesOf = (around: Resolved): Pick<Surface, 'borderLeft' | 'borderTop' | 'direction'> => {
  const { borderLeftWidth, borderTopWidth, borderWidth } = around.style
  const bordered = around.scrolls === undefined
  return {
    borderLeft: bordered ? widthOf(borderLeftWidth ?? borderWidth) : 0,
    borderTop: bordered ? widthOf(borderTopWidth ?? borderWidth) : 0,
    direction: direction(),
  }
}

/** The view an item is drawn in, where it is drawn. */
const nodeOf = (member: Member | undefined): HostInstance | null =>
  (member?.node?.() as HostInstance | null | undefined) ?? null

/** The items as a string that changes when one is added, removed, moved, or given new words. */
const signature = (members: readonly Member[]): string =>
  members.map((member) => `${member.value}\u0000${member.words}`).join('\u0001')

/**
 * Resolves the element's parts as the renderer does, under the theme, the
 * element around, and the props, with no machine's state: the mark's
 * geometry reads none, and neither does the look of a lifted row.
 */
export const useResolve = (
  family: Family,
  props: Props,
): { resolve: Resolve; tokens: Theme['tokens'] } => {
  const theme = useTheme()
  const outer = useAround()
  const reducedMotion = useReducedMotion()
  const slotted = outer?.children[family.tag] ?? outer?.children['*']
  const values = { behavior: STILL, family, loaded: false, props }
  const base = contextOf(values, outer, slotted, reducedMotion, theme)
  const resolve: Resolve = (part, measured = {}) =>
    style(family, part, { ...base, measured, part: PLACED })
  return { resolve, tokens: theme.tokens }
}

/**
 * The view the mark is placed against, and the binding that hands it over.
 * **A part that scrolls hands over the view its content is laid out in**,
 * through `contentRef`, and reports its size itself. Any other part hands
 * over its own view, and reports its size from `onLayout`.
 */
const useSurface = (scrolls: boolean) => {
  const held = useRef<HostInstance | null>(null)
  const [node, setNode] = useState<HostInstance | null>(null)
  const hold = useCallback((next: HostInstance | null) => {
    held.current = next
    setNode(next)
  }, [])
  const sized = useCallback((event: LayoutChangeEvent) => {
    if (held.current !== null) {
      layoutChanged(held.current, event.nativeEvent.layout)
    }
  }, [])
  const binding: PartBinding = scrolls
    ? { view: { contentRef: hold } }
    : { view: { onLayout: sized, ref: hold } }
  return { binding, node }
}

/**
 * Hosts the indicator on a set, as the expansion binds it: the mark, the
 * part the use names `mark`. `members` are the set's items and `chosen` says
 * which is chosen.
 *
 * **The mark is placed against the box that holds it**, as an absolutely
 * placed view is: the view a scrolling box lays its content out in, so the
 * mark scrolls with the items, or else the box's own view. The motion
 * driver moves it, so its binding asks to be drawn as Reanimated's view.
 *
 * **The mark's style says how it is drawn at a placement.** It is read with
 * the placement as the lengths the web writes, and its width, its height,
 * and its offset make the frame the mark glides to, as a line under a tab
 * takes the tab's width at the tab's bottom edge. Its offset's transition is
 * the glide's.
 *
 * **The set measures again for anything that may have moved the chosen
 * item**: a new choice, an item added, removed, moved, or given new words,
 * and a change of size in the chosen item or in the surface. Whether the
 * mark shows is its part's `data-placed`, which its style reads.
 */
export const useIndicator = (
  family: Family,
  props: Props,
  use: MachineUse,
  members: readonly Member[],
  chosen: (value: string) => boolean,
): Behavior => {
  const mark = boundTo(use, 'mark', 'part') ?? ''
  const holder = holderOf(family.tree, mark) ?? 'host'
  const { resolve, tokens } = useResolve(family, props)
  const around = resolve(holder)
  const surface = useSurface(around.scrolls !== undefined)
  const edges = edgesOf(around)
  const item = members.find((member) => member.chooses && chosen(member.value))
  const reduced = useReducedMotion()
  const moving = useMotion()
  const [shown, setShown] = useState(false)
  const drawn = useRef<HostInstance | null>(null)
  /* What the host reads, as this render has it, and the machine's `send`. */
  const latest = useRef({ edges, item, resolve, surface: surface.node, tokens })
  latest.current = { edges, item, resolve, surface: surface.node, tokens }
  const sending = useRef<(event: number, input: IndicatorInput) => void>(() => undefined)
  /* One host for the life of the element, which keeps the travel it listens for. */
  const [host] = useState(() =>
    indicatorHost<HostInstance>({
      chosen: () => nodeOf(latest.current.item),
      edges: () => latest.current.edges,
      frame: (at) => frameOf(latest.current.resolve(mark, measuredAt(at)).style),
      landed: (token) => sending.current(indicator.EVENT_LANDED, { token }),
      mark: () => drawn.current,
      measured: (measurement, token) =>
        sending.current(indicator.EVENT_MEASURED, { measurement, token }),
      show: setShown,
      surface: () => latest.current.surface,
      transition: () => transitionOf(latest.current.resolve(mark), latest.current.tokens),
    }),
  )
  const seed: IndicatorContext = {
    asked: 0,
    at: null,
    reduced,
    shown: false,
    token: 0,
    travel: 0,
  }
  const { revise, send } = useMachine(indicator, seed, host, () => true)
  sending.current = send
  const change = useCallback(() => send(indicator.EVENT_CHANGE, {}), [send])

  useLayoutEffect(() => {
    revise((context) => ({ ...context, reduced }))
  }, [reduced, revise])
  const against = surface.node
  useLayoutEffect(
    () => (against === null ? undefined : measure().observe(against, change)),
    [change, against],
  )
  const itemNode = nodeOf(item)
  useLayoutEffect(
    () => (itemNode === null ? undefined : measure().observe(itemNode, change)),
    [change, itemNode],
  )
  const value = item?.value ?? ''
  const shape = signature(members)
  // biome-ignore lint/correctness/useExhaustiveDependencies: each is a change that may move the chosen item, which the effect measures again for.
  useLayoutEffect(() => {
    change()
  }, [change, against, shape, value])

  const { ref: register } = moving
  const hold = useCallback(
    (node: HostInstance | null) => {
      drawn.current = node
      if (node === null) {
        return undefined
      }
      const release = register(node)
      return () => {
        drawn.current = null
        if (typeof release === 'function') {
          release()
        }
      }
    },
    [register],
  )
  return {
    marks: [],
    parts: {
      [holder]: surface.binding,
      [mark]: {
        animated: true,
        states: { 'data-placed': shown },
        view: { ref: hold, style: moving.style },
      },
    },
  }
}
