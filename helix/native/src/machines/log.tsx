/**
 * The machine a log runs on a phone: its text, read by core's `LogBuffer` and
 * `logRows`, the same the web element reads, in a window that follows the newest
 * line; or the lines passed in, which it numbers and filters through a context.
 *
 * **Lines written quickly draw once a frame**, so a loop that writes a thousand
 * lines is one drawing and the box does not stutter behind it.
 */
import { announce } from '@fusion.dev/helix-core/capabilities/announce'
import { scroll } from '@fusion.dev/helix-core/capabilities/scroll'
import {
  LOG_FORMATS,
  LogBuffer,
  type LogGroup,
  type LogLevel,
  type LogLine,
  type LogParser,
  type LogRow,
  type LogRun,
  lineRuns,
  logRows,
  loudEnough,
  stripAnsi,
  timeOf,
} from '@fusion.dev/helix-core/log'
import { formatMessage } from '@fusion.dev/helix-core/words'
import {
  Children,
  createContext,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { type HostInstance, useColorScheme } from 'react-native'
import { lengthsOf } from '../capabilities/scroll'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Entry } from '../render/entry'
import type { Family } from '../style/form'
import { boundTo, given, tell } from './props'
import type { Tail } from './tail'
import type { DrawnRow, WindowDrawing, WindowScroller } from './window'

/** What a log says of one line, which the line draws from. */
export interface LogTold {
  readonly count: number
  readonly digits: number
  readonly filtered: boolean
  readonly grouped: boolean
  readonly href: string
  readonly lineLabel: string
  readonly marked: boolean
  readonly number: number
  readonly numbers: boolean
  /** A press on the number. */
  readonly press: (number: number, shift: boolean) => void
  readonly query: string
  readonly runs?: readonly LogRun[] | undefined
  readonly selectable: boolean
  readonly selected: boolean
  readonly start: number | undefined
  /** A key on the number, which answers whether it took it. */
  readonly step: (number: number, key: string, shift: boolean) => boolean
  readonly times: string
  /** Hears the view a line stands in, by its number. */
  readonly viewed: (number: number, view: HostInstance | null) => void
  /** Whether a line longer than the box wraps. */
  readonly wrap: boolean
}

/** What a log offers the lines passed into it. */
export interface LogOffer {
  /** The digits of the largest number the log shows. */
  readonly digits: number
  /** How wide the box is, which a step's heading stands in. */
  readonly frame: number
  /** What the log says of a line, which takes its place in the order as it draws. */
  readonly line: (key: object, facts: LineFacts) => LogTold
  /** Tells the log a line left. */
  readonly leave: (key: object) => void
}

/** What a line passed in says of itself. */
export interface LineFacts {
  readonly at: unknown
  readonly grouped: boolean
  readonly level: LogLevel | undefined
  readonly text: string
}

/** The log a line or a step passed in stands in. */
export const LogContext = createContext<LogOffer | undefined>(undefined)

/** What a log's `ref` holds, as the web element's members offer them. */
export interface LogHandle {
  clear(): void
  done: boolean
  lines: readonly LogLine[]
  resume(): void
  scrollToLine(number: number, options?: { readonly align?: string }): Promise<boolean>
  readonly text: string
  write(chunk: string): void
  writeLine(line: LogLine): void
}

/** One row a log draws from data. */
interface DrawnLogRow extends DrawnRow {
  readonly isGroup: boolean
  readonly isLine: boolean
  readonly row: LogRow
}

/** Reads bytes as UTF-8, where the runtime has a decoder, and as they stand otherwise. */
const decoderOf = (): ((chunk: string | Uint8Array) => string) => {
  const Decoder = (
    globalThis as unknown as {
      readonly TextDecoder?: new () => {
        readonly decode: (bytes: Uint8Array, options: { readonly stream: boolean }) => string
      }
    }
  ).TextDecoder
  const decoder = Decoder === undefined ? undefined : new Decoder()
  return (chunk) =>
    typeof chunk === 'string'
      ? chunk
      : decoder === undefined
        ? String.fromCharCode(...chunk)
        : decoder.decode(chunk, { stream: true })
}

