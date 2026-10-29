import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import type { KeyPress, Stop } from '@fusion.dev/helix-core/capabilities/types'
import { formatPercent } from '@fusion.dev/helix-core/numbers'
import {
  type SplitterBounds,
  type SplitterPane,
  snapTo,
  splitterBounds,
  splitterCanShut,
  splitterClamp,
  splitterPercent,
  splitterShutAt,
  splitterSliver,
  splitterSnaps,
  splitterTravel,
} from '@fusion.dev/helix-core/splitter'
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import type { AccessibilityActionEvent, LayoutChangeEvent } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import { useFocusVisible } from '../capabilities/focus-visible'
import { useResize } from '../drivers/resize'
import type { MachineUse } from '../ir.generated'
import type { Behavior, PartBinding, Props } from '../render/behavior'
import { direction } from '../render/styles'
import type { Family } from '../style/form'
import { useTheme } from '../theme/theme'
import { boundTo, camel, given, tell } from './props'

/** The actions a screen reader moves a divider by, as iOS's swipe up and down and TalkBack's volume keys take them. */
const ACTIONS = [
  { label: 'increment', name: 'increment' },
  { label: 'decrement', name: 'decrement' },
] as const

/** The inline length under which `orientation="auto"` stacks the panes, in points, as on the web. */
export const STACK_BELOW = 512

/** How far past the line, in points, a finger still takes hold of the divider. */
const REACH = 12

/** A number a prop holds, written or as text, where it holds one. */
const numberIn = (value: unknown): number | undefined => {
  const read = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof read === 'number' && Number.isFinite(read) ? read : undefined
}

/** Which pane a prop says is shut, if either. */
const paneIn = (value: unknown): SplitterPane | undefined =>
  value === 'start' || value === 'end' ? value : undefined

/** Where the divider stands and which pane is shut, as the machine holds them. */
interface Held {
  /** Which pane is shut, `none` where a choice opened both, `undefined` where nothing chose. */
  readonly collapsed: 'none' | SplitterPane | undefined
  /** Where the divider stands, `undefined` until something sets it. */
  readonly position: number | undefined
  /** Where a drag has carried the divider, drawn until the next move or setting. */
  readonly reached: number | undefined
}

/** What a split reads at one render, which its handlers read as it stands. */
interface Split {
  readonly bounds: SplitterBounds
  readonly collapsible: unknown
  readonly dragging: boolean
  readonly events: Readonly<
    Record<'before' | 'change' | 'closing' | 'collapse' | 'input', string | undefined>
  >
  readonly extent: number
  readonly held: Held
  readonly position: number
  readonly primary: SplitterPane | undefined
  readonly props: Props
  readonly seed: number
  readonly shut: SplitterPane | undefined
  readonly sliver: number
  readonly step: number
  readonly vertical: boolean
}

/** Sends an event where the element sends it, saying whether it stands. */
type Send = (event: string | undefined, detail: Readonly<Record<string, unknown>>) => boolean

/** Holds a change over what the machine holds. */
type Keep = (next: Partial<Held>) => void

/** Where a gesture began, and where a pane it shuts opens back to. */
interface Gesture {
  readonly began?: number
  readonly opened?: number
}

/** Which pane stands shut: the one held, or the seed's where nothing chose. */
const shutOf = (held: Held, seeded: unknown): SplitterPane | undefined => {
  if (held.collapsed === undefined) {
    return paneIn(seeded)
  }
  return held.collapsed === 'none' ? undefined : held.collapsed
}

/** Where the divider stands: at a shut pane's collapsed size, or where it is held, bounded. */
const positionOf = (split: Pick<Split, 'bounds' | 'held' | 'seed' | 'shut' | 'sliver'>): number => {
  if (split.shut !== undefined) {
    return split.shut === 'start' ? split.sliver : 100 - split.sliver
  }
  return splitterClamp(split.held.position ?? split.seed, split.bounds)
}

/** Asks for the divider at `wanted`, moving it and sending `input` and `change` where it stands. */
const askResize = (at: Split, wanted: number, send: Send, keep: Keep): void => {
  const value = String(wanted)
  if (!send(at.events.before, { value })) {
    return
  }
  keep({ position: wanted, reached: undefined })
  if (wanted !== at.position) {
    send(at.events.input, {})
  }
  send(at.events.change, { value })
}

/** Asks for `closes` to be the pane shut, putting the divider back where it opened from. */
const askCollapse = (
  at: Split,
  closes: SplitterPane | undefined,
  opened: number | undefined,
  send: Send,
  keep: Keep,
): void => {
  const value = closes ?? ''
  if (!send(at.events.closing, { value })) {
    return
  }
  keep({
    collapsed: closes ?? 'none',
    ...(closes !== undefined && opened !== undefined ? { position: opened } : {}),
  })
  send(at.events.collapse, { value })
}

