import {
  customElement,
  drawIcon,
  formatWords,
  HelixBeforePinEvent,
  HelixElement,
  HelixExpandEvent,
  HelixPinEvent,
  hostAria,
  MixinCollection,
  onUnlessFalse,
  requestChange,
  SCROLLER_RULE,
  VIRTUAL_RULE,
  VirtualizeController,
  whenHydrated,
  words,
} from '@fusion.dev/helix-core'
import { arrowDown } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { keyed } from 'lit/directives/keyed.js'
import { repeat } from 'lit/directives/repeat.js'
/* `static-html`'s `html`, because a row is drawn with the tier's own line and
   group tags, and an interpolated tag is a static value. */
import { html } from 'lit/static-html.js'
import { lineRuns } from '../../code-block/lines.js'
import { stripAnsi } from '../ansi.js'
import {
  LogBuffer,
  type LogGroup,
  type LogLine,
  type LogParser,
  type LogStatus,
} from '../buffer.js'
import type { HelixHeadlessLogGroup } from '../group/log-group.js'
import { type HelixHeadlessLogLine, type LogTimes, timeOf } from '../line/log-line.js'
import { type LogRow, type LogRows, logRows } from '../rows.js'

/** Text a log reads as it arrives: a stream, or anything `for await` reads. */
export type LogSource = AsyncIterable<string | Uint8Array> | ReadableStream<string | Uint8Array>

/** Where `scrollToLine` puts the line, and how it gets there. */
export interface LogScrollOptions {
  /** Where the line lands in the box. `center` by default. */
  align?: 'center' | 'end' | 'nearest' | 'start'
  /** The platform's scroll behavior. Instant when left out. */
  behavior?: ScrollBehavior
}

/**
 * What a drawn group's parts are called a second time while it holds a
 * status, so a stylesheet outside the log can draw a failed step apart.
 *
 * **Literal `inner: outer` lists**, because `helix component` reads them here
 * to hold each name to its prefix and its `@csspart`.
 */
const STATUS_NAMES = {
  done: 'summary: group-summary-done',
  failed: 'summary: group-summary-failed',
  pending: 'summary: group-summary-pending',
  running: 'summary: group-summary-running',
  skipped: 'summary: group-summary-skipped',
} as const

/** The second names `table` holds for `key`, as the tail of an `exportparts` list. */
const secondNames = (table: Readonly<Record<string, string>>, key: string | undefined): string =>
  key !== undefined && Object.hasOwn(table, key) ? `, ${table[key]}` : ''

/** Whether `number` is in the runs `mark-lines` names. */
const inRuns = (runs: ReadonlyArray<[number, number]>, number: number): boolean =>
  runs.some(([first, last]) => number >= first && number <= last)

/** What the status region compares between one update and the next. */
interface Heard {
  done: boolean
  /** Every group's status, by what identifies it. */
  groups: Map<unknown, { heading: string; status: LogStatus | undefined }>
  matched: number
  query: string
  /** How many lines have ever been finished. */
  total: number
}