/** Whether `number` is in the runs `mark-lines` names. */
const inRuns = (runs: ReadonlyArray<[number, number]>, number: number): boolean =>
  runs.some(([first, last]) => number >= first && number <= last)

/** The selection as its first and last line, where it holds one. */
const rangeOf = (selected: string): readonly [number, number] | undefined => {
  const found = /^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(selected)
  if (!found) {
    return undefined
  }
  const first = Number(found[1])
  const last = Number(found[2] ?? found[1])
  return [Math.min(first, last), Math.max(first, last)]
}

/** A value of a range the selection reads: one line, or two in order. */
const rangeWords = (from: number, to: number): string =>
  from === to ? String(from) : `${Math.min(from, to)}-${Math.max(from, to)}`

/** What a string prop holds. */
const wordsIn = (value: unknown): string => (typeof value === 'string' ? value : '')

/** What the words a log says compare between one drawing and the next. */
interface Heard {
  readonly done: boolean
  readonly groups: ReadonlyMap<string, { readonly heading: string; readonly status?: string }>
  readonly matched: number
  readonly query: string
  readonly total: number
}

/** What a log's announcements read of its props. */
interface Saying {
  readonly doneLabel: string
  readonly errorLabel: string
  readonly groupLabel: string
  readonly matchesLabel: string
}

/** What changed since the last time, as the web's status region says it. */
const sayingOf = (
  before: Heard,
  now: Heard,
  fresh: readonly LogLine[],
  words: Saying,
): readonly string[] => {
  const said: string[] = []
  if (now.query !== before.query && now.query.trim() !== '') {
    said.push(formatMessage(words.matchesLabel, { count: now.matched }, ''))
  }
  const errors = fresh.filter((line) => line.level === 'error')
  if (errors.length > 0) {
    said.push(
      formatMessage(
        words.errorLabel,
        { count: errors.length, text: stripAnsi(errors[0]?.text ?? '') },
        '',
      ),
    )
  }
  for (const [id, group] of now.groups) {
    const was = before.groups.get(id)
    if (
      was !== undefined &&
      group.status !== was.status &&
      (group.status === 'done' || group.status === 'failed')
    ) {
      said.push(
        formatMessage(words.groupLabel, { heading: group.heading, status: group.status }, ''),
      )
    }
  }
  if (now.done && !before.done) {
    said.push(words.doneLabel)
  }
  return said
}

/** The text a source writes, to its end, until `stopped` says another took over. */
const readSource = async (
  source: AsyncIterable<string | Uint8Array>,
  write: (chunk: string) => void,
  stopped: () => boolean,
): Promise<boolean> => {
  const decode = decoderOf()
  for await (const chunk of source) {
    if (stopped()) {
      return false
    }
    write(decode(chunk))
  }
  return !stopped()
}

/** Reads what the log's props say into its buffer, as the web's setters do. */
const useBuffer = (
  read: (name: string) => unknown,
): { readonly buffer: LogBuffer; readonly redraw: () => void; readonly drawn: number } => {
  const buffer = useRef<LogBuffer | null>(null)
  buffer.current ??= new LogBuffer()
  const held = buffer.current
  const parse = read('parse') as LogParser | undefined
  const format = read('format') as keyof typeof LOG_FORMATS | undefined
  held.parse = parse ?? (format === undefined ? undefined : LOG_FORMATS[format])
  const limit = Math.max(0, Math.floor(Number(read('limit') ?? 0)))
  const collapse = read('collapse') === true
  if (held.limit !== limit || held.collapse !== collapse) {
    held.limit = limit
    held.collapse = collapse
    held.write('')
  }
  const lines = read('lines') as readonly LogLine[] | undefined
  const seen = useRef<readonly LogLine[] | undefined>(undefined)
  if (lines !== undefined && lines !== seen.current) {
    seen.current = lines
    held.replace(lines)
  }
  const [drawn, setDrawn] = useState(0)
  const waiting = useRef(false)
  const last = useRef(0)
  const cost = useRef(0)
  const began = useRef(0)
  /* The first write of a frame draws at once, and the rest wait: a frame, or as
     long as the last drawing took where that is longer, so a writer faster than
     the drawing is read in batches and never waits behind a drawing per write. */
  const redraw = useCallback(() => {
    if (waiting.current) {
      return
    }
    const draw = () => {
      waiting.current = false
      last.current = Date.now()
      began.current = last.current
      setDrawn((one) => one + 1)
    }
    const since = Date.now() - last.current
    const gap = Math.max(16, cost.current)
    if (since > gap) {
      draw()
      return
    }
    waiting.current = true
    setTimeout(draw, gap - since)
  }, [])
  // biome-ignore lint/correctness/useExhaustiveDependencies: each drawing is when it is measured
  useLayoutEffect(() => {
    if (began.current > 0) {
      cost.current = Date.now() - began.current
      began.current = 0
    }
  }, [drawn])
  return { buffer: held, drawn, redraw }
}

