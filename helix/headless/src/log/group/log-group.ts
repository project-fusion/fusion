import {
  customElement,
  formatWords,
  HelixElement,
  MixinControllerOpen,
  SPOKEN_RULE,
  words,
} from '@fusion.dev/helix-core'
import {
  caretDown,
  checkCircleFill,
  circle,
  clock,
  minus,
  xCircleFill,
} from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import type { LogStatus } from '../buffer.js'

/** The mark each status draws. */
const MARKS = {
  done: checkCircleFill,
  failed: xCircleFill,
  pending: circle,
  running: clock,
  skipped: minus,
} as const

/**
 * @summary One step of a log, which folds its lines under a heading with its status and how long it took.
 *
 * @description
 * A group is a disclosure: its heading is a button that shows and hides the
 * lines inside it, and says whether they are shown with `aria-expanded`. Put
 * `Log.Line` elements inside it, and nest groups for steps within steps.
 *
 * `status` draws a mark before the heading, and a screen reader hears the
 * status after the heading (`status-label`). `duration` stands at the end of
 * the heading, as you write it, such as `12s`.
 *
 * A group starts shut. Write `default-open` on the step a reader should see,
 * such as the one that failed.
 *
 * @since 0.200.0
 * @status experimental
 * @documentation https://fusion.dev/helix/components/log
 *
 * @slot - The lines of the step, and any groups inside it.
 * @slot heading - The heading, where it holds more than text. Defaults to `heading`.
 *
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before the group closes. Cancelable.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the group opens. Cancelable.
 * @event {ToggleEvent} toggle - Fired after the group opens or closes, with `newState` and `oldState`.
 *
 * @csspart content - The lines, hidden while the group is shut.
 * @csspart duration - How long the step took.
 * @csspart heading - The heading.
 * @csspart mark - The caret that turns as the group opens, an `<svg>` you size.
 * @csspart status - The mark for the status, an `<svg>` you size.
 * @csspart summary - The button that opens and closes the group.
 *
 * @cssstate empty - The group holds nothing to show, so opening it shows nothing.
 * @cssstate open - The group shows its lines.
 * @cssstate steps - The group holds steps of its own, which a stylesheet draws as a tree rather than as output.
 */
@customElement('helix-headless-log-group')
export class HelixHeadlessLogGroup extends MixinControllerOpen(HelixElement) {
  protected static override markRules = [SPOKEN_RULE]

  /** The key this family's words are registered under, its styled tag. */
  static words = 'helix-log'

  /** How long the step took, as it should read, such as `12s`. */
  @property()
  duration = ''

  /** What the step is called. The `heading` slot replaces it. */
  @property()
  heading = ''

  /**
   * @internal Set by a log that draws the group from data: the group stands
   * for a heading alone, its lines being drawn beside it.
   */
  @property({ attribute: false })
  logDrawn = false

  /** Where the step stands, which draws a mark before the heading. */
  @property({ reflect: true })
  status?: LogStatus

  /**
   * @internal Read by the log to find its groups among its children, which is
   * cheaper than `instanceof`.
   */
  readonly isLogGroup = true

  /**
   * What a screen reader hears for the status, after the heading.
   * `{status}` is one of `pending`, `running`, `done`, `failed`, and `skipped`.
   */
  @words
  @property({ attribute: 'status-label' })
  statusLabel =
    '{status, select, pending {waiting} running {running} done {finished} failed {failed} skipped {skipped} other {}}'

  private readonly handlePress = (): void => {
    this.toggleOpen()
  }

  /** Records whether the group holds anything, and whether a step is among it. */
  private readonly handleSlotChange = (): void => {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('[part="content"] > slot')
    if (!slot) {
      return
    }
    const held = slot.assignedElements()
    this.toggleState('empty', held.length === 0)
    this.toggleState(
      'steps',
      held.some((element) => 'isLogGroup' in element),
    )
  }

  /** A slot that is never filled fires no `slotchange`, so the first render reads it once. */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.handleSlotChange()
  }

  /**
   * The words in the button are separated by spaces in the markup, since a
   * name is read off inline boxes with nothing between them: without them a
   * screen reader heard "Installfailed12s". A flex row draws none of them.
   */
  protected override render(): TemplateResult {
    const status = this.status
    return html`<button
        part="summary"
        id="summary"
        type="button"
        aria-expanded=${this.open ? 'true' : 'false'}
        aria-controls=${this.logDrawn ? nothing : 'content'}
        @click=${this.handlePress}
      ><svg part="mark" aria-hidden="true" fill="currentColor" viewBox=${caretDown.viewBox}>
          ${unsafeSVG(caretDown.content)}
        </svg>${
          status && Object.hasOwn(MARKS, status)
            ? html`<svg part="status" aria-hidden="true" fill="currentColor" viewBox=${MARKS[status].viewBox}>
                ${unsafeSVG(MARKS[status].content)}
              </svg>`
            : nothing
        }<span part="heading"><slot name="heading">${this.heading}</slot></span>${
          status
            ? html` <span data-spoken>${formatWords(this, 'statusLabel', { status })}</span>`
            : nothing
        }${this.duration === '' ? nothing : html` <span part="duration">${this.duration}</span>`}</button
      >${
        this.logDrawn
          ? nothing
          : html`<div
              part="content"
              id="content"
              role="group"
              aria-labelledby="summary"
              ?hidden=${!this.open}
            ><slot @slotchange=${this.handleSlotChange}></slot></div>`
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-log-group': HelixHeadlessLogGroup
  }
}
