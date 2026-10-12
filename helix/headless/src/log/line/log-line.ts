import {
  customElement,
  formatWords,
  HelixElement,
  words,
  wordsConverter,
  wordsLocale,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import type { LogRun } from '../ansi.js'
import { type LogLevel, timeOf } from '../buffer.js'
import { markMatches } from '../rows.js'

/** A color named for the stylesheet, such as `red`, where anything else is CSS. */
const NAME = /^[a-z-]+$/

/** How a line's time reads: the clock, or how far into the run it was written. */
export type LogTimes = 'absolute' | 'relative'

/** `seconds` as `m:ss`, or `h:mm:ss` from an hour, which is how far into a run reads. */
const elapsed = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const rest = String(whole % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`
}

/**
 * @summary One line of a log, with its number, its time, and its text.
 *
 * @description
 * Write one for each line of a log you serve whole, inside a `Log` or a
 * `Log.Group`. The log numbers each line, counting the lines of every group,
 * and tells it whether to show its number and its time.
 *
 * `level` says how much a line matters, and the styled tier draws `warn` and
 * `error` lines apart. A line at `debug`, `warn` or `error` says its level in
 * words before its text, so a reader moving through the log hears it as well
 * as the color shows it. The text is the line's own content, so you can mark
 * it up yourself.
 *
 * @since 0.200.0
 * @status experimental
 * @documentation https://fusion.dev/helix/components/log
 *
 * @slot - The text of the line.
 *
 * @csspart line - The row the number, the time, and the text sit in.
 * @csspart line-debug - The row of a line at `debug`.
 * @csspart line-error - The row of a line at `error`.
 * @csspart line-grouped - The row of a line that belongs to a step, which the styled tier insets under the step's heading where there is no number.
 * @csspart line-marked - The row of a line `mark-lines` names on the log.
 * @csspart line-selected - The row of a line in the log's selection.
 * @csspart line-warn - The row of a line at `warn`.
 * @csspart count - How many times a line written again straight after itself was written, where the log's `collapse` folds repeats. Hidden from screen readers, which hear `count-label`.
 * @csspart count-label - What a screen reader hears for the count, such as "3 times". Visually hidden in the styled tier.
 * @csspart level - What a screen reader hears before the text for a line at `debug`, `warn` or `error`, such as "Warning:". Visually hidden in the styled tier.
 * @csspart match - Text that matches the log's `query`, in a line the log draws from data.
 * @csspart number - The line's number, shown with `line-numbers`: a link with `line-href`, and a button on a `selectable` log.
 * @csspart run - A stretch of text drawn in an ANSI style, in a line the log draws from data. Its color is `--log-run-color` and its background `--log-run-background-color`.
 * @csspart run-bold - A run drawn bold.
 * @csspart run-dim - A run drawn faint.
 * @csspart run-italic - A run drawn italic.
 * @csspart run-strike - A run drawn struck through.
 * @csspart run-underline - A run drawn underlined.
 * @csspart text - The text of the line.
 * @csspart time - When the line was written, shown with `timestamps`.
 *
 * @cssproperty --log-run-background-color - Written on a `run` with a background, in the same form as `--log-run-color`.
 * @cssproperty --log-run-color - Written on a `run` with a text color: one of the sixteen `--log-ansi-*` colors the log publishes, or the color itself.
 *
 * @cssstate filtered - The log's `query` does not match the line, or its `level` is quieter than the log shows, so it draws nothing.
 */
@customElement('helix-headless-log-line')
export class HelixHeadlessLogLine extends HelixElement {
  /** The key this family's words are registered under, its styled tag. */
  static words = 'helix-log'

  /** When the line was written: milliseconds since the epoch, or anything `Date` parses. */
  @property()
  at: number | string = ''

  /** How much the line matters. Absent is `info`. */
  @property({ reflect: true })
  level?: LogLevel

  /**
   * What a screen reader hears before the text of a line at each level, for a
   * page in another language, keyed by level, such as `{ warn: 'Warnung:' }`.
   * A line at `info` or `log` hears nothing extra. As an attribute it is that
   * object as JSON.
   */
  @words
  @property({ attribute: 'level-words', converter: wordsConverter })
  levelWords: Partial<Record<LogLevel, string>> = {
    debug: 'Debug:',
    error: 'Error:',
    warn: 'Warning:',
  }

  /** What a screen reader hears for the link on a line's number. `{number}` is the number. */
  @words
  @property({ attribute: 'line-label' })
  lineLabel = 'Line {number}'

  /** @internal Set by the log: how many times the line was written in a row, where `collapse` folds repeats. */
  @property({ attribute: false })
  logCount = 1

  /** @internal Set by the log: whether the query hides the line. */
  @property({ attribute: false })
  logFiltered = false

  /** @internal Set by the log: whether the line belongs to a step. */
  @property({ attribute: false })
  logGrouped = false

  /** @internal Set by the log: the link a number goes to, with `{n}` for the number. */
  @property({ attribute: false })
  logHref = ''

  /** @internal Set by the log: whether `mark-lines` names the line. */
  @property({ attribute: false })
  logMarked = false

  /** @internal Set by the log: the line's number, from 1. Zero where no log has said. */
  @property({ attribute: false })
  logNumber = 0

  /** @internal Set by the log: whether to show the number. */
  @property({ attribute: false })
  logNumbers = false

  /** @internal Set by the log: the text to mark in the runs, for a line drawn from data. */
  @property({ attribute: false })
  logQuery = ''

  /** @internal Set by the log: whether pressing the number selects the line. */
  @property({ attribute: false })
  logSelectable = false

  /** @internal Set by the log: whether the line is in the selection. */
  @property({ attribute: false })
  logSelected = false

  /** @internal Set by the log: when the first line was written, which `relative` counts from. */
  @property({ attribute: false })
  logStart: number | undefined = undefined

  /** @internal Set by the log: whether the number is the log's one tab stop among its numbers. */
  @property({ attribute: false })
  logStop = false

  /** @internal Set by the log: how to show the time, or empty to hide it. */
  @property({ attribute: false })
  logTimes: '' | LogTimes = ''

  /** @internal Set by the log: the text as styled runs, for a line drawn from data. */
  @property({ attribute: false })
  runs: readonly LogRun[] | undefined = undefined

  /**
   * What a screen reader hears after a line written more than once in a row.
   * `{count}` is how many times, in the locale.
   */
  @words
  @property({ attribute: 'times-label' })
  timesLabel = '{count} times'

  /**
   * @internal Read by the log to find its lines among its children and inside
   * its groups, which is cheaper than `instanceof`.
   */
  readonly isLogLine = true

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('filtered', this.logFiltered)
  }

  /**
   * The number: a link where the log gave `line-href`, a button where the log
   * is `selectable`, and otherwise text a screen reader skips.
   *
   * **One number in the log is a tab stop, and the rest are reached with the
   * arrow keys**, so a log of a thousand lines is one stop on the way through
   * the page. The log says which, with `logStop`.
   */
  private renderNumber(): TemplateResult | typeof nothing {
    if (!this.logNumbers || this.logNumber <= 0) {
      return nothing
    }
    const number = String(this.logNumber)
    const name = formatWords(this, 'lineLabel', { number: this.logNumber })
    const stop = this.logStop ? 0 : -1
    if (this.logHref !== '') {
      return html`<a
        part="number"
        href=${this.logHref.replaceAll('{n}', number)}
        aria-label=${name}
        aria-current=${this.logSelected ? 'true' : nothing}
        tabindex=${stop}
      >${number}</a>`
    }
    if (this.logSelectable) {
      return html`<button
        part="number"
        type="button"
        aria-label=${name}
        aria-pressed=${this.logSelected ? 'true' : 'false'}
        tabindex=${stop}
      >${number}</button>`
    }
    return html`<span part="number" aria-hidden="true">${number}</span>`
  }

  /** @internal Called by the log: moves focus to the number, where it takes focus. */
  focusNumber(): void {
    this.renderRoot.querySelector<HTMLElement>('a[part="number"], button[part="number"]')?.focus()
  }

  /** The time, on the clock or into the run, where the log asked for one and the line has one. */
  private renderTime(): TemplateResult | typeof nothing {
    const time = timeOf(this.at)
    if (this.logTimes === '' || time === undefined) {
      return nothing
    }
    const reads =
      this.logTimes === 'relative'
        ? elapsed((time - (this.logStart ?? time)) / 1000)
        : new Intl.DateTimeFormat(wordsLocale(this), {
            hour: '2-digit',
            hourCycle: 'h23',
            minute: '2-digit',
            second: '2-digit',
          }).format(time)
    return html`<time part="time" datetime=${new Date(time).toISOString()}>${reads}</time>`
  }

  /**
   * The text: the default slot, falling back to the runs a log drew from data.
   * The slot answers a page, and this answers the tier above.
   */
  protected renderText(): TemplateResult {
    return html`<slot>${this.runs ? this.renderRuns() : nothing}</slot>`
  }

  /**
   * The runs a log drew from data, each match of its query marked.
   *
   * **The parts are literals**, each name written where it is decided, so a
   * rule reading the source finds every name a run can carry. A named color
   * is written into `style` as the `--log-ansi-` color of that name, and any
   * other as itself. A bright color is written apart from the rest, so a rule
   * reading the source sees the `--log-ansi-bright-` colors read as well as
   * the plain ones. Inverse swaps the two, each falling back to the log's own
   * ink.
   */
  private renderRuns(): unknown[] {
    return markMatches(this.runs ?? [], this.logQuery).map((piece) => {
      const styled =
        piece.color !== undefined ||
        piece.background !== undefined ||
        piece.bold ||
        piece.dim ||
        piece.italic ||
        piece.strike ||
        piece.underline ||
        piece.inverse
      const color = piece.inverse ? (piece.background ?? 'background') : piece.color
      const background = piece.inverse ? (piece.color ?? 'foreground') : piece.background
      const run = styled
        ? html`<span
            part="run${piece.bold ? ' run-bold' : ''}${piece.dim ? ' run-dim' : ''}${piece.italic ? ' run-italic' : ''}${piece.underline ? ' run-underline' : ''}${piece.strike ? ' run-strike' : ''}"
            style="${color === undefined ? '' : !NAME.test(color) ? `--log-run-color: ${color}; ` : color.startsWith('bright-') ? `--log-run-color: var(--log-ansi-bright-${color.slice(7)}); ` : `--log-run-color: var(--log-ansi-${color}); `}${background === undefined ? '' : !NAME.test(background) ? `--log-run-background-color: ${background}` : background.startsWith('bright-') ? `--log-run-background-color: var(--log-ansi-bright-${background.slice(7)})` : `--log-run-background-color: var(--log-ansi-${background})`}"
          >${piece.text}</span>`
        : piece.text
      return piece.match ? html`<mark part="match">${run}</mark>` : run
    })
  }

  /** The count of a folded line, shown as a number and heard as words. */
  private renderCount(): TemplateResult | typeof nothing {
    if (this.logCount < 2) {
      return nothing
    }
    return html` <span part="count" aria-hidden="true">${this.logCount}</span><span part="count-label"
        >${formatWords(this, 'timesLabel', { count: this.logCount })}</span
      >`
  }
  protected override render(): TemplateResult | typeof nothing {
    if (this.logFiltered) {
      return nothing
    }
    const level = this.level
    const said = level === undefined ? undefined : this.levelWords[level]
    return html`<div
      part="line${level ? { debug: ' line-debug', error: ' line-error', info: '', log: '', warn: ' line-warn' }[level] : ''}${this.logMarked ? ' line-marked' : ''}${this.logSelected ? ' line-selected' : ''}${this.logGrouped ? ' line-grouped' : ''}"
    >${this.renderNumber()}${this.renderTime()}${said ? html`<span part="level">${said} </span>` : nothing}<span part="text">${this.renderText()}</span>${this.renderCount()}</div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-log-line': HelixHeadlessLogLine
  }
}
