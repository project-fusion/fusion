/**
 * A stack of messages and each message in it, as a toast's region holds its
 * toasts: `notices` on the element that holds them, and `notice` on each.
 *
 * **The stack is a context its messages join**, carried into the layer the
 * stack draws them in, since a phone has no parent to read. A message joins
 * as it is first drawn, so the stack knows its messages in the order React
 * draws them, as the web reads its children in document order.
 *
 * - **It stands open while it holds a message**: its layer's `open` reads
 *   `showing`, which holds while a message is passed into it, whether it
 *   shows, waits, or has closed and the page still passes it in, so a
 *   message's exit is never cut short by the layer leaving.
 * - **Past `max` open messages, a message waits**, in the order they were
 *   drawn, until one before it closes, as the web's `max-visible` holds them
 *   back, and a waiting message's clock has not started.
 * - **A touch on any message holds every message's clock**, as the web's
 *   region holds them all while a pointer is in it.
 * - **A swipe dismisses a message toward the edge `toward` names**, the end
 *   of the line unless it names another, with the drawer's swipe driver on
 *   the message's part: past halfway, or quickly, it asks the message's
 *   toggle to close, and a refused close springs it back.
 * - **The stack hears its messages' `hears` event** after each message's
 *   own handler, with the same event, so a handler on the stack refuses the
 *   message's dismissal, as the web's event bubbles to its region.
 */