/**
 * Settles the divider at `next`: asks with `before` where it moved, and
 * with `closing` where the pane it lands on the edge of shuts or opens,
 * each standing or refused on its own. A gesture that moved nothing sends
 * nothing.
 */
const settleSplit = (at: Split, gesture: Gesture, next: number, send: Send, keep: Keep): void => {
  const wanted = splitterClamp(next, at.bounds)
  const closes = splitterShutAt(wanted, at.sliver, at.collapsible)
  const began = gesture.began ?? at.position
  const opened = gesture.opened ?? (at.shut ? undefined : began)
  if (wanted === began && closes === at.shut) {
    return
  }
  askResize(at, wanted, send, keep)
  if (closes !== at.shut) {
    askCollapse(at, closes, opened, send, keep)
  }
}

/**
 * Shuts the start pane, or the end pane where only that one may shut, or
 * opens the one shut: back to where the divider stood, or to the seed where
 * that was the edge.
 */
const toggleSplit = (at: Split, send: Send, keep: Keep): void => {
  const pane: SplitterPane = at.collapsible === 'end' ? 'end' : 'start'
  if (at.shut === undefined && !splitterCanShut(at.collapsible, pane)) {
    return
  }
  const value = at.shut === undefined ? pane : ''
  if (!send(at.events.closing, { value })) {
    return
  }
  const held = splitterClamp(at.held.position ?? at.seed, at.bounds)
  const edge = splitterShutAt(held, at.sliver, at.collapsible) !== undefined
  const reopened = at.shut === undefined ? at.position : edge ? at.seed : at.held.position
  keep({ collapsed: at.shut === undefined ? pane : 'none', position: reopened, reached: undefined })
  send(at.events.collapse, { value })
}

/**
 * Where a key takes the divider: `toggle` for Enter, a position for an
 * arrow along its axis, Home and End, and `undefined` for any other key.
 */
const keyedTo = (key: string, at: Split): number | 'toggle' | undefined => {
  if (key === 'Enter') {
    return 'toggle'
  }
  const toward = splitterTravel(key, at.vertical, !at.vertical && direction() === 'rtl')
  if (toward !== 0) {
    return at.position + toward * at.step
  }
  if (key === 'Home' || key === 'End') {
    return key === 'Home' ? at.bounds.min : at.bounds.max
  }
  return undefined
}

/**
 * Where the divider stands for the `primary` pane to keep its length as
 * the splitter's goes to `length`, or `undefined` where nothing holds it:
 * no `primary`, a pane shut, a drag under way, or no length before.
 */
const primaryAt = (at: Split, length: number): number | undefined => {
  const { primary } = at
  if (primary === undefined || at.shut !== undefined || at.dragging) {
    return undefined
  }
  if (!(at.extent > 0 && length > 0) || length === at.extent) {
    return undefined
  }
  const kept = ((primary === 'start' ? at.position : 100 - at.position) / 100) * at.extent
  const share = (kept / length) * 100
  return primary === 'start' ? share : 100 - share
}

/**
 * Where a drag that has traveled `travel` points from where it began takes
 * the divider, landing on a `snap` place within `threshold` points of it,
 * held to its bounds; `undefined` before the splitter is measured.
 */
const draggedTo = (
  at: Split,
  gesture: Gesture,
  travel: number,
  snap: unknown,
  threshold: unknown,
  rem: number,
): number | undefined => {
  if (!(at.extent > 0)) {
    return undefined
  }
  const raw = (gesture.began ?? at.position) + (travel / at.extent) * 100
  const snaps = splitterSnaps(snap, at.extent, rem)
  const within = ((numberIn(threshold) ?? 12) / at.extent) * 100
  return splitterClamp(snaps.length === 0 ? raw : snapTo(raw, snaps, within), at.bounds)
}

/** Whether `orientation="auto"` stacks a splitter `width` points wide: once it is laid out, under `STACK_BELOW`. */
const stacks = (width: number): boolean => width > 0 && width < STACK_BELOW

/** The `position` and `collapsed` written on the element, and whether `collapsed` is written at all. */
const writtenOf = (
  use: MachineUse,
  props: Props,
): readonly [{ readonly position: number | undefined; readonly shut: unknown }, boolean] => {
  const valueProp = boundTo(use, 'value', 'prop')
  const shutProp = boundTo(use, 'collapsed', 'prop')
  return [
    {
      position: valueProp === undefined ? undefined : numberIn(props[camel(valueProp)]),
      shut: shutProp === undefined ? undefined : props[camel(shutProp)],
    },
    shutProp !== undefined && camel(shutProp) in props,
  ]
}