/** Whether each step drawn from data is open, as a reader or `groups` left it. */
const useOpened = (all: readonly LogGroup[]) => {
  const opened = useRef(new Map<string, boolean>()).current
  const before = useRef<readonly LogGroup[]>([])
  const was = new Map(before.current.map((group) => [group.id, group.open]))
  for (const group of all) {
    if (group.open !== undefined && was.has(group.id) && was.get(group.id) !== group.open) {
      opened.set(group.id, group.open)
    }
  }
  before.current = all
  const isOpen = (id: string): boolean => {
    const known = opened.get(id)
    if (known !== undefined) {
      return known
    }
    const seeded = all.find((group) => group.id === id)?.open ?? false
    opened.set(id, seeded)
    return seeded
  }
  return { isOpen, opened }
}

/** The order the lines passed in drew in, and what the log knows of them. */
interface Passed {
  readonly facts: Map<object, LineFacts>
  /** When the first line passed in was written, which `relative` counts from. */
  first?: number | undefined
  order: object[]
}

/** The selection a press and a key ask for, and where a Shift press measures from. */
const useSelection = (
  family: Family,
  props: Props,
  use: MachineUse,
  read: (name: string) => unknown,
) => {
  const latest = useRef(props)
  latest.current = props
  const asked = wordsIn(read('selectedLines'))
  const [own, setOwn] = useState<string | undefined>(undefined)
  const seen = useRef(asked)
  if (seen.current !== asked) {
    seen.current = asked
    setOwn(undefined)
  }
  const selected = own ?? asked
  const anchor = useRef<number | undefined>(undefined)
  const current = useRef(selected)
  current.current = selected
  const select = useCallback(
    (value: string) => {
      if (value === current.current) {
        return
      }
      const before = boundTo(use, 'onBeforeSelect', 'event')
      if (before !== undefined && !tell(family, latest.current, before, { value })) {
        return
      }
      setOwn(value)
      const after = boundTo(use, 'onSelect', 'event')
      if (after !== undefined) {
        tell(family, latest.current, after, { value })
      }
    },
    [family, use],
  )
  const press = useCallback(
    (number: number, shift: boolean) => {
      if (shift && anchor.current !== undefined) {
        select(rangeWords(anchor.current, number))
        return
      }
      anchor.current = number
      select(String(number))
    },
    [select],
  )
  return { anchor, press, select, selected }
}

/** The list a log from data draws in, or the scroll view of lines passed in. */
export const useBox = (tail: Tail | undefined, fed: boolean) => {
  const list = useRef<WindowScroller | null>(null)
  const listRef = useCallback(
    (next: WindowScroller | null) => {
      list.current = next
      tail?.held(next as never)
    },
    [tail?.held],
  )
  const [node, setNode] = useState<HostInstance | null>(null)
  const scrollerRef = useCallback(
    (next: HostInstance | null) => {
      setNode(next)
      if (!fed) {
        tail?.held(next as never)
      }
    },
    [fed, tail?.held],
  )
  const moved = tail?.moved
  useEffect(() => {
    if (node === null || moved === undefined) {
      return undefined
    }
    return scroll().observe(node, (at) => {
      const { content, frame } = lengthsOf(node)
      moved(at.offset.y, frame.height, content.height)
    })
  }, [moved, node])
  return { list, listRef, scrollerRef }
}

/** The digits of the largest number a log shows, which sizes the column of numbers. */
const digitsOf = (numbers: boolean, largest: number): number =>
  numbers && largest > 0 ? String(largest).length : 0

