/**
 * A list of options on a phone: what is chosen, what a filter leaves showing,
 * where the highlight is, and what a press, a key, and a finger do. It reads
 * core's arithmetic, the same the web element reads.
 *
 * **It does not run the multiple selection machine.** A Shift range here adds, as
 * the web's does, where that machine replaces the last range.
 */
import { focus as realFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import {
  chosenValues,
  type DataOption,
  type DataOptionItem,
  dataOptions,
  filterKeeps,
} from '@fusion.dev/helix-core/listbox'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, PartBinding, Props } from '../render/behavior'
import type { Family } from '../style/form'
import {
  moveOption,
  useFilter,
  useMembers,
  useOptionDrag,
  useTelling,
  useWritten,
  wordsIn,
} from './listbox-hooks'
import {
  asksForMore,
  type Drag,
  type Entry,
  entriesOf,
  extended,
  type Held,
  pageOf,
  sameMember,
  standingOf,
  statusOf,
  toggled,
} from './listbox-model'
import { heardKey, type ListRun } from './listbox-run'
import { type OptionMember, type OptionOwner, OptionOwnerContext } from './option'
import { boundTo, given, senderOf, tell, told } from './props'
import type { ListOwner } from './select'
import { useFollow, useVirtualFocus, type VirtualFocus } from './virtual-focus'
import type { DrawnRow, WindowDrawing, WindowScroller } from './window'

/** One row of `items` a windowed repeat draws. */
interface ListRow extends DrawnRow {
  readonly disabled: boolean
  readonly value: string
  readonly words: string
}

/** What a scroll event says. */
interface Scrolled {
  readonly nativeEvent: {
    readonly contentOffset: { readonly y: number }
    readonly contentSize: { readonly height: number }
    readonly layoutMeasurement: { readonly height: number }
  }
}

/** The view that scrolls a list of written options. */
type Scroller = { readonly scrollTo?: (to: { animated?: boolean; y: number }) => void } | null

/** Takes what the options said in this draw in as their order, the page's. */
export const useOrder = (held: Held, schedule: () => void): void => {
  held.pass = []
  useLayoutEffect(() => {
    if (held.pass.length === 0) {
      return
    }
    const next = held.pass.filter((key) => held.members.has(key))
    const same =
      next.length === held.order.length && next.every((key, at) => key === held.order[at])
    held.order = next
    if (!same) {
      schedule()
    }
  })
}

/** What the page wrote `selected` on seeds a list that declares no value, as a native select does. */
const useDeclared = (
  held: Held,
  multiple: boolean,
  open: boolean,
  setValue: (value: string) => void,
): void => {
  const seeded = useRef(false)
  useLayoutEffect(() => {
    if (seeded.current || held.order.length === 0) {
      return
    }
    seeded.current = true
    const declared = [...held.members.values()].filter((one) => one.declared)
    const value = multiple ? declared.map((one) => one.value).join(',') : declared.at(-1)?.value
    if (open && value) {
      setValue(value)
    }
  })
}

/** Keeps the highlight on what shows, off a choice no longer made, and in real focus for the keys. */
const useHighlight = (
  focus: VirtualFocus,
  held: Held,
  entries: readonly Entry[],
  chosen: readonly string[],
  value: string,
  single: boolean,
  filtering: boolean,
) => {
  const keysHere = useRef(false)
  useLayoutEffect(() => {
    focus.settle(entries, filtering)
  })
  const lastValue = useRef(value)
  useEffect(() => {
    if (lastValue.current === value) {
      return
    }
    lastValue.current = value
    if (single && focus.active !== '' && !chosen.includes(focus.active)) {
      focus.highlight('none', entries, chosen)
      focus.release()
    }
  })
  const { active } = focus
  const latest = useRef(entries)
  latest.current = entries
  useEffect(() => {
    const key = latest.current.find((one) => one.value === active)?.key
    const node = key === undefined ? undefined : held.members.get(key)?.node()
    if (keysHere.current && node) {
      realFocus().focus(node, false)
    }
  }, [active, held])
  return keysHere
}

/**
 * Puts the highlight where the key that opened it says, once the options have
 * joined, and focus on it, as the web's Select does as its list opens.
 */
