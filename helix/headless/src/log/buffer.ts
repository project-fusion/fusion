import { type LogRun, type LogStyle, parseAnsi } from './ansi.js'

/** How much a line matters, which a stylesheet draws and a screen reader may hear. */
export type LogLevel = 'debug' | 'error' | 'info' | 'warn'

/** Where a step of the run stands. */
export type LogStatus = 'done' | 'failed' | 'pending' | 'running' | 'skipped'

/** One line of output, as `lines` holds it and `parse` returns it. */
export interface LogLine {
  /** When it was written: milliseconds since the epoch, or anything `Date` parses. */
  at?: number | string
  /** The `id` of the group in `groups` the line belongs to. */
  group?: string
  /** How much it matters. Absent is `info`. */
  level?: LogLevel
  /** What was written, with any ANSI escape codes still in it. */
  text: string
}

/** One step of the run, which folds the lines that name its `id`. */
export interface LogGroup {
  /** How long the step took, as it should read, such as `12s`. */
  duration?: string
  /** What the step is called. */
  heading: string
  /** What its lines name in `group`. */
  id: string
  /**
   * Whether it is open. Read the first time the log sees the group, and again
   * whenever it changes, so a page can open the step that failed.
   */
  open?: boolean
  /** Where it stands. */
  status?: LogStatus
}

/**
 * Reads one finished line of written text and says what it is.
 *
 * Return the fields to set, such as a `level` read off a prefix or a `group`
 * read off a marker, and `text` to show something else. Return `null` to drop
 * the line, such as a marker that only opens a group.
 */
export type LogParser = (text: string) => Partial<LogLine> | null | undefined

/**
 * The text of a run, kept as lines.
 *
 * **Written text arrives in pieces that do not end at line breaks**, so the
 * line still being written is held apart and shown as it stands, the way a
 * terminal shows a prompt or a progress bar before its line ends. A line is
 * finished by `\n` or `\r\n`.
 *
 * **A carriage return on its own starts the line over.** A progress bar is
 * one line rewritten a hundred times, and drawing each rewrite as a line of
 * its own is the failure every log viewer is judged by. The text after the
 * last `\r` replaces the line. A terminal overwrites only as many characters
 * as were written, so `abc\rxy` reads `xyc` there and `xy` here; a program
 * that redraws a line writes the whole line, which reads the same in both.
 *
 * **Color carries from line to line**, as it does in a terminal, so a block
 * that opens with green and closes many lines later is green throughout. It
 * carries through text a carriage return replaced as well.
 */
export class LogBuffer {
  /** The finished lines kept, oldest first. */
  lines: LogLine[] = []

  /** How many finished lines were let go from the start to stay within `limit`. */
  dropped = 0

  /** The most finished lines kept, or 0 to keep them all. */
  limit = 0

  /** Reads each finished line of written text. */
  parse: LogParser | undefined = undefined

  /** The line still being written, as it reads now. */
  private partial = ''

  /** Whether the next text written starts the line over. */
  private returned = false

  /** The style the line being written started in. */
  private lineStyle: LogStyle = {}

  /** The runs of each line, read once. */
  private readonly runs = new WeakMap<LogLine, LogRun[]>()

  /** The line `current` last returned, which stands until the text changes. */
  private shown: LogLine | undefined = undefined

  /**
   * Adds text, finishing a line at every line break, and returns how many
   * lines it finished.
   */
  write(chunk: string): number {
    let finished = 0
    for (const token of chunk.split(/(\r\n|\n|\r)/)) {
      if (token === '\n' || token === '\r\n') {
        this.finish()
        finished += 1
      } else if (token === '\r') {
        this.returned = true
      } else if (token !== '') {
        if (this.returned) {
          this.lineStyle = parseAnsi(this.partial, this.lineStyle).style
          this.partial = token
          this.returned = false
        } else {
          this.partial += token
        }
      }
    }
    this.trim()
    return finished
  }

  /** Replaces every line, starting a fresh buffer that keeps its `parse` and `limit`. */
  replace(lines: readonly LogLine[]): void {
    this.lines = [...lines]
    this.dropped = 0
    this.partial = ''
    this.returned = false
    this.lineStyle = {}
    this.shown = undefined
    this.trim()
  }

  /** Lets every line go. */
  clear(): void {
    this.replace([])
  }

  /** The line still being written, or undefined where the last line ended. */
  current(): LogLine | undefined {
    if (this.partial === '') {
      return undefined
    }
    const group = this.lines.at(-1)?.group
    if (this.shown?.text !== this.partial || this.shown.group !== group) {
      this.shown = group === undefined ? { text: this.partial } : { group, text: this.partial }
    }
    return this.shown
  }

  /**
   * The runs a line is drawn in. A written line was read with the color the
   * line before it left; a line handed over in `lines` starts plain.
   */
  runsOf(line: LogLine): LogRun[] {
    if (line === this.shown) {
      return parseAnsi(line.text, this.lineStyle).runs
    }
    const known = this.runs.get(line)
    if (known) {
      return known
    }
    const { runs } = parseAnsi(line.text)
    this.runs.set(line, runs)
    return runs
  }

  /** Finishes the line being written. */
  private finish(): void {
    const raw = this.partial
    const flow = parseAnsi(raw, this.lineStyle)
    this.partial = ''
    this.returned = false
    const read = this.parse?.(raw)
    if (read !== null) {
      const line: LogLine = { ...read, text: read?.text ?? raw }
      this.runs.set(line, line.text === raw ? flow.runs : parseAnsi(line.text, this.lineStyle).runs)
      this.lines.push(line)
    }
    this.lineStyle = flow.style
  }

  /** Lets the oldest lines go past `limit`, all at once. */
  private trim(): void {
    const over = this.limit > 0 ? this.lines.length - this.limit : 0
    if (over > 0) {
      this.lines.splice(0, over)
      this.dropped += over
    }
  }
}