/**
 * @summary Output that arrives while you watch it, such as a CI run, a deployment, or a build, in a box that follows the newest line.
 *
 * @description
 * A log holds lines in the order they were written and keeps the reader at
 * the newest one, until they scroll up to read. It stays where they left it
 * while lines keep arriving, and a button returns them to the end
 * (`resume-label`, "Jump to latest").
 *
 * **Lines arrive two ways.** For a log you serve whole, write `Log.Line`
 * elements as children, inside `Log.Group` elements for the steps. For a log
 * that is still being written, hand it text: `write(chunk)` takes text as it
 * arrives, in pieces that need not end at a line break, and `source` takes a
 * `ReadableStream` or an async iterable and reads it to the end. `lines` takes
 * the lines as data. Text drawn from data is drawn one window at a time, so a
 * log of a hundred thousand lines holds a screenful of elements, and the log
 * needs a block size of its own. Do not use both ways at once.
 *
 * **Written text is read the way a terminal shows it.** A carriage return
 * starts the line over, so a progress bar stays one line, and the line still
 * being written is shown as it stands. ANSI colors and weights are drawn, in
 * the sixteen colors the styled tier takes from your theme, and every other
 * escape code is dropped. Give `parse` a function to read each finished line,
 * such as a level off its prefix or a group off a marker.
 *
 * **Steps fold.** Lines that name a group in `groups` stand under its heading,
 * which shows its status and how long it took and opens and closes the lines.
 * A group a reader opens or closes fires `helix-expand` with every open group.
 *
 * **Search with `query`.** The log shows only the lines that hold it, marks
 * each match, opens the groups that hold one, and says how many lines match.
 *
 * `line-numbers` numbers the lines from the first ever written, so a number
 * still names its line once `limit` has let older lines go, and `line-href`
 * makes each number a link, such as `#L{n}`. `scrollToLine(n)` takes a reader
 * to one. `timestamps` shows each line's `at`, on the clock or as the time
 * into the run. `mark-lines` marks lines, such as `12, 40-44`.
 *
 * **What a screen reader hears.** The log is a `log` and stays quiet as lines
 * arrive, since reading a build aloud line by line helps nobody. A separate
 * status region says each line at `error` once it arrives, each step once it
 * finishes or fails, and the end of the run once `done` is set or `source`
 * ends. Set `done` yourself when output you `write` is complete.
 *
 * The log scrolls on this tier. It carries `data-scroller`, so following the
 * newest line and drawing a window work with no stylesheet. Give the log a
 * block size, such as `helix-headless-log::part(log) { block-size: 20rem }`.
 *
 * ```js
 * import '@fusion.dev/helix/log'
 * ```
 *
 * @since 0.199.0
 * @status experimental
 * @category feedback
 * @aliases Console, Terminal output, Build log, Deploy log, Log viewer, Output
 * @documentation https://fusion.dev/helix/components/log
 *
 * @slot - The lines, as `Log.Line` and `Log.Group` elements.
 * @slot resume - The control that returns to the newest line, shown while the reader is scrolled away. Defaults to a button named by `resume-label`.
 * @slot toolbar - Controls above the log, such as a search field or a button that wraps lines.
 *
 * @event {HelixBeforePinEvent} helix-before-pin - Fired when the reader leaves the newest line by scrolling, or comes back to it. Cancelable.
 * @event {HelixExpandEvent} helix-expand - Fired after a reader opens or closes a group drawn from `groups`, with the `id` of every open group in `detail.value`, separated by commas.
 * @event {HelixPinEvent} helix-pin - Fired after the log follows the newest line or lets go of it, with `true` or `false` in `detail.value`.
 *
 * @csspart after - The space the rows below the drawn ones would take. Only for lines drawn from data.
 * @csspart before - The space the rows above the drawn ones would take. Only for lines drawn from data.
 * @csspart dropped - The line above the log that says how many earlier lines `limit` let go.
 * @csspart empty - Shown when the log has no lines.
 * @csspart group-content - Not drawn: a group drawn from data stands for its heading, and its lines are rows beside it.
 * @csspart group-duration - How long a step drawn from `groups` took.
 * @csspart group-heading - The heading of a step drawn from `groups`.
 * @csspart group-mark - The caret of a step drawn from `groups`.
 * @csspart group-status - The status mark of a step drawn from `groups`.
 * @csspart group-summary - The button that opens and closes a step drawn from `groups`.
 * @csspart group-summary-done - The button of a step drawn from `groups` that is `done`.
 * @csspart group-summary-failed - The button of a step drawn from `groups` that `failed`.
 * @csspart group-summary-pending - The button of a step drawn from `groups` that is `pending`.
 * @csspart group-summary-running - The button of a step drawn from `groups` that is `running`.
 * @csspart group-summary-skipped - The button of a step drawn from `groups` that was `skipped`.
 * @csspart line - The row of a line drawn from data.
 * @csspart line-debug - The row of a line drawn from data at `debug`.
 * @csspart line-error - The row of a line drawn from data at `error`.
 * @csspart line-marked - The row of a line drawn from data that `mark-lines` names.
 * @csspart line-match - Text in a line drawn from data that matches `query`.
 * @csspart line-number - The number of a line drawn from data.
 * @csspart line-run - A stretch of a line drawn from data in an ANSI style.
 * @csspart line-run-bold - A run drawn bold.
 * @csspart line-run-dim - A run drawn faint.
 * @csspart line-run-italic - A run drawn italic.
 * @csspart line-run-strike - A run drawn struck through.
 * @csspart line-run-underline - A run drawn underlined.
 * @csspart line-text - The text of a line drawn from data.
 * @csspart line-time - The time of a line drawn from data.
 * @csspart line-warn - The row of a line drawn from data at `warn`.
 * @csspart live - The region where screen readers hear errors, finished steps, and the end of the run.
 * @csspart loading - Shown while `loading` is set.
 * @csspart log - The lines, which scroll. On this tier, it needs only a block size.
 * @csspart resume - The control shown while the reader is scrolled away from the newest line.
 * @csspart resume-button - The button the `resume` region shows when nothing is slotted into it.
 * @csspart resume-mark - The arrow on the default `resume-button`.
 * @csspart row - The wrapper around one row drawn from data, a line or a group's heading.
 * @csspart toolbar - The `toolbar` slot, above the log.
 *
 * @cssproperty --log-ansi-background - The background a run takes where ANSI swaps the colors and named none. Defaults to the log's own background on the styled tier.
 * @cssproperty --log-ansi-black - The ANSI color black, which codes `30` and `40` draw.
 * @cssproperty --log-ansi-blue - The ANSI color blue, which codes `34` and `44` draw.
 * @cssproperty --log-ansi-bright-black - The ANSI color bright black, which codes `90` and `100` draw.
 * @cssproperty --log-ansi-bright-blue - The ANSI color bright blue, which codes `94` and `104` draw.
 * @cssproperty --log-ansi-bright-cyan - The ANSI color bright cyan, which codes `96` and `106` draw.
 * @cssproperty --log-ansi-bright-green - The ANSI color bright green, which codes `92` and `102` draw.
 * @cssproperty --log-ansi-bright-magenta - The ANSI color bright magenta, which codes `95` and `105` draw.
 * @cssproperty --log-ansi-bright-red - The ANSI color bright red, which codes `91` and `101` draw.
 * @cssproperty --log-ansi-bright-white - The ANSI color bright white, which codes `97` and `107` draw.
 * @cssproperty --log-ansi-bright-yellow - The ANSI color bright yellow, which codes `93` and `103` draw.
 * @cssproperty --log-ansi-cyan - The ANSI color cyan, which codes `36` and `46` draw.
 * @cssproperty --log-ansi-foreground - The text color a run takes where ANSI swaps the colors and named none. Defaults to the log's own text color on the styled tier.
 * @cssproperty --log-ansi-green - The ANSI color green, which codes `32` and `42` draw.
 * @cssproperty --log-ansi-magenta - The ANSI color magenta, which codes `35` and `45` draw.
 * @cssproperty --log-ansi-red - The ANSI color red, which codes `31` and `41` draw.
 * @cssproperty --log-ansi-white - The ANSI color white, which codes `37` and `47` draw.
 * @cssproperty --log-ansi-yellow - The ANSI color yellow, which codes `33` and `43` draw.
 * @cssproperty --log-digits - Written on the `log`: how many digits the largest line number has, while `line-numbers` is set, so a stylesheet can size the column of numbers.
 *
 * @cssstate done - The run is over: `done` is set, or `source` ended.
 * @cssstate empty - The log has no lines.
 * @cssstate filtered - `query` is set, so only matching lines are shown.
 * @cssstate pinned - The log follows its newest line.
 */
