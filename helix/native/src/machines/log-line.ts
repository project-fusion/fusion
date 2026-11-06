/**
 * The machine a line of a log runs on a phone: what the log says of it, through
 * `logRow` where the log draws it from data and a context where it was passed
 * in, read into its number, its time, and its runs of words.
 */
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import { openLink } from '@fusion.dev/helix-core/capabilities/open-link'
import {
  elapsedClock,
  type LogLevel,
  levelSaid,
  markMatches,
  timeOf,
} from '@fusion.dev/helix-core/log'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import type { HostInstance } from 'react-native'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { LogContext, type LogTold } from './log'
import { LogStep } from './log-group'
import { boundTo, given } from './props'
import { wordsOf } from './words'

/** A color named for the stylesheet, such as `red`, where anything else is CSS. */
const NAME = /^[a-z-]+$/

/** A run's color as the rules read it: by its name, or its value through a custom property. */
const paint = (value: string | undefined): { name: string; value: string } =>
  value === undefined
    ? { name: '', value: '' }
    : NAME.test(value)
      ? { name: value, value: '' }
      : { name: '', value }

/** The runs a line draws, each what the rules read of it. */
const runsOf = (told: LogTold | undefined): readonly object[] =>
  told?.runs === undefined
    ? []
    : markMatches(told.runs, told.query).map((piece, at) => {
        const color = paint(piece.inverse ? (piece.background ?? 'background') : piece.color)
        const ground = paint(piece.inverse ? (piece.color ?? 'foreground') : piece.background)
        return {
          backgroundName: ground.name,
          backgroundValue: ground.value,
          bold: piece.bold === true,
          colorName: color.name,
          colorValue: color.value,
          dim: piece.dim === true,
          italic: piece.italic === true,
          key: String(at),
          match: piece.match === true,
          strike: piece.strike === true,
          text: piece.text,
          underline: piece.underline === true,
        }
      })

/** How a line's time reads, on the clock or into the run. */
const timeWords = (at: unknown, told: LogTold | undefined): string => {
  const time = timeOf(at as number | string)
  if (told === undefined || told.times === '' || time === undefined) {
    return ''
  }
  return told.times === 'relative'
    ? elapsedClock((time - (told.start ?? time)) / 1000)
    : new Intl.DateTimeFormat(locale().read() || undefined, {
        hour: '2-digit',
        hourCycle: 'h23',
        minute: '2-digit',
        second: '2-digit',
      }).format(time)
}

/** What a screen reader hears of a line's level. */
const saidOf = (given: unknown, level: LogLevel | undefined, text: string): string => {
  const words = (given ?? {}) as Partial<Record<LogLevel, string>>
  const spoken = level === undefined ? undefined : (words[level] ?? SPOKEN[level])
  return levelSaid(spoken, text) ?? ''
}

/** What a line computes for its parts. */
const statesOf = (
  use: MachineUse,
  read: (name: string) => unknown,
  told: LogTold | undefined,
  facts: {
    readonly at: unknown
    readonly level: LogLevel | undefined
    readonly linked: boolean
    readonly numbered: boolean
    readonly pressable: boolean
    readonly written: string
  },
): Readonly<Record<string, boolean | string>> => {
  const { at, level, linked, numbered, pressable, written } = facts
  const number = told?.number ?? 0
  const count = told?.count ?? 1
  const tag = locale().read()
  const text = told?.runs ? told.runs.map((run) => run.text).join('') : written
  const said = saidOf(read('levelWords'), level, text)
  const countWords =
    count > 1 ? formatMessage(String(read('timesLabel') ?? ''), { count }, tag) : ''
  const time = timeWords(at, told)
  const flag = (bound: string, value: boolean | string): Record<string, boolean | string> => ({
    [boundTo(use, bound, 'state') ?? bound]: value,
  })
  return {
    ...flag('count', String(count)),
    ...flag('countHidden', count < 2),
    ...flag('countWords', countWords),
    ...flag('debug', level === 'debug'),
    ...flag('digits', String(told?.digits || 2)),
    ...flag('error', level === 'error'),
    ...flag('grouped', told?.grouped === true),
    ...flag('heard', [said, text, countWords].filter(Boolean).join(' ')),
    ...flag('levelHidden', said === ''),
    ...flag('levelWords', said),
    ...flag('linked', linked),
    ...flag('marked', told?.marked === true),
    ...flag(
      'numberName',
      formatMessage(String(told?.lineLabel ?? read('lineLabel') ?? ''), { number }, tag),
    ),
    ...flag('numberWords', String(number)),
    ...flag('plainNumber', numbered && !pressable),
    ...flag('pressNumber', pressable),
    ...flag('selected', told?.selected === true),
    ...flag('timeHidden', time === ''),
    ...flag('timeWords', time),
    ...flag('unnumbered', told?.grouped === true && !numbered),
    ...flag('unwrapped', told?.wrap !== true),
    ...flag('warn', level === 'warn'),
    ...flag('written', told?.runs !== undefined),
  }
}