/** What every line of a log is told alike. */
type Shared = Omit<
  LogTold,
  'count' | 'filtered' | 'grouped' | 'marked' | 'number' | 'runs' | 'selected'
>

/** What a line passed in is told. */
const toldOf = (
  shared: Shared,
  marks: ReadonlyArray<[number, number]>,
  range: readonly [number, number] | undefined,
  number: number,
  facts: LineFacts,
  level: LogLevel | undefined,
): LogTold => {
  const needle = shared.query.trim().toLowerCase()
  return {
    ...shared,
    count: 1,
    filtered:
      (needle !== '' && !facts.text.toLowerCase().includes(needle)) ||
      !loudEnough(facts.level, level),
    grouped: facts.grouped,
    marked: inRuns(marks, number),
    number,
    query: '',
    selected: range !== undefined && number >= range[0] && number <= range[1],
  }
}

/** Writes text, and reads a source to its end. A new source stops the last. */
const useWriting = (
  buffer: LogBuffer,
  redraw: () => void,
  source: AsyncIterable<string | Uint8Array> | null | undefined,
  ended: () => void,
) => {
  const [reading, setReading] = useState(false)
  const write = useCallback(
    (chunk: string) => {
      if (chunk !== '') {
        buffer.write(chunk)
        redraw()
      }
    },
    [buffer, redraw],
  )
  const hear = useRef(ended)
  hear.current = ended
  useEffect(() => {
    if (source === undefined || source === null) {
      setReading(false)
      return undefined
    }
    let stopped = false
    setReading(true)
    readSource(source, write, () => stopped)
      .then((finished) => {
        if (finished) {
          hear.current()
          setReading(false)
        }
      })
      .catch((error: unknown) => {
        if (!stopped) {
          setReading(false)
          ;(globalThis as { reportError?: (error: unknown) => void }).reportError?.(error)
        }
      })
    return () => {
      stopped = true
    }
  }, [source, write])
  return { reading, write }
}

/** The number a key on a number goes to, among `numbers`. */
const numberFor = (numbers: readonly number[], from: number, key: string): number | undefined => {
  const at = numbers.indexOf(from)
  switch (key) {
    case 'ArrowDown':
      return numbers[Math.min(numbers.length - 1, at + 1)]
    case 'ArrowUp':
      return numbers[Math.max(0, at - 1)]
    case 'Home':
      return numbers[0]
    case 'End':
      return numbers.at(-1)
    default:
      return undefined
  }
}

/** What a log needs to move between its numbers. */
interface Moving {
  readonly anchor: { current: number | undefined }
  readonly fed: boolean
  readonly list: RefObject<WindowScroller | null>
  readonly passed: Passed
  readonly rows: { readonly current: readonly LogRow[] }
  readonly select: (value: string) => void
  readonly selectable: boolean
  readonly tail: Tail | undefined
  readonly views: Map<number, HostInstance>
}

/** Where a line of the log stands, brought into view, and a key that moves between numbers. */
const movesOf = ({ anchor, fed, list, passed, rows, select, selectable, tail, views }: Moving) => {
  const reveal = (number: number): boolean => {
    const index = rows.current.findIndex((row) => row.kind === 'line' && row.number === number)
    const node = views.get(number)
    if (fed ? index < 0 : node === undefined) {
      return false
    }
    tail?.letGo()
    if (fed) {
      list.current?.scrollToIndex?.({ animated: false, index, viewPosition: 0.5 })
    } else if (node !== undefined) {
      scroll().reveal(node)
    }
    return true
  }
  const step = (from: number, key: string, shift: boolean): boolean => {
    const numbers = fed
      ? rows.current.flatMap((row) => (row.kind === 'line' ? [row.number] : []))
      : passed.order.map((_, at) => at + 1)
    const to = numberFor(numbers, from, key)
    if (to === undefined) {
      return false
    }
    if (shift && selectable) {
      const start = anchor.current ?? from
      anchor.current = start
      select(rangeWords(start, to))
    }
    reveal(to)
    return true
  }
  return { reveal, step }
}

/**
 * Each row's object, kept while what it shows stands, which is what lets a list
 * appended to draw only what it gained.
 */
