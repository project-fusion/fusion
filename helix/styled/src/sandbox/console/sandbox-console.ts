import {
  customElement,
  HelixBeforeChangeEvent,
  HelixElement,
  requestChange,
  stopPress,
  words,
  wordsConverter,
} from '@fusion.dev/helix-core'
import { levelSaid } from '@fusion.dev/helix-headless/log'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { html } from 'lit/static-html.js'
import type { ConsoleDetail } from '../events/index.js'
import '../../button/index.js'
import '../../log/index.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './sandbox-console.css.js'

/** A console level, from the quietest to the loudest. */
type ConsoleLevel = ConsoleDetail['level']

/** The four levels the filter offers, the quietest first. */
const LEVELS: readonly ConsoleLevel[] = ['log', 'info', 'warn', 'error']

/** The log the lines are drawn in, as far as the console drives it. */
interface Output extends HTMLElement {
  clear(): void
  writeLine(line: { level: ConsoleLevel; text: string }): void
}

/** One line a screen reader is told about, keyed so each is an addition. */
interface Heard {
  key: number
  words: string
}

/** How many lines are kept. Older ones fall off the top. */
const LIMIT = 200

/** How many of the newest lines the region a screen reader hears holds. */
const HEARD = 5

/** Keeps the filter's `input` inside the shadow root it started in. */
const stop = (event: Event): void => event.stopPropagation()

/**
 * @summary A panel that shows what the previewed example wrote to the console.
 *
 * @description
 * The sandbox receives `helix-console` events from the preview and passes them
 * to the console. The preview is a separate document, so messages cross
 * `postMessage` and arrive as text.
 *
 * **Drawn by a Log**, which keeps the newest line in view while a reader
 * stays at the end, holds the last 200 lines, and folds a line written again
 * straight after itself into one line with a count, so an example with a
 * render loop does not fill the panel with the same warning. Each line keeps
 * its console level, and a warning or an error is drawn apart.
 *
 * **What a screen reader hears.** Each new line is read as it arrives, its
 * level first except a plain `log`, so an error does not sound like any other
 * line. A repeat of the line before it is not read again. A reader moving
 * through the lines hears a debug, warning or error line's level too.
 *
 * **`controls` adds a level filter and a clear button** above the log. Both
 * are also yours to drive without them: `clear()` empties the console, and
 * `level` hides the quieter lines.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Console, Output
 * @documentation https://fusion.dev/helix/components/sandbox
 *
 * @event {Event} change - Fired after the reader chose another level in the filter. `level` holds it.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before the level filter changes, with the level chosen, `log` for every level. Cancelable: cancel it to keep the current level.
 *
 * @csspart clear - The button that empties the console, under `controls`.
 * @csspart clear-button - The clear button's inner button.
 * @csspart clear-live - The clear button's live region, which speaks while the button is pending.
 * @csspart clear-spinner - The ring the clear button turns while it is pending.
 * @csspart clear-text - The clear button's words.
 * @csspart controls - The row holding the level filter and the clear button, under `controls`.
 * @csspart filter - The level filter, a native select, under `controls`.
 * @csspart live - Where screen readers hear each new line. Visually hidden.
 * @csspart output - The Log the lines are drawn in.
 * @csspart output-after - The log's `after` part.
 * @csspart output-before - The log's `before` part.
 * @csspart output-dropped - The log's `dropped` part.
 * @csspart output-empty - The log's `empty` part.
 * @csspart output-group-content - The log's `group-content` part.
 * @csspart output-group-duration - The log's `group-duration` part.
 * @csspart output-group-heading - The log's `group-heading` part.
 * @csspart output-group-mark - The log's `group-mark` part.
 * @csspart output-group-status - The log's `group-status` part.
 * @csspart output-group-summary - The log's `group-summary` part.
 * @csspart output-group-summary-done - The log's `group-summary-done` part.
 * @csspart output-group-summary-failed - The log's `group-summary-failed` part.
 * @csspart output-group-summary-pending - The log's `group-summary-pending` part.
 * @csspart output-group-summary-running - The log's `group-summary-running` part.
 * @csspart output-group-summary-skipped - The log's `group-summary-skipped` part.
 * @csspart output-line - The log's `line` part.
 * @csspart output-line-count - The log's `line-count` part.
 * @csspart output-line-count-label - The log's `line-count-label` part.
 * @csspart output-line-debug - The log's `line-debug` part.
 * @csspart output-line-error - The log's `line-error` part.
 * @csspart output-line-grouped - The log's `line-grouped` part.
 * @csspart output-line-level - The log's `line-level` part.
 * @csspart output-line-marked - The log's `line-marked` part.
 * @csspart output-line-match - The log's `line-match` part.
 * @csspart output-line-number - The log's `line-number` part.
 * @csspart output-line-run - The log's `line-run` part.
 * @csspart output-line-run-bold - The log's `line-run-bold` part.
 * @csspart output-line-run-dim - The log's `line-run-dim` part.
 * @csspart output-line-run-italic - The log's `line-run-italic` part.
 * @csspart output-line-run-strike - The log's `line-run-strike` part.
 * @csspart output-line-run-underline - The log's `line-run-underline` part.
 * @csspart output-line-selected - The log's `line-selected` part.
 * @csspart output-line-text - The log's `line-text` part.
 * @csspart output-line-time - The log's `line-time` part.
 * @csspart output-line-warn - The log's `line-warn` part.
 * @csspart output-live - The log's `live` part.
 * @csspart output-loading - The log's `loading` part.
 * @csspart output-log - The log's `log` part.
 * @csspart output-resume - The log's `resume` part.
 * @csspart output-resume-button - The log's `resume-button` part.
 * @csspart output-resume-mark - The log's `resume-mark` part.
 * @csspart output-row - The log's `row` part.
 * @csspart output-toolbar - The log's `toolbar` part.
 *
 * @cssproperty --sandbox-console-size - Height of the console.
 */
