import { type ConsoleDetail, customElement, HelixElement } from '@fusion.dev/helix-core'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import { styles } from './sandbox-terminal.css.js'

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
 * Fed by the sandbox, which hears `helix-console` from the preview and hands it
 * here. The preview is a separate document, so what arrives has already crossed
 * `postMessage`: text, not values.
 *
 * **Repeats collapse.** An example with a render loop can write the same
 * warning hundreds of times, and two hundred identical lines say nothing that
 * one line and a count does not. Only consecutive repeats collapse, so the
 * order of what happened survives.
 *
 * A `role="log"` rather than a live region by hand. It is the semantic for an
 * append-only stream, and it means a reader is told about new output without
 * the whole panel being re-announced each time.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Console, Output
 * @documentation https://fusion.dev/helix/components/sandbox
 *
 * @csspart count - How many times a repeated line was written.
 * @csspart empty - Shown while nothing has been written.
 * @csspart entry - One line.
 * @csspart level - The console level a line was written at.
 * @csspart log - The scrolling region.
 * @csspart message - The text of a line.
 *
 * @cssproperty --sandbox-terminal-size - Height of the scrolling region.
 */
@customElement('helix-sandbox-terminal')
export class HelixSandboxTerminal extends HelixElement {
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

  protected override render(): TemplateResult {
    return html`<div part="log" role="log" aria-label=${this.label} tabindex="0">
      ${
        this.entries.length === 0
          ? html`<p part="empty">${this.emptyLabel}</p>`
          : this.entries.map(
              (entry) => html`<div part="entry" data-level=${entry.level}>
                <span part="level" aria-hidden="true">${entry.level}</span>
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