/** The level a screen reader hears where the page names no words of its own. */
const SPOKEN: Partial<Record<LogLevel, string>> = {
  debug: 'Debug:',
  error: 'Error:',
  warn: 'Warning:',
}

/** What a press on a number does. */
const pressNumber = (
  now: LogTold | undefined,
  event?: { readonly nativeEvent?: { readonly shiftKey?: boolean } },
): void => {
  if (now === undefined) {
    return
  }
  if (now.selectable) {
    now.press(now.number, event?.nativeEvent?.shiftKey === true)
  } else if (now.href !== '') {
    openLink().open(now.href.replaceAll('{n}', String(now.number)))
  }
}

/** Hosts a line. */
export const useLogLine = (family: Family, props: Props, use: MachineUse): Behavior => {
  const read = (name: string): unknown => given(family, props, boundTo(use, name, 'prop'))
  const offer = useContext(LogContext)
  const step = useContext(LogStep)
  const key = useRef({}).current
  const level = read('level') as LogLevel | undefined
  const at = read('at')
  const written = wordsOf(props.children)
  const given_ = read('logRow') as LogTold | undefined
  const told = given_ ?? offer?.line(key, { at, grouped: step !== undefined, level, text: written })

  const leave = offer?.leave
  useEffect(() => () => leave?.(key), [key, leave])
  const filtered = told?.filtered === true
  const reveal = step?.reveal
  const needle = told?.query.trim() ?? ''
  useEffect(() => {
    if (given_ === undefined && !filtered && needle !== '') {
      reveal?.()
    }
  }, [filtered, given_, needle, reveal])

  const number = told?.number ?? 0
  const numbered = told?.numbers === true && number > 0
  const linked = numbered && told?.href !== ''
  const pressable = numbered && (linked || told?.selectable === true)
  const latest = useRef(told)
  latest.current = told

  const press = useCallback(
    (event?: { readonly nativeEvent?: { readonly shiftKey?: boolean } }) =>
      pressNumber(latest.current, event),
    [],
  )

  const stop = useRef<(() => void) | undefined>(undefined)
  const numberRef = useCallback((node: HostInstance | null) => {
    stop.current?.()
    stop.current =
      node === null
        ? undefined
        : keys().listen(node, (pressed) => {
            const now = latest.current
            return now?.step(now.number, pressed.key, pressed.shift === true) === true
          })
  }, [])
  const viewed = told?.viewed
  const lineRef = useCallback(
    (node: HostInstance | null) => {
      if (number > 0) {
        viewed?.(number, node)
      }
    },
    [number, viewed],
  )

  const runs = useMemo(() => runsOf(told), [told])
  return {
    marks: filtered ? ['filtered'] : [],
    parts: {
      host: {
        lists: { [boundTo(use, 'runs', 'state') ?? 'runs']: runs },
        states: statesOf(use, read, told, { at, level, linked, numbered, pressable, written }),
      },
      line: { view: { accessible: true, ref: lineRef } },
      number: { view: { onPress: press, ref: numberRef } },
    },
  }
}
