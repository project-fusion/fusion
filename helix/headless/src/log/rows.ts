import { type LogRun, stripAnsi } from './ansi.js'
import type { LogGroup, LogLine } from './buffer.js'

/** One row of a log drawn from data: a line, or the heading of a group. */
export type LogRow =
  | {
      /** The group, as `groups` holds it. */
      group: LogGroup
      kind: 'group'
      /** Whether its lines are shown. */
      open: boolean
    }
  | {
      kind: 'line'
      line: LogLine
      /** Its number, counted from the first line ever written, so a link to it holds. */
      number: number
    }

/** What a log drawn from data shows, and how many of its lines a search matched. */
export interface LogRows {
  /** How many lines match `query`, or every line where there is none. */
  matched: number
  rows: LogRow[]
}

/** What `logRows` reads. */
export interface LogRowsInput {
  /** The line still being written, shown after the rest. */
  current?: LogLine | undefined
  /** The groups the lines name. */
  groups: readonly LogGroup[]
  /** The finished lines, oldest first. */
  lines: readonly LogLine[]
  /** Whether a group shows its lines. */
  open: (id: string) => boolean
  /** Text a line has to hold to be shown, ignoring case. Empty shows every line. */
  query: string
  /** How many lines were let go before the first, which numbers the rest. */
  start: number
}

/**
 * Each line's text with its escape codes taken out, lowercased, read once.
 *
 * **Once per line, and not once per search.** A log keeps writing while a
 * query is set, and every line it writes lays the rows out again: measured in
 * Chromium on 100,000 lines, reading the text afresh each time took a second a
 * pass, and the log stopped following the run.
 */
const plain = new WeakMap<LogLine, string>()

/** Whether a line's text holds `needle`, already lowercased. */
const holds = (line: LogLine, needle: string): boolean => {
  if (needle === '') {
    return true
  }
  let text = plain.get(line)
  if (text === undefined) {
    text = stripAnsi(line.text).toLowerCase()
    plain.set(line, text)
  }
  return text.includes(needle)
}

/**
 * Lays the lines out as rows, a group's heading before its first line.
 *
 * **A group stands where its first line is.** A group in `groups` with no line
 * yet stands after every line, in the order `groups` gives, which is the step
 * that has started and written nothing, where it comes after every group that
 * has a line. A line naming a group nobody declared is drawn with no heading.
 *
 * **A search opens every group and shows only what matched.** A group shows
 * its heading while it holds a match, so a match inside a folded step is found
 * where it is rather than hidden by the fold. A group with no match is left
 * out, heading and all.
 */
export const logRows = ({ current, groups, lines, open, query, start }: LogRowsInput): LogRows => {
  const needle = query.trim().toLowerCase()
  const byId = new Map(groups.map((group) => [group.id, group]))
  const all = current ? [...lines, current] : lines
  const hits = new Set<string>()
  const matches = needle === '' ? undefined : all.map((line) => holds(line, needle))
  let matched = 0
  if (matches) {
    all.forEach((line, index) => {
      if (matches[index]) {
        matched += 1
        if (line.group !== undefined) {
          hits.add(line.group)
        }
      }
    })
  }
  const rows: LogRow[] = []
  const placed = new Set<string>()
  for (let index = 0; index < all.length; index += 1) {
    const line = all[index] as LogLine
    const group = line.group === undefined ? undefined : byId.get(line.group)
    if (group && !placed.has(group.id)) {
      placed.add(group.id)
      if (needle === '' || hits.has(group.id)) {
        rows.push({ group, kind: 'group', open: needle !== '' || open(group.id) })
      }
    }
    const shown = group === undefined || needle !== '' || open(group.id)
    if (shown && (matches?.[index] ?? true)) {
      rows.push({ kind: 'line', line, number: start + index + 1 })
    }
  }
  if (needle === '') {
    /* Only the groups after the last one with a line, which are the steps to
       come. One before it with no line left is a step whose lines were all
       let go, and standing it at the end would put it after its successors. */
    const last = groups.findLastIndex((group) => placed.has(group.id))
    for (const group of groups.slice(last + 1)) {
      rows.push({ group, kind: 'group', open: open(group.id) })
    }
  }
  return { matched: needle === '' ? all.length : matched, rows }
}

/** A run, and whether it is part of a match. */
export interface LogPiece extends LogRun {
  /** Whether the text matches the search. */
  match?: boolean
}

/**
 * Splits runs where the search matches, ignoring case, so each match can be
 * marked. Runs are returned as they are where there is no search.
 */
export const markMatches = (runs: readonly LogRun[], query: string): LogPiece[] => {
  const needle = query.trim().toLowerCase()
  if (needle === '') {
    return [...runs]
  }
  const text = runs.map((run) => run.text).join('')
  const lower = text.toLowerCase()
  const ranges: Array<[number, number]> = []
  for (let at = lower.indexOf(needle); at >= 0; at = lower.indexOf(needle, at + needle.length)) {
    ranges.push([at, at + needle.length])
  }
  if (ranges.length === 0) {
    return [...runs]
  }
  const pieces: LogPiece[] = []
  let offset = 0
  for (const run of runs) {
    const end = offset + run.text.length
    let from = offset
    for (const [first, last] of ranges) {
      if (last <= from || first >= end) {
        continue
      }
      if (first > from) {
        pieces.push({ ...run, text: text.slice(from, first) })
      }
      const to = Math.min(last, end)
      pieces.push({ ...run, match: true, text: text.slice(Math.max(first, from), to) })
      from = to
    }
    if (from < end) {
      pieces.push({ ...run, text: text.slice(from, end) })
    }
    offset = end
  }
  return pieces
}
