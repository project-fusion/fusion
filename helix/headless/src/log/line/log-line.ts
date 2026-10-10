import {
  customElement,
  formatWords,
  HelixElement,
  words,
  wordsLocale,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import type { LogRun } from '../ansi.js'
import type { LogLevel } from '../buffer.js'
import { markMatches } from '../rows.js'

/** A color named for the stylesheet, such as `red`, where anything else is CSS. */
const NAME = /^[a-z-]+$/

/** How a line's time reads: the clock, or how far into the run it was written. */
export type LogTimes = 'absolute' | 'relative'

/** Milliseconds since the epoch for `at`, or undefined where it names no time. */
export const timeOf = (at: number | string | undefined): number | undefined => {
  if (at === undefined || at === '') {
    return undefined
  }
  const time = typeof at === 'number' || /^\d+$/.test(at) ? Number(at) : Date.parse(at)
  return Number.isFinite(time) ? time : undefined
}

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
 * `error` lines apart. The text is the line's own content, so you can mark it
 * up yourself.
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
 * @csspart line-marked - The row of a line `mark-lines` names on the log.
 * @csspart line-warn - The row of a line at `warn`.
 * @csspart match - Text that matches the log's `query`, in a line the log draws from data.
 * @csspart number - The line's number, shown with `line-numbers`, and a link with `line-href`.
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
 * @cssstate filtered - The log's `query` does not match the line, so it draws nothing.
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

  /** What a screen reader hears for the link on a line's number. `{number}` is the number. */
  @words
  @property({ attribute: 'line-label' })
  lineLabel = 'Line {number}'

  /** @internal Set by the log: whether the query hides the line. */
  @property({ attribute: false })
  logFiltered = false

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

  /** @internal Set by the log: when the first line was written, which `relative` counts from. */
  @property({ attribute: false })
  logStart: number | undefined = undefined

  /** @internal Set by the log: how to show the time, or empty to hide it. */
  @property({ attribute: false })
  logTimes: '' | LogTimes = ''

  /** @internal Set by the log: the text as styled runs, for a line drawn from data. */
  @property({ attribute: false })
  runs: readonly LogRun[] | undefined = undefined

  /**
   * @internal Read by the log to find its lines among its children and inside
   * its groups, which is cheaper than `instanceof`.
   */
  readonly isLogLine = true

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('filtered', this.logFiltered)
  }

  /** The number, as a link where the log gave one, or as text a screen reader skips. */
  private renderNumber(): TemplateResult | typeof nothing {
    if (!this.logNumbers || this.logNumber <= 0) {
      return nothing
    }
    const number = String(this.logNumber)
    if (this.logHref !== '') {
      return html`<a
        part="number"
        href=${this.logHref.replaceAll('{n}', number)}
        aria-label=${formatWords(this, 'lineLabel', { number: this.logNumber })}
      >${number}</a>`
    }
    return html`<span part="number" aria-hidden="true">${number}</span>`
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

  protected override render(): TemplateResult | typeof nothing {
    if (this.logFiltered) {
      return nothing
    }
    const level = this.level
    return html`<div
      part="line${level ? { debug: ' line-debug', error: ' line-error', info: '', warn: ' line-warn' }[level] : ''}${this.logMarked ? ' line-marked' : ''}"
    >${this.renderNumber()}${this.renderTime()}<span part="text">${this.renderText()}</span></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-log-line': HelixHeadlessLogLine
  }
}
