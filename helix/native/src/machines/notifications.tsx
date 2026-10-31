/**
 * The machine a feed of notifications runs on a phone: the rows it holds, in the
 * order they stand, what is unread, and what it says of itself.
 *
 * **A row joins through a context, in a group too, since a phone has no children
 * to walk.** Every row reports itself again as one joins or leaves, children's
 * layout effects running in the order they stand and the feed's after them, so the
 * feed knows their order, as the web reads its children in document order. A group
 * reads the rows written in it the same way.
 */
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import { formatMessage } from '@fusion.dev/helix-core/words'
import {
  Children,
  createContext,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { boundTo, given, type Sender, tell } from './props'

/** A row, as the feed and the group around it read it. */
export interface FeedRow {
  /** Whether the row is drawn: a group may fold it, and it may have gone. */
  readonly drawn: () => boolean
  /** Whether it stands directly in the feed, and in no group. */
  readonly direct: boolean
  /** What the feed knows it by. */
  readonly key: object
  /** Asks for it to be marked, and answers whether the change stood. */
  readonly markRead: (next: boolean) => boolean
  /** Whether anything is passed into its media region. */
  readonly media: boolean
  /** The view focus moves to on the row. */
  readonly node: () => unknown
  /** Whether it has been read. */
  readonly read: () => boolean
}

/** Rows in the order they stand: what a feed and a group each hold. */
export interface RowOrder<Row = FeedRow> {
  /** Tells the holder a row joined or left, so every row reports again. */
  readonly changed: () => void
  /** Moves each time every row is asked to report. */
  readonly epoch: number
  /** A row saying it stands here, in its turn. */
  readonly report: (row: Row) => void
}

/** A group of rows, as a feed asks it to fold. */
export interface FeedGroup {
  readonly collapsible: () => boolean
  readonly open: () => boolean
  readonly request: (open: boolean) => void
}

/** The name of an event a row sends that the feed hears after it. */
export type Heard = 'beforeRead' | 'dismiss' | 'read'

/** What a feed offers the rows inside it. */
export interface FeedOffer extends RowOrder {
  /** Tells the feed a row's read state or its media changed. */
  readonly counted: () => void
  /** Tells the feed the event a row sent, and answers whether it stands. */
  readonly hear: (event: Heard, detail: Readonly<Record<string, unknown>>, from: Sender) => boolean
  /** Joins a group to the feed, and answers how to leave. */
  readonly joinGroup: (group: FeedGroup) => () => void
  /** The last row that stands directly in the feed, whose rule the footer's stands in for. */
  readonly last: object | undefined
  /** Whether any row holds media, so each holds the column open. */
  readonly media: boolean
  /** The rows, as they stand now. */
  readonly rows: () => readonly FeedRow[]
  /** The feed's `separation`, which a row that sets none takes. */
  readonly separation: string | undefined
}

/** The feed a row stands in. */
export const FeedContext = createContext<FeedOffer | undefined>(undefined)

/** Holds rows in the order they stand, as they report through a change. */
export const useRowOrder = <Row = FeedRow>(): RowOrder<Row> & { readonly rows: readonly Row[] } => {
  const [epoch, setEpoch] = useState(0)
  const [rows, setRows] = useState<readonly Row[]>([])
  const pending = useRef<Row[]>([])
  const asked = useRef(epoch)
  if (asked.current !== epoch) {
    asked.current = epoch
    pending.current = []
  }
  const report = useCallback((row: Row) => {
    pending.current.push(row)
  }, [])
  const changed = useCallback(() => setEpoch((now) => now + 1), [])
  /* Each round of reports is read once, as it ends: this element's layout effect
     runs after every row's in it. */
  const read = useRef(-1)
  useLayoutEffect(() => {
    if (read.current !== epoch) {
      read.current = epoch
      setRows(pending.current)
      pending.current = []
    }
  })
  return { changed, epoch, report, rows }
}

/** What the feed says through its live region, as the web's says it. */
const liveWords = (now: {
  readonly announced: string
  readonly emptyText: string
  readonly failed: string
  readonly known: boolean
  readonly loading: boolean
  readonly loadingText: string
}): string => {
  if (now.failed !== '') {
    return now.failed
  }
  if (now.loading) {
    return now.loadingText
  }
  return now.known ? now.announced : now.emptyText
}

/** How many unread rows stand above the rows the feed has met, which it then meets. */
const arrived = (rows: readonly FeedRow[], seen: WeakSet<object>): number => {
  const first = rows.findIndex((row) => seen.has(row.key))
  const fresh = rows.filter((row, at) => !seen.has(row.key) && at < first && !row.read())
  for (const row of rows) {
    seen.add(row.key)
  }
  return fresh.length
}

/** The feed's name, or its fallback where it has none. */
const nameOf = (label: unknown, fallback: unknown): string =>
  String(label ?? '') === '' ? String(fallback ?? '') : String(label)

/** The states a feed is in, by whether each holds. */
const marksOf = (holds: Readonly<Record<string, boolean>>): readonly string[] =>
  Object.keys(holds)
    .filter((name) => holds[name])
    .map((name) => (name === 'failed' ? 'error' : name))

/** A count of the unread rows that arrived above the ones there were, emptied a moment after it is said. */
const useArrivals = (rows: readonly FeedRow[], loading: boolean, label: string): string => {
  const [announced, setAnnounced] = useState('')
  const seen = useRef<WeakSet<object> | undefined>(undefined)
  useEffect(() => {
    if (seen.current === undefined) {
      if (rows.length > 0) {
        seen.current = new WeakSet(rows.map((row) => row.key))
      }
      return undefined
    }
    const count = arrived(rows, seen.current)
    if (count === 0 || loading || label === '') {
      return undefined
    }
    setAnnounced(formatMessage(label, { count }, locale().read()))
    const hush = setTimeout(() => setAnnounced(''), 1000)
    return () => clearTimeout(hush)
  }, [label, loading, rows])
  return announced
}

/** Whether the feed holds anything: what is written before the rows have joined, and the rows after. */
const useKnown = (rows: number, written: number): boolean => {
  const joined = useRef(false)
  useLayoutEffect(() => {
    joined.current = true
  }, [])
  return joined.current ? rows > 0 : rows > 0 || written > 0
}

/** Says what the live region's words become, past the first. */
const useSaid = (said: string): void => {
  const told = useRef(said)
  useEffect(() => {
    if (said !== told.current && said !== '') {
      announce().say(said, 'polite')
    }
    told.current = said
  }, [said])
}

/** Hosts a feed of notifications. */
export const useNotifications = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const { changed, epoch, report, rows } = useRowOrder()
  const [, setTick] = useState(0)
  const latest = useRef({ props, rows })
  latest.current = { props, rows }
  const groups = useRef(new Set<FeedGroup>()).current
  const counted = useCallback(() => setTick((now) => now + 1), [])
  const events: Readonly<Record<Heard, string | undefined>> = {
    beforeRead: boundTo(use, 'onBeforeRead', 'event'),
    dismiss: boundTo(use, 'onDismiss', 'event'),
    read: boundTo(use, 'onRead', 'event'),
  }
  const eventsNow = useRef(events)
  eventsNow.current = events
  const hear = useCallback<FeedOffer['hear']>(
    (event, detail, from) => {
      const name = eventsNow.current[event]
      return name === undefined || tell(family, latest.current.props, name, detail, from)
    },
    [family],
  )
  const joinGroup = useCallback(
    (group: FeedGroup) => {
      groups.add(group)
      return () => groups.delete(group)
    },
    [groups],
  )
  const rowsNow = useCallback(() => latest.current.rows, [])
  const separation = props.separation as string | undefined
  const media = rows.some((row) => row.media)
  const last = rows.filter((row) => row.direct).at(-1)?.key
  const offer = useMemo<FeedOffer>(
    () => ({
      changed,
      counted,
      epoch,
      hear,
      joinGroup,
      last,
      media,
      report,
      rows: rowsNow,
      separation,
    }),
    [changed, counted, epoch, hear, joinGroup, last, media, report, rowsNow, separation],
  )

  const unread = rows.filter((row) => !row.read()).length
  const markEveryoneRead = useCallback((): number => {
    if (!hear('beforeRead', { read: true }, {})) {
      return 0
    }
    const moved = latest.current.rows.filter((row) => !row.read() && row.markRead(true)).length
    hear('read', { read: true }, {})
    return moved
  }, [hear])
  const foldEveryGroup = useCallback(
    (folded = true): number => {
      const asked = [...groups].filter((group) => group.collapsible() && group.open() === folded)
      for (const group of asked) {
        group.request(!folded)
      }
      return asked.length
    },
    [groups],
  )
  useImperativeHandle(
    props.ref as Ref<unknown> | undefined,
    () => ({
      foldEveryGroup,
      get items() {
        return latest.current.rows
      },
      markEveryoneRead,
      get unread() {
        return latest.current.rows.filter((row) => !row.read()).length
      },
    }),
    [foldEveryGroup, markEveryoneRead],
  )

  const loading = read('loading') === true
  const announced = useArrivals(rows, loading, String(read('arrivedLabel') ?? ''))

  const failed = String(read('errorText') ?? '')
  const known = useKnown(rows.length, Children.count(props.children as ReactNode))
  const said = liveWords({
    announced,
    emptyText: String(read('emptyText') ?? ''),
    failed,
    known,
    loading,
    loadingText: String(read('loadingText') ?? ''),
  })
  useSaid(said)

  const marksAll = props.markAll === true && unread > 0
  const empty = !loading && failed === '' && !known
  const name = nameOf(read('label'), read('fallbackLabel'))
  const flag = (bound: string, value: boolean | string): Record<string, boolean | string> => ({
    [boundTo(use, bound, 'state') ?? bound]: value,
  })
  /* The press that ends mark-all's own reason to draw keeps focus in the feed. */
  const markAllNode = useRef<unknown>(null)
  const markAll = useCallback(() => {
    const held = markAllNode.current !== null && focus().focused() === markAllNode.current
    markEveryoneRead()
    const to = latest.current.rows.find((row) => row.drawn())?.node()
    if (held && to !== null && to !== undefined) {
      focus().focus(to, false)
    }
  }, [markEveryoneRead])
  const more = useCallback(() => {
    const sends = boundTo(use, 'onLoadMore', 'event')
    if (sends !== undefined && latest.current.props.loading !== true) {
      tell(family, latest.current.props, sends, {})
    }
  }, [family, use])
  return {
    marks: marksOf({ empty, failed: failed !== '', loading, media, unread: unread > 0 }),
    parts: {
      host: {
        states: {
          ...flag('blank', empty),
          ...flag('errorShown', failed !== ''),
          ...flag('errorWords', failed),
          ...flag('footerEmpty', props.footer === undefined),
          ...flag('headerEmpty', props.header === undefined && !marksAll),
          ...flag('loadingShown', failed === '' && loading),
          ...flag('marksAll', marksAll),
          ...flag('named', name),
          ...flag('said', said),
        },
      },
      'mark-all': {
        view: {
          onPress: markAll,
          ref: (node: unknown) => {
            markAllNode.current = node
          },
        },
      },
      more: {
        view: {
          accessibilityState: { disabled: loading },
          onPress: more,
        },
      },
    },
    provide: (held: ReactNode) => <FeedContext.Provider value={offer}>{held}</FeedContext.Provider>,
  }
}