@customElement('helix-headless-log')
export class HelixHeadlessLog extends MixinCollection(HelixElement) {
  protected static override markRules = [SCROLLER_RULE, VIRTUAL_RULE]

  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-log': { resumeLabel: 'Zum Ende' } })`.
   */
  static words = 'helix-log'

  /** How tall a row is assumed to be before one has been drawn, in pixels. */
  static readonly ESTIMATE = 20

  /**
   * Whether the log opens following its newest line, when `pinned` is not set.
   * `default-pinned="false"` opens it where it starts.
   */
  @property({ attribute: 'default-pinned', converter: onUnlessFalse })
  defaultPinned = true

  /**
   * Whether the run is over, which a screen reader is told once.
   *
   * Set it when output you `write` is complete. A `source` sets it when the
   * stream ends.
   */
  @property({ type: Boolean })
  get done(): boolean {
    return this.doneState ?? false
  }

  set done(next: boolean) {
    const previous = this.done
    this.doneState = next
    this.requestUpdate('done', previous)
  }

  /** What a screen reader hears when the run is over. */
  @words
  @property({ attribute: 'done-label' })
  doneLabel = 'Finished'

  /** What the line above the log says once `limit` has let lines go. `{count}` is how many. */
  @words
  @property({ attribute: 'dropped-label' })
  droppedLabel = '{count, plural, one {# earlier line is} other {# earlier lines are}} not kept'

  /** The text shown and announced when the log has no lines. */
  @words
  @property({ attribute: 'empty-text' })
  override emptyText = 'No output yet'

  /**
   * What a screen reader hears when lines at `error` arrive. `{count}` is how
   * many arrived together and `{text}` is the first of them.
   */
  @words
  @property({ attribute: 'error-label' })
  errorLabel = '{count, plural, one {Error} other {# errors}}: {text}'

  /** The log's name, read by screen readers, where `label` is empty. */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Log'

  /**
   * What a screen reader hears when a step finishes or fails. `{heading}` is
   * the step's heading and `{status}` is `done` or `failed`.
   */
  @words
  @property({ attribute: 'group-label' })
  groupLabel = '{status, select, failed {{heading} failed} other {{heading} finished}}'

  /**
   * The steps the lines from data name in `group`. A step stands where its
   * first line is, and one with no line yet stands at the end.
   *
   * Replaced rather than mutated, as `lines` is: a step finishing is a new
   * array with its `status` changed.
   */
  @property({ attribute: false })
  groups: readonly LogGroup[] = []

  /** The log's name, read by screen readers. */
  @property()
  label = ''

  /**
   * The most lines kept, or 0 to keep them all. Past it the oldest lines are
   * let go, and the line above the log says how many.
   */
  @property({ type: Number })
  limit = 0

  /**
   * A link for each line number, with `{n}` where the number goes, such as
   * `#L{n}`. Empty leaves the numbers as text.
   */
  @property({ attribute: 'line-href' })
  lineHref = ''

  /**
   * What a screen reader hears for the link on a line's number, handed to each
   * line the log draws. `{number}` is the number.
   */
  @words
  @property({ attribute: 'line-label' })
  lineLabel = 'Line {number}'

  /** Whether each line shows its number. */
  @property({ attribute: 'line-numbers', type: Boolean })
  lineNumbers = false

  /**
   * The lines as data. Reading it gives every line kept, oldest first, with
   * the line still being written left out.
   *
   * Replaced rather than mutated: setting it starts the log over with these
   * lines, and `write` adds to them. Set it or write children, not both.
   */
  @property({ attribute: false })
  get lines(): readonly LogLine[] {
    return this.buffer.lines
  }