import { swipeEdge } from '@fusion.dev/helix-core/swipe'
import {
  Children,
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { GestureDetector } from 'react-native-gesture-handler'
import Animated from 'react-native-reanimated'
import { useSwipe } from '../drivers/swipe'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { carryIntoLayers } from '../render/carry'
import { direction } from '../render/styles'
import type { Family } from '../style/form'
import { boundTo, given, handlerOf } from './props'
import type { Turned } from './toggle'

/** What a message tells the stack of itself. */
interface Member {
  /** Whether it stands open: not dismissed. */
  readonly open: () => boolean
}

/** What the stack gives the messages drawn in it. */
export interface NoticeStack {
  /** Holds every message's clock, as a touch on one does, until `release`. */
  readonly hold: () => void
  /**
   * Joins the stack, in the order messages first draw, and tells nobody:
   * the message tells the stack once it has drawn, through `changed`.
   */
  readonly join: (key: object, member: Member) => void
  /** Leaves the stack, as a message the page takes out does. */
  readonly leave: (key: object) => void
  /** Hears the stack change, until stopped. */
  readonly listen: (heard: () => void) => () => void
  /** Whether a touch holds the clocks now. */
  readonly held: () => boolean
  /** The event of its messages the stack hears, and the handler that hears it on the stack. */
  readonly hear: (name: string, event: unknown) => void
  /** The event the stack hears, where it hears one. */
  readonly hears: string | undefined
  /** Lets the clocks go once every hold is let go. */
  readonly release: () => void
  /** Tells the messages a member changed. */
  readonly changed: () => void
  /** The edge a swipe dismisses toward: `end`, `start`, `top`, or `bottom`. */
  readonly toward: () => string
  /** Whether the stack holds this message back past its `max`. */
  readonly waits: (key: object) => boolean
}

/** The stack a message is drawn in, where it is drawn in one. */
export const NoticesContext = createContext<NoticeStack | undefined>(undefined)
carryIntoLayers(NoticesContext)

/** The edges a swipe takes. */
const EDGES: readonly string[] = ['bottom', 'end', 'start', 'top']

/** Makes a stack that reads its props through `latest`. */
const makeStack = (latest: {
  readonly current: {
    readonly max: number | undefined
    readonly props: Props
    readonly toward: string
  }
}): NoticeStack => {
  const members = new Map<object, Member>()
  const heard = new Set<() => void>()
  let holds = 0
  const tell = () => {
    for (const hear of [...heard]) {
      hear()
    }
  }
  return {
    changed: tell,
    hear: (name, event) => {
      const listener = latest.current.props[handlerOf(name)]
      if (typeof listener === 'function') {
        listener(event)
      }
    },
    hears: undefined,
    held: () => holds > 0,
    hold: () => {
      holds += 1
      if (holds === 1) {
        tell()
      }
    },
    join: (key, member) => {
      members.set(key, member)
    },
    leave: (key) => {
      if (members.delete(key)) {
        tell()
      }
    },
    listen: (hear) => {
      heard.add(hear)
      return () => {
        heard.delete(hear)
      }
    },
    release: () => {
      holds = Math.max(0, holds - 1)
      if (holds === 0) {
        tell()
      }
    },
    toward: () => latest.current.toward,
    waits: (key) => {
      const max = latest.current.max
      if (max === undefined || max < 0) {
        return false
      }
      let before = 0
      for (const [one, member] of members) {
        if (one === key) {
          return before >= max
        }
        if (member.open()) {
          before += 1
        }
      }
      return false
    },
  }
}

/** A count from a prop, which may be words: `2` or `'2'`. */
const countOf = (value: unknown): number | undefined => {
  const count = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof count === 'number' && Number.isFinite(count) ? count : undefined
}

/**
 * Hosts the stack an element that declares `notices` holds: the state
 * `showing` names, and the context its messages join through.
 */
export const useNotices = (family: Family, props: Props, use: MachineUse): Behavior => {
  const toward = given(family, props, boundTo(use, 'toward', 'prop'))
  const latest = useRef({
    max: countOf(given(family, props, boundTo(use, 'max', 'prop'))),
    props,
    toward: typeof toward === 'string' && EDGES.includes(toward) ? toward : 'end',
  })
  latest.current = {
    max: countOf(given(family, props, boundTo(use, 'max', 'prop'))),
    props,
    toward: typeof toward === 'string' && EDGES.includes(toward) ? toward : 'end',
  }
  const [stack] = useState(() => ({ ...makeStack(latest), hears: boundTo(use, 'hears', 'event') }))
  /* The messages read the stack's `max` and its edge again as they change. */
  const said = `${latest.current.max ?? ''} ${latest.current.toward}`
  const was = useRef(said)
  useLayoutEffect(() => {
    if (was.current !== said) {
      was.current = said
      stack.changed()
    }
  })
  const showing = boundTo(use, 'showing', 'state') ?? 'showing'
  return {
    marks: [],
    parts: {
      host: { states: { [showing]: Children.toArray(props.children as ReactNode).length > 0 } },
    },
    provide: (drawn: ReactNode) => (
      <NoticesContext.Provider value={stack}>{drawn}</NoticesContext.Provider>
    ),
  }
}

/** The stack a message of `family` is drawn in, where its source declares a `notice`. */
export const useNoticeStack = (family: Family): NoticeStack | undefined => {
  const stack = useContext(NoticesContext)
  return family.api?.notice === undefined ? undefined : stack
}

/**
 * A message's props with the stack's handler beside its own for the event
 * the stack hears: the message's handler first, then the stack's, with the
 * same event, so either may refuse it.
 */
export const heardBy = (stack: NoticeStack | undefined, props: Props): Props => {
  const name = stack?.hears
  if (stack === undefined || name === undefined) {
    return props
  }
  const handler = handlerOf(name)
  const own = props[handler]
  return {
    ...props,
    [handler]: (event: unknown) => {
      if (typeof own === 'function') {
        own(event)
      }
      stack.hear(name, event)
    },
  }
}

/** Whether a stack's clocks are held now, kept current as a touch holds them and lets go. */
export const useStackHeld = (stack: NoticeStack | undefined): boolean =>
  useSyncExternalStore(
    (changed) => stack?.listen(changed) ?? (() => {}),
    () => stack?.held() ?? false,
  )

/**
 * Hosts one message of the stack around it: the state it waits in, the hold
 * a touch on it makes on every message's clock, and the swipe on its part.
 */
export const useNotice = (use: MachineUse, toggled: Turned | undefined): Behavior => {
  const stack = useContext(NoticesContext)
  const key = useRef({}).current
  const open = toggled?.checked ?? true
  const now = useRef(open)
  now.current = open
  /* Joined as it first draws, so a message drawn after another reads it,
     and the others told once it has drawn. */
  stack?.join(key, { open: () => now.current })
  useLayoutEffect(() => stack?.changed(), [stack])
  const waiting = useSyncExternalStore(
    (changed) => stack?.listen(changed) ?? (() => {}),
    () => stack?.waits(key) ?? false,
  )
  const toward = useSyncExternalStore(
    (changed) => stack?.listen(changed) ?? (() => {}),
    () => stack?.toward() ?? 'end',
  )
  const was = useRef(open)
  useLayoutEffect(() => {
    if (was.current !== open) {
      was.current = open
      stack?.changed()
    }
  })
  useLayoutEffect(() => () => stack?.leave(key), [key, stack])
  const touching = useRef(false)
  const hold = () => {
    if (!touching.current) {
      touching.current = true
      stack?.hold()
    }
  }
  const release = () => {
    if (touching.current) {
      touching.current = false
      stack?.release()
    }
  }
  const releasing = useRef(release)
  releasing.current = release
  useLayoutEffect(() => () => releasing.current(), [])
  const latest = useRef(toggled)
  latest.current = toggled
  const swiping = useSwipe({
    edge: swipeEdge(toward as 'bottom' | 'end' | 'start' | 'top', direction() === 'rtl'),
    enabled: open && !waiting,
    open,
    points: undefined,
    settle: (shown) => {
      if (shown === 0) {
        latest.current?.turn()
      }
      return true
    },
  })
  const part = boundTo(use, 'part', 'part') ?? 'item'
  const state = boundTo(use, 'waiting', 'state') ?? 'waiting'
  return {
    marks: [],
    parts: {
      host: {
        states: { [state]: waiting },
        view: { onTouchCancel: release, onTouchEnd: release, onTouchStart: hold },
      },
      [part]: {
        wrap: (view: ReactNode) => (
          <GestureDetector gesture={swiping.gesture}>
            <Animated.View collapsable={false} onLayout={swiping.measure} style={swiping.style}>
              {view}
            </Animated.View>
          </GestureDetector>
        ),
      },
    },
  }
}