@customElement('helix-sandbox-console')
export class HelixSandboxConsole extends HelixElement {
  static override tier = 'helix-'

  /**
   * The key this part's words are registered under, its tag:
   * `registerWords('de', { 'helix-sandbox-console': { clearLabel: 'Leeren' } })`.
   */
  static words = 'helix-sandbox-console'

  /**
   * The clear button's text, under `controls`.
   */
  @words
  @property({ attribute: 'clear-label' })
  clearLabel = 'Clear'

  /**
   * Shows a level filter and a clear button above the log.
   *
   * Off by default, because a sandbox that puts the console in a panel often
   * has a toolbar of its own for them.
   */
  @property({ reflect: true, type: Boolean })
  controls = false

  /**
   * The old name of `empty-text`, read only where a page sets it.
   *
   * @deprecated Use `empty-text`. Removed in the next release.
   */
  @property({ attribute: 'empty-label' })
  emptyLabel?: string

  /**
   * Text shown before anything has been written, and while the level filter
   * hides every line.
   */
  @words
  @property({ attribute: 'empty-text' })
  emptyText = 'Nothing written to the console yet.'

  /** The name the element gives itself where `label` is empty. */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Console output'

  /**
   * The log's name, read by screen readers.
   *
   * Empty by default, which leaves the name to `fallbackLabel`.
   */
  @property()
  label = ''

  /**
   * The quietest level shown: `info` hides plain logs, `warn` shows warnings
   * and errors, and `error` shows errors only. Absent shows every line.
   *
   * Lines it hides are kept, so lowering it shows them again. The filter under
   * `controls` sets it.
   */
  @property()
  level?: ConsoleLevel | undefined

  /**
   * The level filter's name, read by screen readers, under `controls`.
   */
  @words
  @property({ attribute: 'level-label' })
  levelLabel = 'Levels shown'

  /**
   * What each choice of the level filter reads, for a page in another
   * language, keyed by level, such as `{ warn: '…' }`. A level left out keeps
   * its English words. As an attribute it is that object as JSON, and JSON
   * that does not parse is no words.
   */
  @words
  @property({ attribute: 'level-words', converter: wordsConverter })
  levelWords: Partial<Record<ConsoleLevel, string>> = {
    error: 'Errors',
    info: 'Info and above',
    log: 'All levels',
    warn: 'Warnings and errors',
  }

  /**
   * What a screen reader hears before a new line at each level, keyed by
   * level, such as `{ warn: 'Warnung:' }`. A plain `log` hears nothing before
   * its text, and nor does a line whose text already starts with its words,
   * such as `Error: Boom` from `console.error(error)`. As an attribute it is
   * that object as JSON.
   */
  @words
  @property({ attribute: 'spoken-words', converter: wordsConverter })
  spokenWords: Partial<Record<ConsoleLevel, string>> = {
    error: 'Error:',
    info: 'Info:',
    warn: 'Warning:',
  }

  @state()
  private heard: Heard[] = []

  /** The next key a heard line takes. */
  private said = 0

  /** The line written last, which a repeat of is not read again. */
  private last: ConsoleDetail | undefined = undefined

  /** Lines written before the log was drawn, handed to it once it is. */
  private waiting: ConsoleDetail[] = []

  private get output(): Output | null {
    return this.renderRoot?.querySelector<Output>('[part="output"]') ?? null
  }