const useRowObjects = (rows: readonly LogRow[]): readonly DrawnLogRow[] => {
  const lineRows = useRef(new WeakMap<LogLine, DrawnLogRow>()).current
  const stepRows = useRef(new Map<string, DrawnLogRow>()).current
  return rows.map((row, at): DrawnLogRow => {
    const isLine = row.kind === 'line'
    const key = isLine ? `line:${row.number}` : `group:${row.group.id}`
    const kept = isLine ? lineRows.get(row.line) : stepRows.get(key)
    const same =
      kept?.key === key &&
      (isLine ||
        (kept.row.kind === 'group' && kept.row.group === row.group && kept.row.open === row.open))
    if (same) {
      return kept
    }
    const made = { at, header: false, isGroup: !isLine, isLine, key, row }
    if (isLine) {
      lineRows.set(row.line, made)
    } else {
      stepRows.set(key, made)
    }
    return made
  })
}

/** The kept drawings of rows, let go as what every row reads moves. */
const useKeptDrawings = (revision: string, hooks: unknown): WeakMap<DrawnRow, ReactNode> => {
  const kept = useRef({ hooks, revision, rows: new WeakMap<DrawnRow, ReactNode>() })
  if (kept.current.revision !== revision || kept.current.hooks !== hooks) {
    kept.current = { hooks, revision, rows: new WeakMap() }
  }
  return kept.current.rows
}

/** When the first line kept was written, where `relative` counts from it. */
const firstTimeOf = (lines: readonly LogLine[]): number | undefined => {
  for (const line of lines) {
    const time = timeOf(line.at)
    if (time !== undefined) {
      return time
    }
  }
  return undefined
}

/** What a screen reader hears of what changed, as the web's status region says. */
const useHeard = (
  buffer: LogBuffer,
  all: readonly LogGroup[],
  now: Pick<Heard, 'done' | 'matched' | 'query'>,
  read: (name: string) => unknown,
): void => {
  const heard = useRef<Heard | undefined>(undefined)
  const seenLines = useRef(0)
  useLayoutEffect(() => {
    const total = buffer.dropped + buffer.lines.length
    const next: Heard = {
      ...now,
      groups: new Map(
        all.map((group) => [
          group.id,
          { heading: group.heading, ...(group.status ? { status: group.status } : {}) },
        ]),
      ),
      total,
    }
    const before = heard.current
    heard.current = next
    const arrived = total - seenLines.current
    seenLines.current = total
    if (before === undefined || read('quiet') === true) {
      return
    }
    const fresh = arrived > 0 ? buffer.lines.slice(Math.max(0, buffer.lines.length - arrived)) : []
    const said = sayingOf(before, next, fresh, {
      doneLabel: wordsIn(read('doneLabel')),
      errorLabel: wordsIn(read('errorLabel')),
      groupLabel: wordsIn(read('groupLabel')),
      matchesLabel: wordsIn(read('matchesLabel')),
    })
    if (said.length > 0) {
      announce().say(said.join(' '), 'polite')
    }
  })
}

/** What the element's ref holds, which the web's holds too. */
const useLogHandle = (
  ref: unknown,
  buffer: LogBuffer,
  opened: Map<string, boolean>,
  write: (chunk: string) => void,
  now: {
    readonly done: boolean
    readonly redraw: () => void
    readonly reveal: (number: number) => boolean
    readonly setDone: (done: boolean) => void
    readonly tail: Tail | undefined
  },
): void => {
  const latest = useRef(now)
  latest.current = now
  const handle = useMemo<LogHandle>(
    () => ({
      clear: () => {
        buffer.clear()
        opened.clear()
        latest.current.redraw()
      },
      get done() {
        return latest.current.done
      },
      set done(next: boolean) {
        latest.current.setDone(next)
      },
      get lines() {
        return buffer.lines
      },
      set lines(next: readonly LogLine[]) {
        buffer.replace(next ?? [])
        latest.current.redraw()
      },
      resume: () => latest.current.tail?.resume(),
      scrollToLine: (number) => {
        const line = buffer.lines[number - buffer.dropped - 1]
        if (line?.group !== undefined && !opened.get(line.group)) {
          opened.set(line.group, true)
          latest.current.redraw()
        }
        return new Promise((done) => {
          requestAnimationFrame(() => done(latest.current.reveal(number)))
        })
      },
      get text() {
        const open = buffer.current()
        return [...buffer.lines, ...(open ? [open] : [])]
          .map((line) => stripAnsi(line.text))
          .join('\n')
      },
      write,
      writeLine: (line) => {
        buffer.push(line)
        latest.current.redraw()
      },
    }),
    [buffer, opened, write],
  )
  useImperativeHandle(ref as Ref<LogHandle> | undefined, () => handle, [handle])
}