  set lines(next: readonly LogLine[]) {
    const previous = this.buffer.lines
    this.buffer.replace(next ?? [])
    this.fresh = true
    this.requestUpdate('lines', previous)
  }

  /** Lines to mark, as numbers and ranges such as `12, 40-44`. */
  @property({ attribute: 'mark-lines' })
  markLines = ''

  /** What a screen reader hears when `query` changes. `{count}` is how many lines match. */
  @words
  @property({ attribute: 'matches-label' })
  matchesLabel = '{count, plural, =0 {No lines match} one {# line matches} other {# lines match}}'

  /**
   * Reads each finished line of written text: return the fields to set, such
   * as `level` or `group`, or `null` to drop the line. Lines in `lines` are
   * taken as they are.
   */
  @property({ attribute: false })
  get parse(): LogParser | undefined {
    return this.buffer.parse
  }

  /* Handed to the buffer at once, since text written straight after the
     assignment is read before the next update. */
  set parse(next: LogParser | undefined) {
    const previous = this.buffer.parse
    this.buffer.parse = next
    this.requestUpdate('parse', previous)
  }

  /**
   * Whether the log follows its newest line.
   *
   * The reader's scrolling asks first: `helix-before-pin` is cancelable, so a
   * consumer refusing it takes the decision and assigns their own value. Not
   * reflected, for the reason `Chat` gives at its own `pinned`: a default of
   * true would write the attribute on upgrade.
   */
  @property({ type: Boolean })
  get pinned(): boolean {
    return this.pinnedState ?? this.defaultPinned
  }

  set pinned(next: boolean) {
    const previous = this.pinned
    this.pinnedState = next
    this.requestUpdate('pinned', previous)
  }

  /** Text a line has to hold to be shown, ignoring case. Empty shows every line. */
  @property()
  query = ''

  /** The words on the button that returns to the newest line, where `resume` is empty. */
  @words
  @property({ attribute: 'resume-label' })
  resumeLabel = 'Jump to latest'

  /**
   * Text to read as it arrives, to the end: a `ReadableStream` of text or
   * bytes, such as a `fetch` response's body, or an async iterable. Bytes are
   * read as UTF-8. The log sets `done` when it ends, and a new source stops
   * reading the last one.
   */
  @property({ attribute: false })
  get source(): LogSource | null {
    return this.sourceValue
  }

  set source(next: LogSource | null) {
    const previous = this.sourceValue
    this.sourceValue = next ?? null
    this.requestUpdate('source', previous)
    if (this.isConnected && next !== previous) {
      void this.readSource(this.sourceValue)
    }
  }

  /** How near the newest line still counts as being at it, in pixels. */
  @property({ type: Number })
  threshold = 48

  /**
   * How each line shows its `at`: `absolute` on the clock, `relative` as the
   * time since the first line. Absent shows no time.
   */
  @property()
  timestamps?: LogTimes

  /** Whether a line longer than the box wraps onto the next row. Otherwise the log scrolls sideways. */
  @property({ reflect: true, type: Boolean })
  wrap = false

  @state()
  private pinnedState: boolean | undefined = undefined

  @state()
  private doneState: boolean | undefined = undefined

  /** Whether a source is being read, which the log says with `aria-busy`. */
  @state()
  private reading = false

  /** The last thing said, and how many times something has been. */
  @state()
  private announcement = ''

  @state()
  private said = 0

  /** The text written and handed over as data. */
  private readonly buffer = new LogBuffer()

  private sourceValue: LogSource | null = null

  /** Which read of a source is current, so an older one stops writing. */
  private readToken = 0

  /** Stops the read in progress. */
  private stopReading: (() => void) | undefined = undefined

  /** Whether each group drawn from data is open, from the first time it was seen. */
  private readonly opened = new Map<string, boolean>()

  /** The rows drawn from data, worked out before each render. */
  private view: LogRows = { matched: 0, rows: [] }

  /** Whether the lines were replaced, so measurements no longer name the same rows. */
  private fresh = false

  /** How many lines `limit` had let go at the last render. */
  private droppedBefore = 0

  /** Scroll offset the rows let go from the top took with them, owed back to a reader who is not following. */
  private owed = 0

  /** The lines written as children, in order through every group, read on each change. */
  private childLines: HelixHeadlessLogLine[] = []

  /** The groups written as children, in order. */
  private childGroups: HelixHeadlessLogGroup[] = []

  /** Watches the children and their groups for lines arriving and steps changing status. */
  private watcher: MutationObserver | undefined = undefined

  /** Watches the log's box for size, which scrolling does not report. */
  private grower: ResizeObserver | undefined = undefined

  /** The scroll offset this element last set, which the reader has not moved from. */
  private stuckAt = -1

  /** Until the first frame, what is in the log is what it opened with. */
  private opening = true

  /** What the status region compared against last time. */
  private heard: Heard | undefined = undefined

  private readonly virtualize = new VirtualizeController(this, {
    anchor: () => !this.pinned,
    container: () => (this.fed ? this.log : null),
    count: () => this.view.rows.length,
    estimate: () => HelixHeadlessLog.ESTIMATE,
    measured: () => this.wrap,
    rows: () => (this.fed ? this.drawn() : []),
  })