  /**
   * Adds a line, which the log folds into the one above where they are the
   * same, and tells a screen reader, unless it repeats the line before it.
   *
   * `write` rather than `append`, which every element already has from
   * `ParentNode` and which takes nodes. Shadowing it would break
   * `console.append(node)` for anyone who reasonably expected the DOM method.
   */
  write(detail: ConsoleDetail): void {
    const repeat = this.last?.level === detail.level && this.last.text === detail.text
    this.last = detail
    const output = this.output
    if (output) {
      output.writeLine({ level: detail.level, text: detail.text })
    } else {
      this.waiting.push(detail)
    }
    if (!repeat) {
      const before = levelSaid(this.spokenWords[detail.level], detail.text)
      this.said += 1
      this.heard = [
        ...this.heard,
        { key: this.said, words: before ? `${before} ${detail.text}` : detail.text },
      ].slice(-HEARD)
    }
  }

  /** Empties the console. */
  clear(): void {
    this.output?.clear()
    this.waiting = []
    this.last = undefined
    this.heard = []
  }

  protected override updated(changed: Map<PropertyKey, unknown>): void {
    super.updated(changed)
    const output = this.output
    if (output && this.waiting.length > 0) {
      for (const detail of this.waiting.splice(0)) {
        output.writeLine({ level: detail.level, text: detail.text })
      }
    }
  }

  /**
   * Takes the level the reader chose in the filter, unless a listener
   * refused it, and then says so with the select's own `change`, which stops
   * at the shadow root otherwise. A refusal puts the select back.
   *
   * The select's `input` is stopped where it starts, as Pagination's is. It is
   * composed and comes first, so it left this element before
   * `helix-before-change` and still left it when the change was refused.
   */
  private readonly handleLevel = (event: Event): void => {
    const field = event.target as HTMLSelectElement
    const taken = requestChange({
      apply: (next: string) => {
        this.level = next === 'log' ? undefined : (next as ConsoleLevel)
      },
      event: (next) => new HelixBeforeChangeEvent({ value: next }),
      host: this,
      next: field.value,
    })
    if (taken) {
      this.relayNativeEvent(event)
    } else {
      field.value = this.level ?? 'log'
    }
  }

  /** The level filter and the clear button, under `controls`. */
  private renderControls(): TemplateResult | typeof nothing {
    if (!this.controls) {
      return nothing
    }
    /* Read before the template, so the words audit, which pairs backticks
       across the nested option template, does not take the button's words for
       text joined in code. */
    const clear = this.clearLabel
    const button = this.tag('button')
    return html`<div part="controls">
      <select part="filter" aria-label=${this.levelLabel} @change=${this.handleLevel} @input=${stop}>
        ${LEVELS.map(
          (one) =>
            html`<option value=${one} ?selected=${(this.level ?? 'log') === one}>
              ${this.levelWords[one]}
            </option>`,
        )}
      </select>
      <${button}
        part="clear"
        exportparts="button: clear-button, live: clear-live, spinner: clear-spinner, text: clear-text"
        @click=${() => this.clear()}
        @helix-press=${stopPress}
      >${clear}</${button}>
    </div>`
  }

  protected override render(): TemplateResult {
    const log = this.tag('log')
    return html`${this.renderControls()}<${log}
        part="output"
        exportparts="after: output-after, before: output-before, dropped: output-dropped, empty: output-empty,
        group-content: output-group-content, group-duration: output-group-duration,
        group-heading: output-group-heading, group-mark: output-group-mark,
        group-status: output-group-status, group-summary: output-group-summary,
        group-summary-done: output-group-summary-done,
        group-summary-failed: output-group-summary-failed,
        group-summary-pending: output-group-summary-pending,
        group-summary-running: output-group-summary-running,
        group-summary-skipped: output-group-summary-skipped, line: output-line,
        line-count: output-line-count, line-count-label: output-line-count-label,
        line-debug: output-line-debug, line-error: output-line-error,
        line-grouped: output-line-grouped, line-level: output-line-level,
        line-marked: output-line-marked, line-match: output-line-match,
        line-number: output-line-number, line-run: output-line-run,
        line-run-bold: output-line-run-bold, line-run-dim: output-line-run-dim,
        line-run-italic: output-line-run-italic, line-run-strike: output-line-run-strike,
        line-run-underline: output-line-run-underline, line-selected: output-line-selected,
        line-text: output-line-text, line-time: output-line-time, line-warn: output-line-warn,
        live: output-live, loading: output-loading, log: output-log, resume: output-resume,
        resume-button: output-resume-button, resume-mark: output-resume-mark, row: output-row,
        toolbar: output-toolbar"
        collapse
        empty-text=${this.emptyLabel ?? this.emptyText}
        label=${this.label || this.fallbackLabel}
        level=${this.level ?? nothing}
        limit=${LIMIT}
        quiet
        separation="plain"
        wrap
      ></${log}>
      <div part="live" role="log">
        ${repeat(
          this.heard,
          (one) => one.key,
          (one) => html`<p>${one.words}</p>`,
        )}
      </div>`
  }

  /* The live region's clip first, as that sheet asks. */
  static override styles: CSSResultGroup = [liveStyles, styles]
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox-console': HelixSandboxConsole
  }
}