/** What the copy of a row gives the line it draws. */
const lineCopyOf =
  (
    shared: Shared,
    buffer: LogBuffer,
    marks: ReadonlyArray<[number, number]>,
    range: readonly [number, number] | undefined,
  ) =>
  (item: Entry): Readonly<Record<string, unknown>> => {
    const row = item.fields.row as LogRow
    if (row.kind !== 'line') {
      return {}
    }
    const told: LogTold = {
      ...shared,
      count: row.line.count ?? 1,
      filtered: false,
      grouped: row.line.group !== undefined,
      marked: inRuns(marks, row.number),
      number: row.number,
      runs: buffer.runsOf(row.line),
      selected: range !== undefined && row.number >= range[0] && row.number <= range[1],
    }
    return { at: row.line.at ?? '', level: row.line.level, logRow: told }
  }

/** What the copy of a row gives the step it draws. */
const groupCopyOf =
  (toggled: { readonly current: (id: string, open: boolean) => void }) =>
  (item: Entry): Readonly<Record<string, unknown>> => {
    const row = item.fields.row as LogRow
    if (row.kind !== 'group') {
      return {}
    }
    const { duration, heading, id, status } = row.group
    return {
      duration: duration ?? '',
      heading,
      logDrawn: true,
      onToggle: (event: { readonly newState?: string }) =>
        toggled.current(id, event.newState === 'open'),
      open: row.open,
      status,
    }
  }

/** A step a reader opened or closed, and what the log says of it. */
const useToggled = (
  family: Family,
  props: Props,
  use: MachineUse,
  now: {
    readonly all: readonly LogGroup[]
    readonly isOpen: (id: string) => boolean
    readonly opened: Map<string, boolean>
    readonly query: string
    readonly redraw: () => void
  },
) => {
  const toggled = useRef((_id: string, _open: boolean): void => undefined)
  toggled.current = (id, open) => {
    if (now.query.trim() !== '') {
      return
    }
    now.opened.set(id, open)
    now.redraw()
    const value = now.all
      .filter((one) => now.isOpen(one.id))
      .map((one) => one.id)
      .join(',')
    const event = boundTo(use, 'onExpand', 'event')
    if (event !== undefined) {
      tell(family, props, event, { value })
    }
  }
  return toggled
}

/** The offer lines passed in read, new as often as they should draw again. */
const useOffer = (
  fed: boolean,
  passed: Passed,
  shared: Shared,
  frame: number,
  level: LogLevel | undefined,
  marks: ReadonlyArray<[number, number]>,
  range: readonly [number, number] | undefined,
): LogOffer => {
  const now = useRef({ level, marks, range, shared })
  now.current = { level, marks, range, shared }
  /* Lines passed in draw again with the log, in order. A line from data reads
     `logRow`, and a new offer would draw every one of them for each line written. */
  const childrenDraw = fed ? 0 : {}
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new offer is what draws the lines again, in order
  return useMemo<LogOffer>(
    () => ({
      digits: shared.digits,
      frame,
      leave: (key) => {
        passed.facts.delete(key)
      },
      line: (key, facts) => {
        passed.facts.set(key, facts)
        if (!passed.order.includes(key)) {
          passed.order.push(key)
        }
        passed.first ??= timeOf(facts.at as number | string)
        const held = now.current
        return toldOf(
          { ...held.shared, start: held.shared.start ?? passed.first },
          held.marks,
          held.range,
          passed.order.indexOf(key) + 1,
          facts,
          held.level,
        )
      },
    }),
    [childrenDraw, frame, passed, shared.digits],
  )
}