/**
 * What the machine holds, with a written `position` or `collapsed` taken as
 * it changes, with nothing sent, as a script writing the web element's
 * property is.
 */
const useHeld = (
  written: { readonly position: number | undefined; readonly shut: unknown },
  shutWritten: boolean,
): readonly [Held, (next: Held) => void] => {
  const [held, hold] = useState<Held>(() => ({
    collapsed: shutWritten ? (paneIn(written.shut) ?? 'none') : undefined,
    position: written.position,
    reached: undefined,
  }))
  const writes = useRef(written)
  if (writes.current.position === written.position && writes.current.shut === written.shut) {
    return [held, hold]
  }
  const now: Held = {
    collapsed:
      writes.current.shut === written.shut ? held.collapsed : (paneIn(written.shut) ?? 'none'),
    position: writes.current.position === written.position ? held.position : written.position,
    reached: undefined,
  }
  writes.current = written
  hold(now)
  return [now, hold]
}

/**
 * Hosts the divider of a split a reader moves between two panes, as the
 * expansion binds it: the box whose role is `separator`, the props that
 * hold, seed, and bound where it stands and which pane is shut, and the
 * events a move and a collapse send. **No machine of core's holds it**, as
 * the web element holds its own; core's splitter arithmetic bounds it.
 *
 * **A drag moves the divider with the finger**, sending `input` at each
 * step, and stands as it lets go: `before` asks with where it stopped, and
 * `change` follows. A double tap puts it back at its seed. The arrows along
 * its axis, Home and End, and a screen reader's increment and decrement ask
 * first and move it once allowed. **A divider that lands at an edge a pane
 * may shut at shuts that pane**, asked with `closing`, and `collapse`
 * follows; Enter shuts the start pane, or the end pane where only that one
 * may shut, and opens it again. A shut pane opens back to where the divider
 * stood before it shut. **The `primary` pane keeps its length** as the
 * splitter's own changes.
 */
