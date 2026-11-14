/**
 * The machine a notification runs on a phone: whether it has been read, what it is
 * called, how it leaves, and a hardware key that moves to the row beside it.
 */
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import { feedStep } from '@fusion.dev/helix-core/notifications'
import { formatMessage } from '@fusion.dev/helix-core/words'
import {
  type Ref,
  type RefObject,
  useCallback,
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { GroupContext, type GroupOffer } from './notification-group'
import { FeedContext, type FeedOffer, type FeedRow } from './notifications'
import { boundTo, given, tell } from './props'
import { wordsOf } from './words'

/** What a page reaches a row by. */
export interface NotificationHandle {
  dismiss(): boolean
  markRead(next?: boolean): boolean
  readonly read: boolean
}

/** A key pressed on a row, as the keys capability hands it. */
interface Pressed {
  readonly alt?: boolean
  readonly control?: boolean
  readonly key: string
  readonly meta?: boolean
}

/** What a row's machines read as it is now, so what they hand out stays one function. */
interface Now {
  readonly feed: FeedOffer | undefined
  readonly props: Props
  readonly words: string
}

/** Moves focus to the row a key lands on, and answers whether the feed took the key. */
const stepped = (
  feed: FeedOffer | undefined,
  key: object,
  node: unknown,
  press: Pressed,
): boolean => {
  if (feed === undefined || press.alt === true || press.meta === true || press.control === true) {
    return false
  }
  const rows = feed.rows().filter((row) => row.drawn())
  const at = rows.findIndex((row) => row.key === key)
  const to = feedStep(press.key, at, rows.length, focus().focused() === node)
  if (to === undefined) {
    return false
  }
  const next = rows[to]?.node()
  if (next !== null && next !== undefined) {
    focus().focus(next, true)
  }
  return true
}

/** Where focus goes as a row leaves: the next row, then the one before. */
const neighborOf = (rows: readonly FeedRow[], key: object): unknown => {
  const at = rows.findIndex((row) => row.key === key)
  const order = [...rows.slice(at + 1), ...rows.slice(0, Math.max(at, 0)).reverse()]
  return order.find((row) => row.drawn())?.node()
}

/** Moves focus to the row beside this one, where focus is on one of `own`. */
const moveOff = (feed: FeedOffer | undefined, key: object, own: readonly unknown[]): void => {
  const held = focus().focused()
  const to = feed === undefined ? undefined : neighborOf(feed.rows(), key)
  if (held !== null && own.includes(held) && to !== null && to !== undefined) {
    focus().focus(to, false)
  }
}

/** The name a dismiss press goes by: `dismiss-label` with the row's words. */
const dismissNameOf = (label: string, words: string): string => {
  if (label.includes('{label}')) {
    return formatMessage(label, { label: words }, locale().read()).trim()
  }
  return words === '' || label.includes(words) ? label : `${label} ${words}`
}

/** What a row reads of its separation: the feed's where it sets none. */
const takenMarks = (own: unknown, feed: FeedOffer | undefined): readonly string[] => {
  const taken = own === undefined ? feed?.separation : undefined
  return taken === 'filled' ? ['feed-filled'] : taken === 'outlined' ? ['feed-outlined'] : []
}

/** Whether nothing refused `detail`, asked of the row and then of the feed. */
const stands = (
  family: Family,
  now: Now,
  event: string | undefined,
  heard: 'beforeRead' | 'dismiss',
  detail: Readonly<Record<string, unknown>>,
): boolean =>
  (event === undefined || tell(family, now.props, event, detail)) &&
  (now.feed?.hear(heard, detail, {}) ?? true)

/** Joins a row to a holder, in its turn, each time the holder asks, and tells it as it leaves. */
const useReports = (holder: GroupOffer | FeedOffer | undefined, row: FeedRow | undefined): void => {
  const now = useRef(row)
  now.current = row
  const epoch = holder?.epoch
  const report = holder?.report
  const changed = holder?.changed
  useLayoutEffect(() => {
    if (epoch !== undefined && now.current !== undefined) {
      report?.(now.current)
    }
  }, [epoch, report])
  const here = row !== undefined
  useLayoutEffect(() => {
    if (!here) {
      return undefined
    }
    changed?.()
    return () => changed?.()
  }, [changed, here])
}

/** A row's read state: the page's value wins each time it changes. */
const useRead = (
  family: Family,
  props: Props,
  use: MachineUse,
  latest: RefObject<Now>,
): {
  readonly isRead: RefObject<boolean>
  readonly markRead: (next?: boolean) => boolean
  readonly own: boolean
} => {
  const given_ = props.read as boolean | undefined
  const seed = given(family, props, boundTo(use, 'defaultRead', 'prop')) === true
  const [own, setOwn] = useState<boolean>(given_ ?? seed)
  const isRead = useRef(own)
  const lastGiven = useRef(given_)
  if (lastGiven.current !== given_) {
    lastGiven.current = given_
    if (given_ !== undefined) {
      isRead.current = given_
      setOwn(given_)
    }
  }
  const before = boundTo(use, 'onBeforeRead', 'event')
  const after = boundTo(use, 'onRead', 'event')
  const markRead = useCallback(
    (next = true): boolean => {
      const detail = { read: next }
      if (
        next === isRead.current ||
        !stands(family, latest.current, before, 'beforeRead', detail)
      ) {
        return false
      }
      isRead.current = next
      setOwn(next)
      if (after !== undefined) {
        tell(family, latest.current.props, after, detail)
      }
      latest.current.feed?.hear('read', detail, {})
      return true
    },
    [after, before, family, latest],
  )
  return { isRead, markRead, own }
}

/** A row's dismissal, which removes it once nothing refuses it. */
const useDismissal = (
  family: Family,
  use: MachineUse,
  latest: RefObject<Now>,
  key: object,
  nodes: { readonly dismiss: RefObject<unknown>; readonly item: RefObject<unknown> },
): { readonly dismiss: () => boolean; readonly gone: boolean } => {
  const [gone, setGone] = useState(false)
  const sends = boundTo(use, 'onDismiss', 'event')
  const dismiss = useCallback((): boolean => {
    const now = latest.current
    if (!stands(family, now, sends, 'dismiss', { label: now.words })) {
      return false
    }
    moveOff(now.feed, key, [nodes.dismiss.current, nodes.item.current])
    setGone(true)
    return true
  }, [family, key, latest, nodes, sends])
  return { dismiss, gone }
}

/** A press on the row itself, where the page hears one, as a click on the web's. */
const pressedView = (
  onPress: unknown,
  handle: NotificationHandle,
): Readonly<Record<string, unknown>> =>
  typeof onPress !== 'function'
    ? {}
    : {
        onResponderRelease: () => {
          onPress({
            currentTarget: handle,
            defaultPrevented: false,
            detail: {},
            preventDefault: () => undefined,
            target: handle,
          })
        },
        onStartShouldSetResponder: () => true,
      }

/** Hosts a notification. */
export const useNotification = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const feed = useContext(FeedContext)
  const group = useContext(GroupContext)
  const key = useRef({}).current
  const item = useRef<unknown>(null)
  const dismissNode = useRef<unknown>(null)
  const nodes = useMemo(() => ({ dismiss: dismissNode, item }), [])
  const words = wordsOf(props.children)
  const latest = useRef<Now>({ feed, props, words })
  latest.current = { feed, props, words }
  const { isRead, markRead, own } = useRead(family, props, use, latest)
  const { dismiss, gone } = useDismissal(family, use, latest, key, nodes)

  const handle = useMemo<NotificationHandle>(
    () => ({
      dismiss,
      markRead,
      get read() {
        return isRead.current
      },
    }),
    [dismiss, isRead, markRead],
  )
  useImperativeHandle(props.ref as Ref<NotificationHandle> | undefined, () => handle, [handle])

  const hidden = gone || (group?.folded === true && group.first !== key)
  const hiddenNow = useRef(hidden)
  hiddenNow.current = hidden
  const media = props.media !== undefined
  const direct = group === undefined
  const row = useMemo<FeedRow>(
    () => ({
      direct,
      drawn: () => !hiddenNow.current,
      key,
      markRead,
      media,
      node: () => item.current,
      read: () => isRead.current,
    }),
    [direct, isRead, key, markRead, media],
  )
  const standing = gone ? undefined : row
  useReports(feed, standing)
  useReports(group, standing)

  const counted = feed?.counted
  // biome-ignore lint/correctness/useExhaustiveDependencies: the feed counts again as this row's state changes.
  useLayoutEffect(() => {
    counted?.()
  }, [counted, own])

  const itemRef = useCallback(
    (view: unknown) => {
      item.current = view
      if (view === null) {
        return undefined
      }
      return keys().listen(view, (pressed) =>
        stepped(latest.current.feed, key, view, pressed as never),
      )
    },
    [key],
  )
  const dismissRef = useCallback((view: unknown) => {
    dismissNode.current = view
  }, [])
  const unreadLabel = String(read('unreadLabel') ?? '')
  const flag = (bound: string, value: boolean | string): Record<string, boolean | string> => ({
    [boundTo(use, bound, 'state') ?? bound]: value,
  })
  return {
    marks: [
      ...(own ? ['read'] : []),
      ...(props.actions === undefined ? [] : ['actions']),
      ...(read('dismissible') === true ? ['controls'] : []),
      ...takenMarks(props.separation, feed),
    ],
    parts: {
      dismiss: { view: { onPress: dismiss, ref: dismissRef } },
      host: {
        states: {
          ...flag('actionsFilled', props.actions !== undefined),
          ...flag('dismissName', dismissNameOf(String(read('dismissLabel') ?? ''), words)),
          ...flag('gone', hidden),
          ...flag('heard', own ? words : `${unreadLabel} ${words}`.trim()),
          ...flag('last', feed?.last === key),
          ...flag('media', feed?.media === true),
          ...flag('stamped', String(read('at') ?? '') !== ''),
        },
      },
      item: { view: { focusable: true, ref: itemRef, ...pressedView(props.onPress, handle) } },
      label: { view: { accessibilityRole: 'text', accessible: true } },
    },
  }
}