  /** Whether the lines are data rather than children. */
  private get fed(): boolean {
    return (
      this.buffer.lines.length > 0 ||
      this.buffer.current() !== undefined ||
      this.groups.length > 0 ||
      this.sourceValue !== null
    )
  }

  /** The element that scrolls, once there is one. */
  private get log(): HTMLElement | null {
    return this.partNamed('log')
  }

  /**
   * Every line kept, as plain text with the escape codes taken out, one to a
   * row: what a download or a copy of the log should hold.
   */
  get text(): string {
    if (this.fed) {
      const current = this.buffer.current()
      return [...this.buffer.lines, ...(current ? [current] : [])]
        .map((line) => stripAnsi(line.text))
        .join('\n')
    }
    return this.childLines.map((line) => (line.textContent ?? '').trim()).join('\n')
  }

  /**
   * Adds text as it arrives. A line ends at each line break, and the text
   * after the last one is the line still being written.
   */
  write(chunk: string): void {
    if (chunk === '') {
      return
    }
    this.buffer.write(chunk)
    this.requestUpdate()
  }

  /**
   * Lets every line go, and forgets which groups the reader opened, keeping
   * `groups`, `parse`, and `limit`.
   */
  clear(): void {
    this.buffer.clear()
    this.opened.clear()
    this.fresh = true
    this.droppedBefore = 0
    this.requestUpdate()
  }

  /** Puts the log back at its newest line, and follows it again. */
  resume(): void {
    this.stick()
    this.requestPinned(true)
  }

  /**
   * Scrolls to line `number`, counted from the first line ever written, and
   * stops following the newest. Opens a shut group the line is in. Resolves
   * to whether the line is shown: false for a line `limit` let go or `query`
   * hides.
   */
  async scrollToLine(number: number, options: LogScrollOptions = {}): Promise<boolean> {
    const align = options.align ?? 'center'
    if (this.fed) {
      const line = this.buffer.lines[number - this.buffer.dropped - 1]
      if (line?.group !== undefined && !this.isOpen(line.group)) {
        this.opened.set(line.group, true)
        this.requestUpdate()
        await this.updateComplete
      }
      const index = this.view.rows.findIndex((row) => row.kind === 'line' && row.number === number)
      if (index < 0) {
        return false
      }
      if (this.pinned && this.requestPinned(false)) {
        await this.updateComplete
      }
      this.virtualize.reveal(index, 0, {
        align,
        ...(options.behavior ? { behavior: options.behavior } : {}),
      })
      return true
    }
    const line = this.childLines[number - 1]
    if (!line || line.logFiltered) {
      return false
    }
    for (const group of this.childGroups) {
      if (!group.open && group.contains(line)) {
        group.open = true
      }
    }
    if (this.pinned && this.requestPinned(false)) {
      await this.updateComplete
    }
    await line.updateComplete
    const log = this.log
    if (log) {
      const box = log.getBoundingClientRect()
      const rect = line.getBoundingClientRect()
      const offset =
        align === 'start'
          ? rect.top - box.top
          : align === 'end'
            ? rect.bottom - box.bottom
            : align === 'nearest'
              ? Math.min(0, rect.top - box.top) || Math.max(0, rect.bottom - box.bottom)
              : rect.top - box.top - (box.height - rect.height) / 2
      if (options.behavior && typeof log.scrollBy === 'function') {
        log.scrollBy({ behavior: options.behavior, top: offset })
      } else {
        log.scrollTop += offset
      }
    }
    return true
  }

  /** Whether a group drawn from data is open: as the reader left it, or as `groups` seeded it. */
  private isOpen(id: string): boolean {
    const known = this.opened.get(id)
    if (known !== undefined) {
      return known
    }
    const seeded = this.groups.find((group) => group.id === id)?.open ?? false
    this.opened.set(id, seeded)
    return seeded
  }

  /**
   * Follows a group's `open` where the page changed it, so a page can open the
   * step that failed. A group whose `open` did not change keeps what the
   * reader left it at.
   */
  private reopen(previous: readonly LogGroup[] | undefined): void {
    const before = new Map((previous ?? []).map((group) => [group.id, group.open]))
    for (const group of this.groups) {
      if (group.open !== undefined && before.has(group.id) && before.get(group.id) !== group.open) {
        this.opened.set(group.id, group.open)
      }
    }
  }

  /** Whether the reader is within `threshold` of the newest line right now. */
  private get atBottom(): boolean {
    const log = this.log
    if (!log) {
      return true
    }
    return log.scrollHeight - log.scrollTop - log.clientHeight <= Math.max(0, this.threshold)
  }

  /** Scrolls to the newest line, and remembers where that was. */
  private stick(): void {
    const log = this.log
    if (log) {
      log.scrollTop = log.scrollHeight
      this.stuckAt = log.scrollTop
    }
  }

