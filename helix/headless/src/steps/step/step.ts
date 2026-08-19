import { customElement, HelixElement, hostAria } from '@helix-io/core'
import { check } from '@helix-io/icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One stage in a sequence.
 *
 * @description
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
 * `aria-current="step"` is the whole of what position means to a screen reader,
 * and it goes on the host through `ElementInternals` rather than as an
 * attribute, which is the rule the whole library follows: an attribute written
 * here is one a consumer's server markup never had.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Stage
 * @documentation https://helix.fusion.dev/components/steps
 *
 * @slot - The step's name.
 * @slot description - A line under the name, for what the stage is for.
 * @slot marker - Replaces the number, or the check a complete step shows.
 *
 * @csspart marker - The circle carrying the number or the check.
 * @csspart body - The name and its description.
 * @csspart label - The step's name.
 * @csspart description - The line under it.
 * @csspart connector - The line arriving from the step before this one.
 */
@customElement('helix-base-step')
export class HelixBaseStep extends HelixElement {
  /** Whether the reader has finished this stage. */
  @property({ reflect: true, type: Boolean })
  complete = false

  /** Whether this is the stage the reader is in. */
  @property({ reflect: true, type: Boolean })
  current = false

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { role: 'listitem' })
    this.internals.ariaCurrent = this.current ? 'step' : null
  }

  protected override render(): TemplateResult {
    /* The connector first in the markup, because it is the line arriving from
       the step before and the tier above hides it on the first one with
       `:host(:first-child)`. A structural pseudo-class is allowed inside
       `:host()` where `:has()` is not, which is what makes this work with no
       index and no parent counting its children. */
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
        <span part="label"><slot></slot></span>
        <span part="description"><slot name="description"></slot></span>
      </span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-step': HelixBaseStep
  }
}