/** What the log computes for its parts. */
const statesOf = (
  use: MachineUse,
  read: (name: string) => unknown,
  buffer: LogBuffer,
  facts: {
    readonly busy: boolean
    readonly content: boolean
    readonly fed: boolean
    readonly plain: boolean
    readonly selected: string
  },
): Readonly<Record<string, boolean | string>> => {
  const flag = (name: string): string => boundTo(use, name, 'state') ?? name
  const label = wordsIn(read('label'))
  return {
    [flag('blank')]: !facts.content && read('loading') !== true,
    [flag('busy')]: facts.busy,
    [flag('droppedHidden')]: buffer.dropped === 0,
    [flag('droppedWords')]:
      buffer.dropped === 0
        ? ''
        : formatMessage(wordsIn(read('droppedLabel')), { count: buffer.dropped }, ''),
    [flag('named')]: label === '' ? wordsIn(read('fallbackLabel')) : label,
    [flag('scrolls')]: !facts.fed && !facts.plain,
    selectedLines: facts.selected,
  }
}

/** What a list draws with. */
const drawingOf = (
  tail: Tail | undefined,
  rows: readonly DrawnLogRow[],
  listRef: (list: WindowScroller | null) => void,
  kept: WeakMap<DrawnRow, ReactNode>,
  flags: { readonly fed: boolean; readonly plain: boolean; readonly wrap: boolean },
): WindowDrawing => ({
  across: 1,
  ...(flags.wrap || flags.plain ? {} : { sideways: true }),
  gap: 0,
  horizontal: false,
  kept,
  laid: () => undefined,
  listRef,
  measured: () => undefined,
  moved: (offset, frame, content) => tail?.moved(offset, frame, content),
  plain: !flags.fed || flags.plain,
  rows,
  shrinks: true,
  ...(tail === undefined
    ? {}
    : { maintainVisibleContentPosition: tail.maintainVisibleContentPosition }),
})

/** The log's rows and what they read of its props. */
const rowsFrom = (
  buffer: LogBuffer,
  all: readonly LogGroup[],
  isOpen: (id: string) => boolean,
  fed: boolean,
  level: LogLevel | undefined,
  query: string,
) =>
  fed
    ? logRows({
        current: buffer.current(),
        groups: all,
        level,
        lines: buffer.lines,
        open: isOpen,
        query,
        start: buffer.dropped,
      })
    : { matched: 0, rows: [] }

/** The largest number a log shows. */
const largestOf = (buffer: LogBuffer, passed: Passed, fed: boolean): number =>
  fed ? buffer.dropped + buffer.lines.length + 1 : Math.max(passed.facts.size, 1)

/** Whether the lines are data rather than children. */
const holdsData = (buffer: LogBuffer, all: readonly LogGroup[], source: unknown): boolean =>
  buffer.lines.length > 0 ||
  buffer.current() !== undefined ||
  all.length > 0 ||
  (source !== undefined && source !== null)

/** The custom states a log is in. */
const marksOf = (done: boolean, filtered: boolean, empty: boolean): readonly string[] => [
  ...(done ? ['done'] : []),
  ...(filtered ? ['filtered'] : []),
  ...(empty ? ['empty'] : []),
]