  /** Asks to follow or let go of the newest line, and reports whether the request stood. */
  private requestPinned(next: boolean): boolean {
    if (next === this.pinned) {
      return false
    }
    return requestChange({
      apply: (value) => {
        const previous = this.pinned
        this.pinnedState = value
        this.requestUpdate('pinned', previous)
        this.dispatchEvent(new HelixPinEvent({ value: String(value) }))
      },
      event: (value) => new HelixBeforePinEvent({ value: String(value) }),
      host: this,
      next,
    })
  }

  /** The rows drawn from data that are in the tree, each with its place in the whole set. */
  private drawn(): { element: HTMLElement; index: number }[] {
    return [...(this.renderRoot?.querySelectorAll?.<HTMLElement>('[part="row"]') ?? [])].map(
      (element) => ({ element, index: Number(element.dataset.index) }),
    )
  }

  /**
   * Reads the lines and groups written as children, through every group, in
   * the order they are written. Nothing on a server, or while hydrating what
   * one sent.
   */
  private readChildren(): void {
    if (!this.childrenKnown) {
      this.childLines = []
      this.childGroups = []
      return
    }
    const lines: HelixHeadlessLogLine[] = []
    const groups: HelixHeadlessLogGroup[] = []
    for (const element of this.querySelectorAll('*')) {
      if ('isLogLine' in element && element.isLogLine === true) {
        lines.push(element as HelixHeadlessLogLine)
      } else if ('isLogGroup' in element && element.isLogGroup === true) {
        groups.push(element as HelixHeadlessLogGroup)
      }
    }
    this.childLines = lines
    this.childGroups = groups
  }

  /**
   * Tells each line written as a child its number and what the log shows, once
   * it has hydrated, so its first render is the server's. Opens a group that
   * holds a match while `query` is set.
   */
  private tellLines(): void {
    const marks = lineRuns(this.markLines)
    const needle = this.query.trim().toLowerCase()
    const start = this.childLines.map((line) => timeOf(line.at)).find((time) => time !== undefined)
    this.childLines.forEach((line, at) => {
      const filtered = needle !== '' && !(line.textContent ?? '').toLowerCase().includes(needle)
      whenHydrated(line, () => {
        line.logNumber = at + 1
        line.logNumbers = this.lineNumbers
        line.logHref = this.lineHref
        line.logTimes = this.timestamps ?? ''
        line.logStart = start
        line.logMarked = inRuns(marks, at + 1)
        line.logFiltered = filtered
      })
      if (!filtered && needle !== '') {
        for (const group of this.childGroups) {
          if (!group.open && group.contains(line)) {
            whenHydrated(group, () => {
              group.open = true
            })
          }
        }
      }
    })
  }

  /** Makes the log a tab stop while it scrolls, so a keyboard can scroll it in every browser. */
  private markScroller(): void {
    const log = this.log
    if (!log) {
      return
    }
    if (log.scrollHeight > log.clientHeight || log.scrollWidth > log.clientWidth) {
      log.tabIndex = 0
    } else {
      log.removeAttribute('tabindex')
    }
  }

  /** What the status region compares, as things stand. */
  private listen(): Heard {
    const groups: Heard['groups'] = new Map()
    if (this.fed) {
      for (const group of this.groups) {
        groups.set(group.id, { heading: group.heading, status: group.status })
      }
    } else {
      for (const group of this.childGroups) {
        groups.set(group, {
          heading: group.heading || (group.textContent ?? '').trim(),
          status: group.status,
        })
      }
    }
    return {
      done: this.done,
      groups,
      matched: this.fed
        ? this.view.matched
        : this.childLines.filter((line) => !line.logFiltered).length,
      query: this.query,
      total: this.fed ? this.buffer.dropped + this.buffer.lines.length : this.childLines.length,
    }
  }

  /**
   * Says what changed since the last time it looked: lines at `error`, steps
   * that finished or failed, the end of the run, and how many lines a new
   * `query` matches. Nothing is said for what the log opened with.
   */
  private announce(): void {
    const now = this.listen()
    const before = this.heard
    this.heard = now
    if (this.opening || !before) {
      return
    }
    const said: string[] = []
    if (now.query !== before.query && now.query.trim() !== '') {
      said.push(formatWords(this, 'matchesLabel', { count: now.matched }))
    }
    const arrived = now.total - before.total
    if (arrived > 0) {
      const fresh = this.fed
        ? this.buffer.lines.slice(Math.max(0, this.buffer.lines.length - arrived))
        : this.childLines.slice(before.total).map((line) => ({
            level: line.level,
            text: (line.textContent ?? '').trim(),
          }))
      const errors = fresh.filter((line) => line.level === 'error')
      if (errors.length > 0) {
        said.push(
          formatWords(this, 'errorLabel', {
            count: errors.length,
            text: stripAnsi(errors[0]?.text ?? ''),
          }),
        )
      }
    }
    for (const [id, group] of now.groups) {
      const was = before.groups.get(id)?.status
      if (
        group.status !== was &&
        (group.status === 'done' || group.status === 'failed') &&
        before.groups.has(id)
      ) {
        said.push(formatWords(this, 'groupLabel', { heading: group.heading, status: group.status }))
      }
    }
    if (now.done && !before.done) {
      said.push(this.doneLabel)
    }
    if (said.length > 0) {
      this.announcement = said.join(' ')
      this.said += 1
    }
  }