const useOpening = (
  owned: ListOwner | undefined,
  focus: VirtualFocus,
  held: Held,
  entries: readonly Entry[],
  chosen: readonly string[],
  keysHere: { current: boolean },
  byKeys: { current: boolean },
): void => {
  const done = useRef(false)
  const latest = useRef(entries)
  latest.current = entries
  useLayoutEffect(() => {
    if (owned === undefined || done.current || entries.length === 0) {
      return
    }
    done.current = true
    keysHere.current = true
    byKeys.current = true
    const { value, where } = owned.opening
    if (value === undefined) {
      focus.highlight(where, entries, chosen)
    } else {
      focus.to(value)
    }
  })
  /* A frame later than the layer, which moves focus to its first control as it opens. */
  const { active } = focus
  const landed = useRef(false)
  useEffect(() => {
    if (owned === undefined || landed.current || active === '') {
      return undefined
    }
    landed.current = true
    const frame = requestAnimationFrame(() => {
      const key = latest.current.find((one) => one.value === active)?.key
      const node = key === undefined ? undefined : held.members.get(key)?.node()
      if (node) {
        realFocus().focus(node, false)
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [active, held, owned])
}

/** The rows of `items`, the same objects while they say the same. */
const useRows = (entries: readonly Entry[]): readonly ListRow[] => {
  const said = entries
    .map((one) => `${one.value}\n${one.hidden}\n${one.disabled}\n${one.text}`)
    .join('\n\n')
  const latest = useRef(entries)
  latest.current = entries
  return useMemo(() => {
    void said
    return latest.current
      .filter((one) => !one.hidden)
      .map((one, at) => ({
        at,
        disabled: one.disabled,
        header: false,
        key: `option-${one.value}`,
        value: one.value,
        words: one.text,
      }))
  }, [said])
}

/** What the list's own scrolling does, whether it is a scroll view or a window of `items`. */
const useScrolling = (
  family: Family,
  props: Props,
  use: MachineUse,
  loading: boolean,
  count: number,
) => {
  const frame = useRef<unknown>(null)
  const offset = useRef(0)
  const list = useRef<WindowScroller | null>(null)
  const scroller = useRef<Scroller>(null)
  const askedAt = useRef(-1)
  const scrollTo = (to: number): void => {
    offset.current = Math.max(0, to)
    scroller.current?.scrollTo?.({ animated: false, y: offset.current })
  }
  const moved = (at: number, height: number, content: number): void => {
    offset.current = at
    const onMore = boundTo(use, 'onLoadMore', 'event')
    const due = asksForMore(content - at - height, height, content, count, askedAt.current)
    if (onMore !== undefined && !loading && due) {
      askedAt.current = count
      told(family, props, onMore, {})
    }
  }
  return { frame, list, moved, offset, scroller, scrollTo }
}

/** Takes an option's latest in, and the place it drew in. */
export const holdMember = (held: Held, member: OptionMember, schedule: () => void): void => {
  const had = held.members.get(member.key)
  held.members.set(member.key, member)
  if (!held.pass.includes(member.key)) {
    held.pass.push(member.key)
  }
  if (!sameMember(had, member)) {
    if (!held.order.includes(member.key)) {
      held.order.push(member.key)
    }
    schedule()
  }
}

/** What a list offers the options that join it. */
const ownerOf = ({
  active,
  choose,
  chosen,
  disabled,
  drag,
  dragging,
  entries,
  filtering,
  held,
  key,
  moving,
  moveTo,
  schedule,
}: {
  readonly active: string
  readonly choose: (member: OptionMember) => void
  readonly chosen: readonly string[]
  readonly disabled: boolean
  readonly drag: Drag | undefined
  readonly dragging: ReturnType<typeof useOptionDrag>['dragging']
  readonly entries: readonly Entry[]
  readonly filtering: boolean
  readonly held: Held
  readonly key: (press: KeyPress) => boolean
  readonly moveTo: (key: object, by: number) => void
  readonly moving: boolean
  readonly schedule: () => void
}): OptionOwner => ({
  choose,
  disabled,
  drag: moving ? dragging : undefined,
  filtering,
  group: (group) => {
    const inside = entries.filter((one) => one.group === group)
    return {
      hidden: inside.length > 0 && inside.every((one) => one.hidden),
      later: held.groups.indexOf(group) > 0,
    }
  },
  hold: (member) => holdMember(held, member, schedule),
  holdGroup: (group) => {
    held.groups.push(group)
    schedule()
    return () => {
      held.groups = held.groups.filter((one) => one !== group)
    }
  },
  key: (_from, press) => key(press),
  leave: (one) => {
    held.members.delete(one)
    held.order = held.order.filter((each) => each !== one)
    schedule()
  },
  lift: moving ? dragging.pick : undefined,
  move: moving ? moveTo : undefined,
  standing: (value) => standingOf(value, entries, active, chosen, drag),
})

/** What a filter field does. */
const fieldBinding = (
  filter: ReturnType<typeof useFilter>,
  heard: { readonly current: (press: KeyPress) => boolean },
  listening: { current: (() => void) | undefined },
): PartBinding => {
  const held = filter.filter !== '' || filter.draft !== undefined
  const hear = (pressed: KeyPress): boolean => {
    if (pressed.key === 'Escape' && held) {
      filter.ask('')
      return true
    }
    if (pressed.key === 'Enter') {
      filter.flush()
    }
    return heard.current(pressed)
  }
  return {
    view: {
      onChangeText: filter.typed,
      ref: (node: unknown) => {
        listening.current?.()
        listening.current = node === null ? undefined : keys().listen(node, hear)
      },
      value: filter.draft ?? filter.filter,
    },
  }
}

/** The options a list reads, and what a filter leaves of them. */
const useEntries = (family: Family, props: Props, use: MachineUse, held: Held, filter: string) => {
  const match = given(family, props, boundTo(use, 'filterMatch', 'prop')) as
    | ((text: string, filter: string) => boolean)
    | undefined
  const items = given(family, props, boundTo(use, 'items', 'prop')) as
    | readonly DataOptionItem[]
    | undefined
  const records = useMemo(
    (): readonly DataOption[] | undefined =>
      Array.isArray(items) ? dataOptions(items) : undefined,
    [items],
  )
  const entries = entriesOf(records, held, (text) => filterKeeps(text, filter, match))
  return { entries, records }
}

/** What a value's change asks, and says once it stood. */
const requester =
  (
    family: Family,
    props: Props,
    use: MachineUse,
    value: string,
    setValue: (next: string) => void,
    touch: () => void,
  ) =>
  (next: string): void => {
    const before = boundTo(use, 'onBeforeChange', 'event')
    if (
      next === value ||
      (before !== undefined &&
        !tell(family, props, before, { value: next }, senderOf(family, value)))
    ) {
      return
    }
    setValue(next)
    touch()
    for (const name of ['onInput', 'onChange']) {
      const event = boundTo(use, name, 'event')
      if (event !== undefined) {
        told(family, props, event, {}, senderOf(family, next))
      }
    }
  }

/** What a list draws `items` with. */
const drawingOf = (
  scrolling: ReturnType<typeof useScrolling>,
  rows: readonly ListRow[],
): WindowDrawing => ({
  across: 1,
  gap: 0,
  horizontal: false,
  laid: () => undefined,
  listRef: (one) => {
    scrolling.list.current = one
  },
  measured: () => undefined,
  moved: scrolling.moved,
  rows,
  shrinks: true,
})

/** What the list part does as it scrolls. */
const itemsBinding = (scrolling: ReturnType<typeof useScrolling>): PartBinding => ({
  view: {
    onScroll: ({ nativeEvent }: Scrolled) =>
      scrolling.moved(
        nativeEvent.contentOffset.y,
        nativeEvent.layoutMeasurement.height,
        nativeEvent.contentSize.height,
      ),
    ref: (node: unknown) => {
      scrolling.frame.current = node
      scrolling.scroller.current = node as Scroller
    },
    scrollEventThrottle: 16,
  },
})

/** Reads what a list's props say. */
const readOf = (family: Family, props: Props, use: MachineUse) => {
  const flag = (name: string): boolean => given(family, props, boundTo(use, name, 'prop')) === true
  const word = (name: string): string => wordsIn(given(family, props, boundTo(use, name, 'prop')))
  return {
    defaultValue: word('defaultValue'),
    disabled: flag('disabled'),
    emptyText: word('emptyText'),
    errorText: word('errorText'),
    grid: given(family, props, boundTo(use, 'layout', 'prop')) === 'grid',
    loading: flag('loading'),
    manual: flag('manual'),
    multiple: flag('multiple'),
    noResultsText: given(family, props, boundTo(use, 'noResultsText', 'prop')),
    reorderable: flag('reorderable'),
    written: given(family, props, boundTo(use, 'value', 'prop')),
  }
}

/** What a list's choice does: a press toggles or chooses, and a range adds. */
const useChoice = (
  family: Family,
  props: Props,
  use: MachineUse,
  read: ReturnType<typeof readOf>,
  entries: readonly Entry[],
  held: Held,
  touch: () => void,
) => {
  const open = read.defaultValue === '' && typeof read.written !== 'string'
  const [value, setValue] = useWritten(read.written, read.defaultValue)
  useDeclared(held, read.multiple, open, setValue)
  const chosen = chosenValues(value, new Set(entries.map((one) => one.value)), read.multiple)
  const anchor = useRef('')
  const owned = props.listOwner as ListOwner | undefined
  const asked = requester(family, props, use, value, setValue, touch)
  const request = (next: string): void => {
    if (next === value) {
      owned?.again()
    }
    asked(next)
  }
  const choose = (one: string): void => request(toggled(one, chosen, read.multiple, anchor))
  const extend = (to: string): void => {
    const taken = extended(entries, chosen, anchor, to)
    if (taken !== null) {
      request(taken.join(','))
    }
  }
  return { choose, chosen, extend, request, value }
}

/** A finger's and a screen reader's moves of an option. */
const useMoves = (
  family: Family,
  props: Props,
  use: MachineUse,
  entries: readonly Entry[],
  held: Held,
  scrolling: ReturnType<typeof useScrolling>,
) => {
  const moveTo = (key: object, to: number): void => moveOption(family, props, use, entries, key, to)
  const latestEntries = useRef<() => readonly Entry[]>(() => entries)
  latestEntries.current = () => entries
  const latestMove = useRef(moveTo)
  latestMove.current = moveTo
  const scrollBy = useRef((by: number) => scrolling.scrollTo(scrolling.offset.current + by))
  const { drag, dragging } = useOptionDrag(
    latestEntries,
    held,
    latestMove,
    scrolling.frame,
    scrollBy,
  )
  const moveBy = (key: object, by: number): void => moveTo(key, held.order.indexOf(key) + by)
  return { drag, dragging, moveBy, moveTo }
}

/** Keeps the highlight in view in the list, drawn from `items` or from what a page wrote. */
const useInView = (
  current: string,
  entries: readonly Entry[],
  held: Held,
  scrolling: ReturnType<typeof useScrolling>,
  windowed: boolean,
  byKeys: { readonly current: boolean },
): void => {
  useFollow(current, {
    item: () => {
      const key = entries.find((one) => one.value === current)?.key
      return key === undefined ? undefined : held.members.get(key)?.node()
    },
    list: () => scrolling.frame.current,
    offset: () => scrolling.offset.current,
    scroll: scrolling.scrollTo,
  })
  const shownAt = entries.filter((one) => !one.hidden).findIndex((one) => one.value === current)
  const { list } = scrolling
  useEffect(() => {
    /* A press leaves the list where it stands, and the keys bring what they reach in view. */
    if (windowed && shownAt >= 0 && byKeys.current) {
      list.current?.scrollToIndex?.({ animated: false, index: shownAt, viewPosition: 0.5 })
    }
  }, [byKeys, list, shownAt, windowed])
}

/**
 * Hosts a list: its options and its groups, the value, the filter, the highlight,
 * and what its keys do.
 */
export const useListbox = (
  family: Family,
  props: Props,
  use: MachineUse,
  touch: () => void,
): { readonly behavior: Behavior; readonly value: string } => {
  const read = readOf(family, props, use)
  const { held, schedule } = useMembers()
  useOrder(held, schedule)
  const focus = useVirtualFocus()
  const filter = useFilter(family, props, use, focus)
  const typed = filter.filter.trim()
  const filtering = typed !== ''
  const { entries, records } = useEntries(family, props, use, held, typed)
  const windowed = records !== undefined
  const { choose, chosen, extend, request, value } = useChoice(
    family,
    props,
    use,
    read,
    entries,
    held,
    touch,
  )
  const scrolling = useScrolling(family, props, use, read.loading, entries.length)
  const status = statusOf({
    emptyText: read.emptyText,
    entries,
    errorText: read.errorText,
    filter: typed,
    known: held.order.length > 0 || windowed || read.loading,
    loading: read.loading,
    noResultsText: read.noResultsText,
  })
  useTelling(family, props, use, typed, read.loading, entries)
  const keysHere = useHighlight(focus, held, entries, chosen, value, !read.multiple, filtering)
  const moving = read.reorderable && !read.disabled && !filtering && !read.grid
  const { drag, dragging, moveBy, moveTo } = useMoves(family, props, use, entries, held, scrolling)
  const current = focus.active || (chosen[0] ?? '')
  const byKeys = useRef(false)
  const owned = props.listOwner as ListOwner | undefined
  useOpening(owned, focus, held, entries, chosen, keysHere, byKeys)
  const run: ListRun = {
    arrive: (one, forwarded) => {
      focus.to(one)
      const link = entries.some((entry) => entry.value === one && entry.href !== '')
      if (!read.multiple && !read.manual && !forwarded && !link) {
        choose(one)
      }
    },
    choose,
    chosen,
    current,
    entries,
    extend,
    flush: filter.flush,
    focus,
    grid: read.grid && !windowed,
    held,
    moveTo,
    moving,
    multiple: read.multiple,
    page: () => pageOf(scrolling.frame.current, entries, held),
    request,
  }
  useInView(current, entries, held, scrolling, windowed, byKeys)
  const rows = useRows(entries)
  const owner = ownerOf({
    active: focus.active,
    choose: (member) => {
      byKeys.current = false
      focus.to(member.value)
      if (!read.disabled) {
        choose(member.value)
      }
    },
    chosen,
    disabled: read.disabled,
    drag,
    dragging,
    entries,
    filtering,
    held,
    key: (press) => {
      if (press.key === 'Tab') {
        owned?.tab()
        return false
      }
      keysHere.current = true
      byKeys.current = true
      return heardKey(run, press, false)
    },
    moveTo: moveBy,
    moving,
    schedule,
  })
  const listening = useRef<(() => void) | undefined>(undefined)
  const fieldKey = useRef<(press: KeyPress) => boolean>(() => false)
  fieldKey.current = (press) => {
    if (press.key === 'Tab') {
      owned?.tab()
      return false
    }
    keysHere.current = false
    byKeys.current = true
    return heardKey(run, press, true)
  }
  const state = (name: string): string => boundTo(use, name, 'state') ?? name
  return {
    behavior: {
      marks: [
        ...(status.shows ? [] : ['empty']),
        ...(status.errorShown ? ['error'] : []),
        ...(read.loading ? ['loading'] : []),
        ...(status.noResults ? ['no-results'] : []),
      ],
      parts: {
        host: {
          lists: { [state('rows')]: rows },
          states: {
            [state('childrenShown')]: !windowed,
            [state('emptyShown')]: status.emptyShown,
            [state('emptyWords')]: status.emptyWords,
            [state('errorShown')]: status.errorShown,
            [state('errorWords')]: read.errorText,
            [state('loadingShown')]: status.loadingShown,
            [state('windowed')]: windowed,
          },
        },
        items: itemsBinding(scrolling),
        rows: windowed ? { windowed: drawingOf(scrolling, rows) } : {},
        'search-field': fieldBinding(filter, fieldKey, listening),
      },
      provide: (inside) => (
        <OptionOwnerContext.Provider value={owner}>{inside}</OptionOwnerContext.Provider>
      ),
    },
    value,
  }
}