/** Hosts the log. */
export const useLog = (
  family: Family,
  props: Props,
  use: MachineUse,
  tail: Tail | undefined,
): Behavior => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const { buffer, redraw } = useBuffer(read)
  const groups = (read('groups') as readonly LogGroup[] | undefined) ?? []
  const all = buffer.steps.length === 0 ? groups : [...groups, ...buffer.steps]
  const { isOpen, opened } = useOpened(all)
  const [doneOwn, setDoneOwn] = useState<boolean | undefined>(undefined)
  const done = doneOwn ?? read('done') === true
  const [frame, setFrame] = useState(0)
  const query = wordsIn(read('query'))
  const level = read('level') as LogLevel | undefined
  const source = read('source') as AsyncIterable<string | Uint8Array> | null | undefined
  const fed = holdsData(buffer, all, source)
  const view = rowsFrom(buffer, all, isOpen, fed, level, query)
  const lineNumbers = read('lineNumbers') === true
  const selectable = read('selectable') === true
  const { anchor, press, select, selected } = useSelection(family, props, use, read)
  const { list, listRef, scrollerRef } = useBox(tail, fed)
  const views = useRef(new Map<number, HostInstance>()).current
  const passed = useRef<Passed>({ facts: new Map(), order: [] }).current
  /* Each drawing of the log draws its lines again, in order. */
  passed.order = []
  const { reading, write } = useWriting(buffer, redraw, source, () => setDoneOwn(true))
  const rowsNow = useRef(view.rows)
  rowsNow.current = view.rows
  const moves = useRef(
    movesOf({ anchor, fed, list, passed, rows: rowsNow, select, selectable, tail, views }),
  )
  moves.current = movesOf({
    anchor,
    fed,
    list,
    passed,
    rows: rowsNow,
    select,
    selectable,
    tail,
    views,
  })
  const step = useCallback(
    (from: number, key: string, shift: boolean) => moves.current.step(from, key, shift),
    [],
  )
  const viewed = useCallback(
    (number: number, node: HostInstance | null) => {
      if (node === null) {
        views.delete(number)
      } else {
        views.set(number, node)
      }
    },
    [views],
  )
  const times = wordsIn(read('timestamps'))
  const firstTime = times === 'relative' ? firstTimeOf(buffer.lines) : undefined
  const marksKey = wordsIn(read('markLines'))
  const marks = lineRuns(marksKey)
  const range = rangeOf(selected)
  const wrap = read('wrap') === true
  const shared: Shared = {
    digits: digitsOf(lineNumbers, largestOf(buffer, passed, fed)),
    href: wordsIn(read('lineHref')),
    lineLabel: wordsIn(read('lineLabel')),
    numbers: lineNumbers,
    press,
    query,
    selectable,
    start: firstTime,
    step,
    times,
    viewed,
    wrap,
  }
  const offer = useOffer(fed, passed, shared, frame, level, marks, range)
  const rows = useRowObjects(view.rows)
  /* What every row draws from, beside the row. The scheme and the hooks stand here
     since a kept drawing holds what it read of them. */
  const scheme = useColorScheme()
  const kept = useKeptDrawings(
    [
      lineNumbers,
      shared.href,
      shared.lineLabel,
      selectable,
      selected,
      marksKey,
      query,
      times,
      firstTime,
      shared.digits,
      wrap,
      scheme,
      frame,
    ].join('|'),
    props.hooks,
  )
  useHeard(buffer, all, { done, matched: view.matched, query }, read)
  useLogHandle(props.ref, buffer, opened, write, {
    done,
    redraw,
    reveal: (number) => moves.current.reveal(number),
    setDone: setDoneOwn,
    tail,
  })

  /* The box goes to the end as lines arrive and a reader follows. */
  const drawnLines = rows.length
  // biome-ignore lint/correctness/useExhaustiveDependencies: each new row is when the box moves
  useLayoutEffect(() => {
    if (tail?.following === true) {
      tail.stick()
    }
  }, [drawnLines, tail?.following])

  const toggled = useToggled(family, props, use, { all, isOpen, opened, query, redraw })
  const plain = props.separation === 'plain'
  const holds = Children.count(props.children as ReactNode) > 0
  const searched = query.trim() !== ''
  const filtered = searched || level !== undefined
  const shown = fed ? view.rows.length > 0 : holds
  const states = statesOf(use, read, buffer, {
    busy: reading && !done,
    content: searched || shown,
    fed,
    plain,
    selected,
  })
  return {
    marks: marksOf(done, filtered, !fed && !holds),
    parts: {
      group: { copy: groupCopyOf(toggled) },
      host: { lists: { [boundTo(use, 'list', 'state') ?? 'rows']: rows }, states },
      line: { copy: lineCopyOf(shared, buffer, marks, range) },
      log: {
        view: {
          indicators: true,
          onLayout: ({
            nativeEvent: { layout },
          }: {
            readonly nativeEvent: { readonly layout: { readonly width: number } }
          }) => setFrame(layout.width),
          scrollerRef,
        },
      },
      rows: { windowed: drawingOf(tail, rows, listRef, kept, { fed, plain, wrap }) },
    },
    provide: (held: ReactNode): ReactNode => (
      <LogContext.Provider value={offer}>{held}</LogContext.Provider>
    ),
  }
}
