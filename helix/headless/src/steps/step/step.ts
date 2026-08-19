import { customElement, HelixElement, HelixSelectEvent, hostAria } from '@helix-io/core'
import { check } from '@helix-io/icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One stage in a sequence.
 *
 * @description
 * **The name is a button, and only the name.** A stepper is something a reader
 * goes back through, and the thing they reach for is the name of the stage. The
 * marker is `aria-hidden` decoration, so wrapping it in the button would add
 * hit area and no meaning: the accessible name would be the text either way,
 * and what is pressable would stop being the same shape as what is readable.
 *
 * It says nothing about where a reader may go. Every step is pressable and
 * announces itself with `helix-select`; refusing the ones ahead is `disabled`,
 * which the consumer sets because only the consumer knows whether a form can be
 * skipped. A component that guessed would be wrong on the first wizard that
 * lets you jump to the end.
 *
 * **The marker is a slot whose fallback is the number.** A step is numbered by
 * a CSS counter in the styled tier, so the digit costs no script and is in the
 * server's markup; a consumer who wants an icon there fills the slot instead.
 * `complete` swaps the fallback for a check, because a finished stage has an
 * answer and the number was only ever standing in for one.
 *
 * **`complete` and `current` are separate, and both can be false.** A stage
 * that is neither is one the reader has not reached, which is the majority of
 * any sequence and therefore the state that needs no attribute. They can also
 * both be true: a reader who steps back into a finished stage is in it and has
 * finished it, and a stepper that forgets the second is one that loses its
 * checks the moment somebody reviews their answers.
 *
 * **The `content` slot opens on the current step, and only down a column.** A
 * row has no room under a step to put a form in, and stretching one to fit
 * would set every step's height by the tallest. `current` is what opens it, so
 * the state that says where the reader is is also the state that shows them the
 * stage: one attribute, no second flag to keep in step with it, and it renders
 * open on the server rather than after hydration.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Stage
 * @documentation https://helix.fusion.dev/components/steps
 *
 * @slot - The step's name.
 * @slot description - A line under the name, for what the stage is for.
 * @slot marker - Replaces the number, or the check a complete step shows.
 * @slot content - What the stage holds, shown while it is the current one.
 *
 * @csspart marker - The shape carrying the number or the check.
 * @csspart body - The name and its description.
 * @csspart label - The step's name, which is the button.
 * @csspart description - The line under it.
 * @csspart connector - The line running on to the next step.
 * @csspart content - What the stage holds, while it is open.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the step is pressed.
 */
@customElement('helix-base-step')
export class HelixBaseStep extends HelixElement {
  /** Whether the reader has finished this stage. */
  @property({ reflect: true, type: Boolean })
  complete = false

  /** Whether this is the stage the reader is in. */
  @property({ reflect: true, type: Boolean })
  current = false

  /** Whether the reader may go to this stage. */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /** What this stage is called when it announces itself. */
  @property()
  value = ''

  /** Announces the step, unless it is refusing. */
  select(): void {
    if (this.disabled) {
      return
    }
    this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { role: 'listitem' })
    this.internals.ariaCurrent = this.current ? 'step' : null
  }

  protected override render(): TemplateResult {
    /* The connector is the line running on to the *next* step, not the one
       arriving from the last.
       Both were tried. Arriving works only where every step is the same width,
       which is true of a row and false of a column, where a step is as tall as
       its own description. Running on needs one measurement a step always has,
       its own size: the next marker sits exactly one step plus one gap away
       along the axis, whatever that step turns out to hold. The last one has
       nothing to run on to, and `:host(:last-child)` hides it with no index and
       no parent counting its children. */
    return html`<span part="connector" aria-hidden="true"></span>
      <span part="marker" aria-hidden="true">
        <slot name="marker">
          ${
            this.complete
              ? html`<svg fill="currentColor" viewBox=${check.viewBox}>
                  ${unsafeSVG(check.content)}
                </svg>`
              : nothing
          }
        </slot>
      </span>
      <span part="body">
        <button part="label" type="button" ?disabled=${this.disabled} @click=${this.select}>
          <slot></slot>
        </button>
        <span part="description"><slot name="description"></slot></span>
      </span>
      <div part="content"><slot name="content"></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-step': HelixBaseStep
  }
}