export const useSplit = (family: Family, props: Props, use: MachineUse): Behavior => {
  const part = boundTo(use, 'part', 'part') ?? ''
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const { rem } = useTheme()
  const [size, measure] = useState({ height: 0, width: 0 })
  const orientation = read('orientation')
  const vertical = orientation === 'vertical' || (orientation === 'auto' && stacks(size.width))
  const extent = vertical ? size.height : size.width
  const [now, hold] = useHeld(...writtenOf(use, props))
  const [dragging, drag] = useState(false)
  const bounds = splitterBounds(
    splitterPercent(read('min'), 0, extent, rem),
    splitterPercent(read('max'), 100, extent, rem),
    splitterPercent(read('reserve'), 0, extent, rem),
  )
  const seed = numberIn(read('seed')) ?? 50
  const sliver = splitterSliver(read('sliver'))
  const shut = shutOf(now, read('shut'))
  const current: Split = {
    bounds,
    collapsible: read('collapsible'),
    dragging,
    events: {
      before: boundTo(use, 'before', 'event'),
      change: boundTo(use, 'change', 'event'),
      closing: boundTo(use, 'closing', 'event'),
      collapse: boundTo(use, 'collapse', 'event'),
      input: boundTo(use, 'input', 'event'),
    },
    extent,
    held: now,
    position: positionOf({ bounds, held: now, seed, shut, sliver }),
    primary: paneIn(read('primary')),
    props,
    seed,
    shut,
    sliver,
    step: numberIn(read('step')) ?? 2,
    vertical,
  }
  const latest = useRef(current)
  latest.current = current
  const gesture = useRef<Gesture>({})

  const send: Send = useCallback(
    (event, detail) => event === undefined || tell(family, latest.current.props, event, detail),
    [family],
  )
  /* What a handler holds stands for the next handler at once, before the next render. */
  const keep: Keep = useCallback(
    (next) => {
      const at = latest.current
      const held = { ...at.held, ...next }
      const closed = shutOf(held, undefined)
      const shutNow = held.collapsed === undefined ? at.shut : closed
      latest.current = {
        ...at,
        held,
        position: positionOf({ ...at, held, shut: shutNow }),
        shut: shutNow,
      }
      hold(held)
    },
    [hold],
  )
  const settle = useCallback(
    (next: number) => {
      const begun = gesture.current
      gesture.current = {}
      settleSplit(latest.current, begun, next, send, keep)
    },
    [keep, send],
  )

  const resizing = useResize({
    drag: (travel) => {
      const at = latest.current
      const wanted = draggedTo(at, gesture.current, travel, read('snap'), read('threshold'), rem)
      if (wanted === undefined) {
        return
      }
      keep({ reached: wanted })
      if (wanted !== at.position) {
        keep({ collapsed: 'none', position: wanted })
        send(at.events.input, {})
      }
    },
    enabled: true,
    press: () => {
      const at = latest.current
      gesture.current = { began: at.position, ...(at.shut ? {} : { opened: at.position }) }
      keep({ reached: undefined })
      drag(true)
    },
    release: () => {
      drag(false)
      settle(latest.current.held.reached ?? latest.current.position)
    },
    reset: () => {
      settle(splitterClamp(seed, latest.current.bounds))
    },
    rtl: !vertical && direction() === 'rtl',
    vertical,
  })

  /* The keys of a hardware keyboard, heard while the divider has focus. */
  const listening = useRef<Stop | undefined>(undefined)
  const focused = useRef<unknown>(null)
  const heard = useCallback(
    (press: KeyPress): boolean => {
      const to = keyedTo(press.key, latest.current)
      if (to === 'toggle') {
        toggleSplit(latest.current, send, keep)
      } else if (to !== undefined) {
        settle(to)
      }
      return to !== undefined
    },
    [keep, send, settle],
  )
  const ref = useCallback(
    (node: unknown) => {
      listening.current?.()
      listening.current = undefined
      focused.current = node
      if (node !== null) {
        listening.current = keys().listen(node, heard)
      }
    },
    [heard],
  )
  const ringed = useFocusVisible(() => focused.current)
  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const at = latest.current
      const by = event.nativeEvent.actionName === 'increment' ? 1 : -1
      settle(at.position + by * at.step)
    },
    [settle],
  )
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height, width } = event.nativeEvent.layout
      const at = latest.current
      const held = primaryAt(at, at.vertical ? height : width)
      if (held !== undefined) {
        keep({ position: held })
      }
      measure((was) => (was.height === height && was.width === width ? was : { height, width }))
    },
    [keep],
  )

  const separator: PartBinding = useMemo(
    () => ({
      states: { focusVisible: ringed },
      view: {
        accessibilityActions: ACTIONS,
        accessibilityRole: 'adjustable',
        accessible: true,
        focusable: true,
        hitSlop: vertical ? { bottom: REACH, top: REACH } : { left: REACH, right: REACH },
        onAccessibilityAction,
        ref,
      },
      wrap: (drawn: ReactNode) => <GestureDetector gesture={resizing}>{drawn}</GestureDetector>,
    }),
    [onAccessibilityAction, ref, resizing, ringed, vertical],
  )
  return {
    marks: [
      ...(dragging ? [boundTo(use, 'dragging', 'state')] : []),
      ...(shut ? [boundTo(use, 'folded', 'state')] : []),
      ...(vertical ? [boundTo(use, 'stacked', 'state')] : []),
    ].filter((mark): mark is string => mark !== undefined),
    parts: {
      [part]: separator,
      host: { states: splitStates(use, current, read('closed')), view: { onLayout } },
    },
  }
}

/**
 * What a split lays over its host for its drawing: where the divider is
 * drawn, whether it stands against an edge with no pane beside it, its
 * bounds and its value as a screen reader hears them, and its words.
 */
const splitStates = (
  use: MachineUse,
  at: Split,
  closed: unknown,
): Readonly<Record<string, string>> => {
  const state = (name: string, value: string): Record<string, string> => {
    const named = boundTo(use, name, 'state')
    return named === undefined ? {} : { [named]: value }
  }
  const shown =
    at.held.reached === undefined ? at.position : splitterClamp(at.held.reached, at.bounds)
  const said = Math.round(shown)
  const flush =
    at.sliver === 0 && splitterShutAt(at.position, at.sliver, at.collapsible) !== undefined
  return {
    /* In points once the splitter is measured: a percentage inside a pane
       that scrolls resolves against what the pane holds on a phone. */
    ...state('basis', at.extent > 0 ? `${(shown / 100) * at.extent}px` : `${shown}%`),
    ...(flush ? state('flush', 'true') : {}),
    ...state('highest', String(at.shut ? 100 : at.bounds.max)),
    ...state('lowest', String(at.shut ? 0 : at.bounds.min)),
    ...state('reading', String(said)),
    ...state(
      'spoken',
      at.shut ? String(closed ?? '') : formatPercent(said / 100, locale().read() || undefined),
    ),
  }
}
