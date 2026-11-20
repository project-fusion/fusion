/**
 * A terminal's screen as runs of text in one style each, read from an
 * emulator's buffer, and a search through its lines. A phone draws the runs
 * as text, so a screen reader reads them and a reader selects them, where the
 * web's renderer paints a canvas.
 */
import { type FindQuery, findPattern, findRanges } from '../find-text/find-text.js'
import { ANSI_NAMES, type LogRun, paletteColor } from '../log/ansi.js'

/** One cell of an emulator's buffer, as `@xterm/headless` hands it out. */
export interface TerminalCell {
  getBgColor(): number
  getChars(): string
  getFgColor(): number
  /** The cell's width: 2 for a wide character, and 0 for the cell after one. */
  getWidth(): number
  isBgPalette(): boolean
  isBgRGB(): boolean
  isBold(): number
  isDim(): number
  isFgPalette(): boolean
  isFgRGB(): boolean
  isInverse(): number
  isInvisible(): number
  isItalic(): number
  isStrikethrough(): number
  isUnderline(): number
}

/** One line of an emulator's buffer. */
export interface TerminalLine {
  getCell(x: number): TerminalCell | undefined
  readonly length: number
}

/** A run of a terminal's line: Log's run, and the cursor where it stands on it. */
export interface TerminalRun extends LogRun {
  /** Whether the run is the cell the cursor stands on. */
  cursor?: boolean
  /** Whether the run is the current match of a search, which is also a match. */
  current?: boolean
  /** Whether the run is in a match of a search. */
  match?: boolean
}

/** A palette color by its index, as Log names it, bold turning the first eight bright. */
const palette = (index: number, bright: boolean): string | undefined =>
  paletteColor(bright && index < 8 ? index + 8 : index)

/** A 24-bit color as CSS. */
const rgb = (value: number): string =>
  `rgb(${(value >> 16) & 255} ${(value >> 8) & 255} ${value & 255})`

/**
 * The style a cell is drawn in, as Log's runs carry it: a named ANSI color by
 * its name, any other as CSS, and none for the terminal's own.
 *
 * **Bold draws the first eight colors bright**, as xterm.js does by default,
 * so a program's bold red reads as the web's.
 */
const styleOf = (cell: TerminalCell): Omit<LogRun, 'text'> => {
  const bold = cell.isBold() !== 0
  const style: { -readonly [K in keyof LogRun]?: LogRun[K] } = {}
  const color = cell.isFgPalette()
    ? palette(cell.getFgColor(), bold)
    : cell.isFgRGB()
      ? rgb(cell.getFgColor())
      : undefined
  const background = cell.isBgPalette()
    ? palette(cell.getBgColor(), false)
    : cell.isBgRGB()
      ? rgb(cell.getBgColor())
      : undefined
  if (color !== undefined) {
    style.color = color
  }
  if (background !== undefined) {
    style.background = background
  }
  if (bold) {
    style.bold = true
  }
  if (cell.isDim() !== 0) {
    style.dim = true
  }
  if (cell.isItalic() !== 0) {
    style.italic = true
  }
  if (cell.isUnderline() !== 0) {
    style.underline = true
  }
  if (cell.isStrikethrough() !== 0) {
    style.strike = true
  }
  if (cell.isInverse() !== 0) {
    style.inverse = true
  }
  return style
}

/** A key that two cells share exactly when they are drawn alike. */
const keyOf = (style: Omit<LogRun, 'text'>): string =>
  [
    style.color,
    style.background,
    style.bold,
    style.dim,
    style.italic,
    style.underline,
    style.strike,
    style.inverse,
  ].join('|')

/** Whether a run draws nothing past its text: no ground, no line, no inversion. */
const bare = (run: LogRun): boolean =>
  run.background === undefined &&
  run.inverse !== true &&
  run.underline !== true &&
  run.strike !== true

/**
 * A line as runs, each a stretch of cells drawn alike. The cell after a wide
 * character is left out, so each character is one in the text, and an empty
 * cell is a space. Spaces at the end that draw nothing are dropped, so a line
 * is as long as what it shows.
 *
 * `cursor` is the column the cursor stands on, where it is on this line: that
 * cell is a run of its own, a space past the end of what the line holds.
 */
export const lineRuns = (line: TerminalLine, cursor?: number): TerminalRun[] => {
  const runs: TerminalRun[] = []
  let key = ''
  for (let x = 0; x < line.length; x += 1) {
    const cell = line.getCell(x)
    if (cell === undefined || cell.getWidth() === 0) {
      continue
    }
    const style = styleOf(cell)
    const chars = cell.isInvisible() !== 0 ? ' ' : cell.getChars() || ' '
    const at = x === cursor
    const next = at ? 'cursor' : keyOf(style)
    const last = runs.at(-1)
    if (last !== undefined && next === key && !at) {
      last.text += chars
    } else {
      runs.push(at ? { ...style, cursor: true, text: chars } : { ...style, text: chars })
    }
    key = at ? 'cursor' : next
  }
  /* The spaces at the end that draw nothing, short of the cursor. */
  while (runs.length > 0) {
    const last = runs.at(-1) as TerminalRun
    if (last.cursor === true || !bare(last)) {
      break
    }
    const kept = last.text.replace(/ +$/, '')
    if (kept !== '') {
      last.text = kept
      break
    }
    runs.pop()
  }
  if (cursor !== undefined && cursor >= line.length && !runs.some((run) => run.cursor)) {
    runs.push({ cursor: true, text: ' ' })
  }
  return runs
}

/** A line's text, as its runs hold it. */
export const runsText = (runs: readonly LogRun[]): string => runs.map((run) => run.text).join('')

/** A match of a search: its line, and where it starts and ends in that line's text. */
export interface TerminalMatch {
  readonly from: number
  readonly line: number
  readonly to: number
}

/**
 * Every match of `query` in the lines, in reading order. A match does not run
 * from one line onto the next.
 */
export const findInLines = (lines: readonly string[], query: FindQuery): TerminalMatch[] =>
  lines.flatMap((text, line) => findRanges(text, query).map(([from, to]) => ({ from, line, to })))

/** Whether a query reads as a search: not empty, and, as a regular expression, one JavaScript reads. */
export const queryReads = (query: FindQuery): boolean => findPattern(query) !== undefined

/**
 * A line's runs cut where the matches on it start and end, each piece in a
 * match marked, and the current one marked again.
 */
export const markRuns = (
  runs: readonly TerminalRun[],
  matches: readonly { readonly current: boolean; readonly from: number; readonly to: number }[],
): TerminalRun[] => {
  if (matches.length === 0) {
    return [...runs]
  }
  const cuts = new Set<number>()
  for (const match of matches) {
    cuts.add(match.from)
    cuts.add(match.to)
  }
  const pieces: TerminalRun[] = []
  let offset = 0
  for (const run of runs) {
    const end = offset + run.text.length
    const inside = [...cuts].filter((cut) => cut > offset && cut < end).sort((a, b) => a - b)
    let from = offset
    for (const to of [...inside, end]) {
      const found = matches.find((match) => match.from <= from && match.to >= to)
      const piece: TerminalRun = { ...run, text: run.text.slice(from - offset, to - offset) }
      if (found !== undefined) {
        piece.match = true
        if (found.current) {
          piece.current = true
        }
      }
      pieces.push(piece)
      from = to
    }
    offset = end
  }
  return pieces
}

/** The name a color goes by in the stylesheet, or `undefined` for one written as CSS. */
export const ansiName = (color: string | undefined): string | undefined =>
  color !== undefined && (ANSI_NAMES as readonly string[]).includes(color) ? color : undefined
