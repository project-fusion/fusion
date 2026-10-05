import {
  type ConsoleDetail,
  customElement,
  HelixBeforeChangeEvent,
  HelixElement,
  requestChange,
  wordsConverter,
} from '@fusion.dev/helix-core'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import { type ConsoleLevel, LEVELS, shows } from '../levels.js'
import { styles } from './sandbox-terminal.css.js'

/** What each choice of the level filter reads, in English until a page says otherwise. */
const LEVEL_WORDS: Record<ConsoleLevel, string> = {
  error: 'Errors',
  info: 'Info and above',
  log: 'All levels',
  warn: 'Warnings and errors',
}

/** One line, with however many times it has arrived in a row. */
interface Entry extends ConsoleDetail {
  /** How many identical messages this line stands for. */
  count: number
}

/** How many lines are kept. Older ones fall off the top. */
const LIMIT = 200

/**
 * @summary A panel that shows what the previewed example wrote to the console.
 *
 * @description
 * The sandbox receives `helix-console` events from the preview and passes them
 * to the terminal. The preview is a separate document, so messages cross
 * `postMessage` and arrive as text.
 *
 * **Repeats collapse.** Consecutive identical lines show as one line with a
 * count, so an example with a render loop does not fill the panel with the same
 * warning. Only consecutive repeats collapse, so the order of messages is kept.
 *
 * The panel has `role="log"`, the role for an append-only stream. Screen
 * readers announce new output without reading the whole panel again. A line's
 * level is read before it, except a plain `log`, so an error does not sound
 * like any other line.
 *
 * **`controls` adds a clear button and a level filter** above the log. Both
 * are also yours to drive without them: `clear()` empties the log, and
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
 * @csspart clear - The button that empties the log, under `controls`.
 * @csspart controls - The row holding the clear button and the level filter, under `controls`.
 * @csspart count - How many times a repeated line was written.
 * @csspart empty - Shown while nothing has been written, or while the level filter hides every line.
 * @csspart entry - One line.
 * @csspart filter - The level filter, a native select, under `controls`.
 * @csspart level - The console level a line was written at.
 * @csspart log - The scrolling region.
 * @csspart message - The text of a line.
 *
 * @cssproperty --sandbox-terminal-size - Height of the scrolling region.
 */
@customElement('helix-sandbox-terminal')
export class HelixSandboxTerminal extends HelixElement {
  /**
   * The clear button's text, under `controls`.
   */
  @property({ attribute: 'clear-label' })
  clearLabel = 'Clear'

  /**
   * Shows a clear button and a level filter above the log.
   *
   * Off by default, because a sandbox that puts the terminal in a panel often
   * has a toolbar of its own for them.
   */
  @property({ reflect: true, type: Boolean })
  controls = false

  /**
   * Text shown before anything has been written.
   */
  @property({ attribute: 'empty-label' })
  emptyLabel = 'Nothing written to the console yet.'

  /**
   * The log's name, read by screen readers.
   */
  @property()
  label = 'Console output'

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
  @property({ attribute: 'level-label' })
  levelLabel = 'Levels shown'

  /**
   * What each choice of the level filter reads, for a page in another
   * language, keyed by level, such as `{ warn: '…' }`. A level left out keeps
   * its English words. As an attribute it is that object as JSON, and JSON
   * that does not parse is no words.
   */
  @property({ attribute: 'level-words', converter: wordsConverter })
  levelWords: Partial<Record<ConsoleLevel, string>> = {}

  @state()
  private entries: Entry[] = []

  /**
   * Whether the reader is at the bottom, and so wants to follow new output.
   *
   * Read before the render that adds a line and applied after it. Scrolling to
   * the bottom on every line would drag a reader off whatever they had scrolled
   * up to look at, which for a log of errors is the one thing they are doing.
   */
  private following = true

  private get log(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part="log"]')
  }

  /**
   * Adds a line, collapsing it into the one above when they are identical.
   *
   * `write` rather than `append`, which every element already has from
   * `ParentNode` and which takes nodes. Shadowing it would break
   * `terminal.append(node)` for anyone who reasonably expected the DOM method.
   */
  write(detail: ConsoleDetail): void {
    const log = this.log
    if (log) {
      // A pixel of tolerance: fractional scroll positions do not land exactly.
      this.following = log.scrollHeight - log.scrollTop - log.clientHeight < 2
    }

    const last = this.entries.at(-1)
    if (last && last.level === detail.level && last.text === detail.text) {
      this.entries = [...this.entries.slice(0, -1), { ...last, count: last.count + 1 }]
      return
    }
    this.entries = [...this.entries, { ...detail, count: 1 }].slice(-LIMIT)
  }

  /** Empties the log. */
  clear(): void {
    this.entries = []
    this.following = true
  }

  protected override updated(): void {
    if (this.following) {
      const log = this.log
      if (log) {
        log.scrollTop = log.scrollHeight
      }
    }
  }

  /**
   * Takes the level the reader chose in the filter, unless a listener
   * refused it, and then says so with the select's own `change`, which stops
   * at the shadow root otherwise. A refusal puts the select back.
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

  /** The clear button and the level filter, under `controls`. */
  private renderControls(): TemplateResult | typeof nothing {
    if (!this.controls) {
      return nothing
    }
    return html`<div part="controls">
      <select part="filter" aria-label=${this.levelLabel} @change=${this.handleLevel}>
        ${LEVELS.map(
          (one) =>
            html`<option value=${one} ?selected=${(this.level ?? 'log') === one}>
              ${this.levelWords?.[one] ?? LEVEL_WORDS[one]}
            </option>`,
        )}
      </select>
      <button part="clear" type="button" @click=${() => this.clear()}>${this.clearLabel}</button>
    </div>`
  }

  protected override render(): TemplateResult {
    const shown = this.entries.filter((entry) => shows(entry.level, this.level))
    return html`${this.renderControls()}<div part="log" role="log" aria-label=${this.label} tabindex="0">
      ${
        shown.length === 0
          ? html`<p part="empty">${this.emptyLabel}</p>`
          : shown.map(
              (entry) => html`<div part="entry" data-level=${entry.level}>
                <span part="level" aria-hidden=${entry.level === 'log' ? 'true' : nothing}
                  >${entry.level}</span
                >
                <span part="message">${entry.text}</span>
                ${
                  entry.count > 1
                    ? html`<span part="count" aria-label="${entry.count} times"
                        >${entry.count}</span
                      >`
                    : nothing
                }
              </div>`,
            )
      }
    </div>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-sandbox-terminal': HelixSandboxTerminal
  }
}
