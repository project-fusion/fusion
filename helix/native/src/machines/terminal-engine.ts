/**
 * What a phone's terminal draws from: `@xterm/headless`, xterm's parser and
 * buffer with no page, where the app installs it, and otherwise what was
 * written, as read-only lines.
 *
 * **The types are the frame's own**, the few members it reads, so a build of
 * this package does not need the optional peer's types.
 */
import { type LogStyle, parseAnsi } from '@fusion.dev/helix-core/log'
import { lineRuns, type TerminalLine, type TerminalRun } from '@fusion.dev/helix-core/terminal'
import { loadXterm } from '../capabilities/renderer'

/** A subscription `@xterm/headless` hands back. */
interface Disposable {
  dispose(): void
}

/** The buffer the emulator draws into, as far as the frame reads it. */
interface XtermBuffer {
  readonly baseY: number
  readonly cursorX: number
  readonly cursorY: number
  getLine(y: number): (TerminalLine & { translateToString(trim?: boolean): string }) | undefined
  readonly length: number
}

/** `@xterm/headless`'s `Terminal`, as far as the frame uses it. */
export interface Xterm {
  readonly buffer: { readonly active: XtermBuffer }
  clear(): void
  dispose(): void
  readonly modes: {
    readonly applicationCursorKeysMode: boolean
    readonly bracketedPasteMode: boolean
  }
  onBell(listener: () => void): Disposable
  onData(listener: (data: string) => void): Disposable
  onTitleChange(listener: (title: string) => void): Disposable
  reset(): void
  resize(columns: number, rows: number): void
  write(data: string | Uint8Array, done?: () => void): void
}

/** The package, as the frame loads it. */
export interface XtermModule {
  readonly Terminal: new (options: {
    allowProposedApi?: boolean
    cols: number
    rows: number
    scrollback: number
  }) => Xterm
}

/** What the emulator tells the frame. */
export interface Heard {
  readonly bell: () => void
  readonly data: (data: string) => void
  readonly title: (title: string) => void
}

/** What a phone's terminal draws from and writes to. */
export interface Engine {
  /** Whether the program asked for the cursor keys' application mode. */
  readonly applicationCursor: () => boolean
  /** Whether the program asked for bracketed paste. */
  readonly bracketed: () => boolean
  readonly clear: () => void
  readonly dispose: () => void
  /** Every line the scrollback holds, as runs, the cursor's cell its own run where `cursor`. */
  readonly lines: (cursor: boolean) => TerminalRun[][]
  readonly reset: () => void
  readonly resize: (columns: number, rows: number) => void
  /** The lines on screen, or every line, as plain text. */
  readonly text: (scope: 'all' | 'screen') => string
  readonly write: (data: string | Uint8Array, done: () => void) => void
}

/** How many lines the scrollback keeps on a phone, as many as xterm.js keeps on the web. */
export const SCROLLBACK = 1000

/** Output as text, where it came as bytes. */
const textOf = (data: string | Uint8Array): string => {
  if (typeof data === 'string') {
    return data
  }
  const Decoder = (
    globalThis as { TextDecoder?: new () => { decode: (bytes: Uint8Array) => string } }
  ).TextDecoder
  return Decoder === undefined ? String.fromCharCode(...data) : new Decoder().decode(data)
}

/** The lines below the cursor that hold nothing, which a screen not yet full has. */
const trimmed = (lines: TerminalRun[][], keep: number): TerminalRun[][] => {
  let end = lines.length
  while (end > keep + 1 && (lines[end - 1]?.length ?? 0) === 0) {
    end -= 1
  }
  return lines.slice(0, end)
}

/** The emulator, drawing into a buffer of `columns` by `rows`. */
const xtermEngine = (module: XtermModule, columns: number, rows: number, heard: Heard): Engine => {
  const term = new module.Terminal({
    allowProposedApi: true,
    cols: columns,
    rows,
    scrollback: SCROLLBACK,
  })
  const subscriptions = [
    term.onBell(() => heard.bell()),
    term.onData((data) => heard.data(data)),
    term.onTitleChange((title) => heard.title(title)),
  ]
  const lineAt = (y: number) => term.buffer.active.getLine(y)
  return {
    applicationCursor: () => term.modes.applicationCursorKeysMode,
    bracketed: () => term.modes.bracketedPasteMode,
    clear: () => term.clear(),
    dispose: () => {
      for (const one of subscriptions) {
        one.dispose()
      }
      term.dispose()
    },
    lines: (cursor) => {
      const buffer = term.buffer.active
      const at = buffer.baseY + buffer.cursorY
      const lines: TerminalRun[][] = []
      for (let y = 0; y < buffer.length; y += 1) {
        const line = lineAt(y)
        lines.push(
          line === undefined ? [] : lineRuns(line, cursor && y === at ? buffer.cursorX : undefined),
        )
      }
      return trimmed(lines, at)
    },
    reset: () => term.reset(),
    resize: (nextColumns, nextRows) => term.resize(nextColumns, nextRows),
    text: (scope) => {
      const buffer = term.buffer.active
      const from = scope === 'all' ? 0 : buffer.baseY
      const words: string[] = []
      for (let y = from; y < buffer.length; y += 1) {
        words.push(lineAt(y)?.translateToString(true) ?? '')
      }
      return words.join('\n').replace(/\n+$/, '')
    },
    write: (data, done) => term.write(data, done),
  }
}

/**
 * What was written, as read-only lines, for an app without `@xterm/headless`:
 * the colors and weights a program writes, a line to each line feed, and a
 * carriage return that starts its line again.
 */
export const stillEngine = (): Engine => {
  let lines: { runs: TerminalRun[]; style: LogStyle }[] = [{ runs: [], style: {} }]
  let style: LogStyle = {}
  return {
    applicationCursor: () => false,
    bracketed: () => false,
    clear: () => {
      lines = [lines.at(-1) ?? { runs: [], style }]
    },
    dispose: () => undefined,
    lines: () => lines.map((line) => line.runs),
    reset: () => {
      lines = [{ runs: [], style: {} }]
      style = {}
    },
    resize: () => undefined,
    text: () =>
      lines
        .map((line) => line.runs.map((run) => run.text).join(''))
        .join('\n')
        .replace(/\n+$/, ''),
    write: (data, done) => {
      const pieces = textOf(data).replace(/\r\n/g, '\n').split('\n')
      pieces.forEach((piece, at) => {
        if (at > 0) {
          lines.push({ runs: [], style })
        }
        const line = lines.at(-1) as { runs: TerminalRun[]; style: LogStyle }
        const restart = piece.lastIndexOf('\r')
        if (restart >= 0) {
          line.runs = []
        }
        const parsed = parseAnsi(restart >= 0 ? piece.slice(restart + 1) : piece, style)
        line.runs.push(...parsed.runs)
        style = parsed.style
      })
      lines = lines.slice(-SCROLLBACK)
      done()
    },
  }
}

/** The engine a phone's terminal draws from: the emulator where the app installs it, else the still lines. */
export const engineFor = (columns: number, rows: number, heard: Heard): Engine => {
  const module = loadXterm()
  return module === null ? stillEngine() : xtermEngine(module, columns, rows, heard)
}
