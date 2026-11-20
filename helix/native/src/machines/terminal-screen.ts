/**
 * A phone's terminal screen as the rows its window draws, a cell's size in
 * the screen's face, and the find bar's search through the lines.
 */
import {
  ansiName,
  findInLines,
  markRuns,
  queryReads,
  runsText,
  type TerminalRun,
} from '@fusion.dev/helix-core/terminal'
import { formatMessage } from '@fusion.dev/helix-core/words'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Theme } from '../theme/theme'
import { wordsIn } from './date-picker-read'
import { lengthOf } from './heatmap-cells'

/**
 * How wide a monospaced cell is against its type size: Menlo's, SF Mono's,
 * and Roboto Mono's advance are each 0.6 of the size, to a hundredth.
 */
const ADVANCE = 0.6

/** A cell's width and a line's height in points, in the screen's face at the reader's text size. */
export const cellOf = (theme: Theme): { readonly height: number; readonly width: number } => {
  const size = Number.parseFloat(String(theme.tokens['text-sm'] ?? '0.8125')) * theme.rem
  const leading = Number.parseFloat(String(theme.tokens['leading-tight'] ?? '1.25'))
  return {
    height: size * (Number.isFinite(leading) ? leading : 1.25),
    width: size * ADVANCE || lengthOf(theme, 'text-sm', 13) * ADVANCE,
  }
}

/** A run's color as the rules read it: by its name, or its value through a custom property. */
const paint = (value: string | undefined): { name: string; value: string } => {
  const name = ansiName(value) ?? (value === 'foreground' || value === 'background' ? value : '')
  return { name, value: name === '' ? (value ?? '') : '' }
}

/** One line the window draws: its place, and its runs as the rules read them. */
export interface TerminalRow {
  readonly at: number
  readonly header: false
  readonly key: string
  readonly runs: readonly object[]
}

/** The matches on each line, by the line's place. */
export type Marks = ReadonlyMap<number, readonly { current: boolean; from: number; to: number }[]>

/** The rows the window draws, each line's runs cut at the matches on it. */
export const rowsOf = (lines: readonly TerminalRun[][], marks: Marks): TerminalRow[] =>
  lines.map((line, at) => ({
    at,
    header: false,
    key: String(at),
    runs: markRuns(line.length === 0 ? [{ text: ' ' }] : line, marks.get(at) ?? []).map(
      (run, index) => {
        const color = paint(run.inverse ? (run.background ?? 'background') : run.color)
        const ground = paint(run.inverse ? (run.color ?? 'foreground') : run.background)
        return {
          backgroundName: ground.name,
          backgroundValue: ground.value,
          bold: run.bold === true,
          colorName: color.name,
          colorValue: color.value,
          current: run.current === true,
          cursor: run.cursor === true,
          dim: run.dim === true,
          italic: run.italic === true,
          key: String(index),
          match: run.match === true,
          strike: run.strike === true,
          text: run.text,
          underline: run.underline === true,
        }
      },
    ),
  }))

/** What the find bar holds and does. */
export interface Search {
  readonly close: () => void
  /** Which match is current and how many there are, in words, or nothing before a search. */
  readonly count: string
  /** The line of the current match, which the window moves to. */
  readonly current: number | undefined
  readonly fieldRef: { current: { focus?: () => void } | null }
  readonly marks: Marks
  readonly next: () => void
  readonly open: boolean
  readonly previous: () => void
  readonly query: string
  /** What a screen reader hears as the count changes. */
  readonly said: string
  readonly toggle: () => void
  readonly type: (query: string) => void
}

const NONE: Marks = new Map()

/**
 * The find bar's search through the lines: what is typed, the matches, the
 * current one, and the count in words. A match is counted once, on the line it
 * stands on, as Find's text search counts it.
 */
export const useSearch = (
  read: (name: string) => unknown,
  lines: readonly TerminalRun[][],
  found: (detail: { count: number; index: number }) => void,
): Search => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const fieldRef = useRef<{ focus?: () => void } | null>(null)
  const options = {
    caseSensitive: read('find-match-case') === true,
    regex: read('find-regex') === true,
    replace: '',
    search: query,
    wholeWord: read('find-whole-word') === true,
  }
  const key = `${options.caseSensitive} ${options.regex} ${options.wholeWord} ${query}`
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` holds the options.
  const matches = useMemo(
    () => (open && query !== '' ? findInLines(lines.map(runsText), options) : []),
    [key, lines, open],
  )
  const count = matches.length
  const at = count === 0 ? -1 : Math.min(index, count - 1)
  const invalid = open && query !== '' && options.regex && !queryReads(options)
  const words =
    !open || query === ''
      ? ''
      : invalid
        ? wordsIn(read('find-invalid-label'))
        : formatMessage(wordsIn(read('matches-label')), { count, index: at + 1 }, '')
  const told = useRef('')
  useEffect(() => {
    const now = `${at} ${count} ${key}`
    if (open && query !== '' && told.current !== now) {
      told.current = now
      found({ count, index: at })
    }
  })
  const marks = useMemo(() => {
    if (matches.length === 0) {
      return NONE
    }
    const byLine = new Map<number, { current: boolean; from: number; to: number }[]>()
    matches.forEach((match, place) => {
      const list = byLine.get(match.line) ?? []
      list.push({ current: place === at, from: match.from, to: match.to })
      byLine.set(match.line, list)
    })
    return byLine
  }, [at, matches])
  const step = useCallback(
    (by: number) =>
      setIndex((was) => (count === 0 ? 0 : (Math.min(was, count - 1) + by + count) % count)),
    [count],
  )
  return {
    close: () => setOpen(false),
    count: words,
    current: at < 0 ? undefined : matches[at]?.line,
    fieldRef,
    marks,
    next: () => step(1),
    open,
    previous: () => step(-1),
    query,
    said: words,
    toggle: () => {
      setOpen((was) => !was)
      requestAnimationFrame(() => fieldRef.current?.focus?.())
    },
    type: (next) => {
      setQuery(next)
      setIndex(0)
    },
  }
}