  /** Reads a source to its end, writing what it gives, and sets `done` when it ends. */
  private async readSource(source: LogSource | null): Promise<void> {
    this.stopReading?.()
    this.stopReading = undefined
    this.readToken += 1
    const token = this.readToken
    this.reading = source !== null
    if (!source) {
      return
    }
    const decoder = new TextDecoder()
    const take = (chunk: string | Uint8Array): boolean => {
      if (token !== this.readToken) {
        return false
      }
      this.write(typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true }))
      return true
    }
    try {
      if ('getReader' in source) {
        const reader = source.getReader()
        this.stopReading = () => {
          reader.cancel().catch(() => undefined)
        }
        for (;;) {
          const { done, value } = await reader.read()
          if (done || !take(value)) {
            break
          }
        }
      } else {
        for await (const chunk of source) {
          if (!take(chunk)) {
            break
          }
        }
      }
      if (token === this.readToken) {
        this.write(decoder.decode())
        this.done = true
      }
    } catch (error) {
      if (token === this.readToken) {
        globalThis.reportError?.(error)
      }
    } finally {
      if (token === this.readToken) {
        this.reading = false
        this.stopReading = undefined
      }
    }
  }

  /**
   * The log changed size, which moves nothing on its own: following, the
   * newest line is followed.
   */
  private readonly handleResize = (): void => {
    this.markScroller()
    if (this.pinned) {
      this.stick()
    }
  }

  private readonly handleMutation = (): void => {
    this.requestUpdate()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* Lines arriving anywhere under the log, inside a group too, and a step's
       status, which is when it is worth saying. A line's own text is not
       watched, so a long log costs nothing between lines. */
    this.watcher = new MutationObserver(this.handleMutation)
    this.watcher.observe(this, {
      attributeFilter: ['status', 'level'],
      childList: true,
      subtree: true,
    })
    this.opening = true
    requestAnimationFrame(() => {
      this.opening = false
    })
    if (this.sourceValue !== null && !this.reading) {
      void this.readSource(this.sourceValue)
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.watcher?.disconnect()
    this.watcher = undefined
    this.grower?.disconnect()
    this.grower = undefined
    this.stopReading?.()
    this.stopReading = undefined
    this.readToken += 1
    this.reading = false
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label || this.fallbackLabel, role: 'region' })
    if (changed.has('groups')) {
      this.reopen(changed.get('groups') as readonly LogGroup[] | undefined)
    }
    if (changed.has('limit')) {
      this.buffer.limit = Math.max(0, Math.floor(this.limit || 0))
      this.buffer.write('')
    }
    if (!this.fed) {
      this.readChildren()
    }
    const dropped = this.buffer.dropped - this.droppedBefore
    if (this.fresh) {
      this.fresh = false
      this.virtualize.forget()
    } else if (dropped > 0) {
      if (!this.pinned) {
        this.owed += dropped * this.virtualize.sizeOf(0)
      }
      if (this.wrap) {
        this.virtualize.forget()
      }
    }
    this.droppedBefore = this.buffer.dropped
    if (this.fed) {
      this.view = logRows({
        current: this.buffer.current(),
        groups: this.groups,
        lines: this.buffer.lines,
        open: (id) => this.isOpen(id),
        query: this.query,
        start: this.buffer.dropped,
      })
    } else {
      this.view = { matched: 0, rows: [] }
    }
    this.toggleState('pinned', this.pinned)
    this.toggleState('done', this.done)
    this.toggleState('filtered', this.query.trim() !== '')
    this.toggleState('empty', this.childrenKnown && !this.fed && this.childLines.length === 0)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (!this.fed) {
      this.tellLines()
    }
    const log = this.log
    if (this.pinned) {
      this.stick()
    } else if (this.owed > 0 && log) {
      log.scrollTop = Math.max(0, log.scrollTop - this.owed)
    }
    this.owed = 0
    if (this.fed) {
      this.virtualize.measure()
    }
    if (log && typeof ResizeObserver !== 'undefined' && !this.grower) {
      this.grower = new ResizeObserver(this.handleResize)
      this.grower.observe(log)
    }
    this.markScroller()
    this.announce()
  }

  /**
   * The reader's own scrolling, which is the only thing that lets go of the
   * newest line. Bound to the log in the template, since `scroll` is not
   * composed and never reaches the host. A scroll this element made, and the
   * log growing under a reader who has not moved, are not the reader leaving:
   * `Chat` carries the measurement.
   */
  private readonly handleScroll = (): void => {
    const log = this.log
    if (this.pinned && log && log.scrollTop >= this.stuckAt - 1 && !this.atBottom) {
      this.stick()
      return
    }
    const wanted = this.atBottom
    if (wanted !== this.pinned) {
      this.requestPinned(wanted)
    }
  }

  private readonly handleResume = (): void => {
    this.resume()
  }

  /** A reader opened or closed a group drawn from data. */
  private readonly handleGroupToggle = (event: Event): void => {
    const group = event.currentTarget as HelixHeadlessLogGroup
    const id = group.dataset.group
    if (id === undefined || this.query.trim() !== '') {
      return
    }
    this.opened.set(id, group.open)
    this.requestUpdate()
    const open = this.groups.filter((each) => this.isOpen(each.id)).map((each) => each.id)
    this.dispatchEvent(new HelixExpandEvent({ value: open.join(',') }))
  }

  /** One row drawn from data: a line, or a group's heading. */
  private renderRow(
    row: LogRow,
    marks: ReadonlyArray<[number, number]>,
    start: number | undefined,
  ): TemplateResult {
    if (row.kind === 'group') {
      const group = this.tag('log-group')
      const { duration, heading, id, status } = row.group
      return html`<${group}
        exportparts="content: group-content, duration: group-duration, heading: group-heading,
          mark: group-mark, status: group-status, summary: group-summary${secondNames(STATUS_NAMES, status)}"
        data-group=${id}
        duration=${duration ?? nothing}
        heading=${heading}
        status=${status ?? nothing}
        .logDrawn=${true}
        .open=${row.open}
        @toggle=${this.handleGroupToggle}
      ></${group}>`
    }
    const line = this.tag('log-line')
    const { at, level } = row.line
    return html`<${line}
      exportparts="line, line-debug, line-error, line-marked, line-warn, match: line-match,
        number: line-number, run: line-run, run-bold: line-run-bold, run-dim: line-run-dim,
        run-italic: line-run-italic, run-strike: line-run-strike, run-underline: line-run-underline,
        text: line-text, time: line-time"
      level=${level ?? nothing}
      .at=${at ?? ''}
      .lineLabel=${this.lineLabel}
      .logHref=${this.lineHref}
      .logMarked=${inRuns(marks, row.number)}
      .logNumber=${row.number}
      .logNumbers=${this.lineNumbers}
      .logQuery=${this.query}
      .logStart=${start}
      .logTimes=${this.timestamps ?? ''}
      .runs=${this.buffer.runsOf(row.line)}
    ></${line}>`
  }

  /** When the first line kept was written, which `relative` counts from. */
  private get firstTime(): number | undefined {
    for (const line of this.buffer.lines) {
      const time = timeOf(line.at)
      if (time !== undefined) {
        return time
      }
    }
    return undefined
  }

  /**
   * How many digits the largest line number has, which a stylesheet sizes the
   * column of numbers by, or 0 where nobody can know: a server, or a log with
   * no numbers shown.
   */
  private get digits(): number {
    if (!this.lineNumbers) {
      return 0
    }
    const largest = this.fed
      ? this.buffer.dropped + this.buffer.lines.length + 1
      : this.childLines.length
    return largest > 0 ? String(largest).length : 0
  }

  /** The rows drawn from data, a window of them, between the room the rest would take. */
  private renderRows(): TemplateResult {
    const { after, before, first, last } = this.virtualize.window
    const marks = lineRuns(this.markLines)
    /* Once a render, since finding it can walk every line. */
    const start = this.timestamps === 'relative' ? this.firstTime : undefined
    /* `flex: none` inline, because the room is only room if it keeps its size,
       as `Chat` measured. */
    return html`<div part="before" role="presentation" style="block-size: ${before}px; flex: none"></div>
      ${repeat(
        this.view.rows.slice(first, last),
        (row) => (row.kind === 'group' ? `group:${row.group.id}` : `line:${row.number}`),
        (row, offset) =>
          html`<div part="row" data-index=${first + offset}>${this.renderRow(row, marks, start)}</div>`,
      )}
      <div part="after" role="presentation" style="block-size: ${after}px; flex: none"></div>`
  }

  /**
   * The `resume` slot, with the way back drawn where nothing is slotted, behind
   * a seam: the slot answers a page, and this answers the tier above.
   */
  protected renderResume(): TemplateResult {
    return html`<slot name="resume"
      ><button part="resume-button" type="button">
        <span part="resume-mark" aria-hidden="true">${drawIcon(arrowDown)}</span>${this.resumeLabel}
      </button></slot
    >`
  }

  protected override render(): TemplateResult {
    const fed = this.fed
    const dropped = this.buffer.dropped
    const content =
      this.query.trim() !== '' ||
      (fed ? this.view.rows.length > 0 : this.childLines.length > 0 || !this.childrenKnown)
    return html`<slot name="toolbar" part="toolbar"></slot>
      <p part="dropped" ?hidden=${dropped === 0}>${
        dropped === 0 ? nothing : formatWords(this, 'droppedLabel', { count: dropped })
      }</p>
      <div
        part="log"
        role="log"
        aria-live="off"
        data-scroller
        aria-label=${this.label || this.fallbackLabel}
        aria-busy=${this.reading && !this.done ? 'true' : nothing}
        style=${this.digits === 0 ? nothing : `--log-digits: ${this.digits}`}
        ?data-windowed=${fed}
        @scroll=${this.handleScroll}
      >
        ${fed ? this.renderRows() : nothing}
        <slot></slot>
        ${this.renderStatus(content)}
      </div>
      <span part="live" role="status">${keyed(this.said, this.announcement)}</span>
      <div part="resume" ?hidden=${this.pinned} @click=${this.handleResume}>
        ${this.renderResume()}
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-log': HelixHeadlessLog
  }
}
