import { customElement, HelixElement, HelixSelectEvent, hostAria } from '@helix-io/core'
import { checkCircleFill, circle, record } from '@helix-io/icons'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
/* Side-effect import, because this renders `<helix-button>` and a custom element
   registers on import. The public tag rather than the base one: a consumer on the
   styled tier gets the styled button, and one on the headless tier brings a button
   of their own under that name. `check:composed` enforces it, in both tiers. */
import '../../button/index.js'

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
 * It is `helix-button`, not a `<button>` this element resets and dresses. The
 * hover wash, the focus ring, the disabled treatment and the way the label sits
 * against an icon are all decisions the button already carries, and a second
 * copy of them here is a second copy to keep in step. `tertiary` is the quiet
 * shape: transparent until it is pointed at.
 *
 * It says nothing about where a reader may go. Every step is pressable and
 * announces itself with `helix-select`; refusing the ones ahead is `disabled`,
 * which the consumer sets because only the consumer knows whether a form can be
 * skipped. A component that guessed would be wrong on the first wizard that
 * lets you jump to the end.
 *
 * **The marker is a slot whose fallback is the state.** A finished stage shows
 * a check, the current one a target, and one not yet reached an empty ring:
 * three marks that say what a reader wants to know without a legend. A consumer
 * who wants their own fills the slot instead.
 *
 * The step renders exactly one of the three, chosen from its own two booleans.
 * Rendering all three and hiding two in CSS would work and is worse: the
 * accessibility tree would carry marks that are not there, and the markup would
 * say three things about a stage that is one.
 *
 * Numbering is a separate question and belongs to the tier above. `numeric`
 * hides the mark and shows a CSS counter, which the browser resolves at layout,
 * so the digit costs no script and is right in the server's markup however the
 * steps are ordered. Nothing here knows which appearance is in use, and does
 * not need to.
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
 * @csspart label - The step's name, which is a `helix-button`.
 * @csspart description - The line under it.
 * @csspart lead - The half line arriving from the step before.
 * @csspart trail - The half line running on to the next.
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

  /**
   * The mark this stage's state calls for.
   *
   * `complete` first, so a stage a reader has stepped back into keeps its check
   * rather than losing it to the target: they did finish it, and the fill on
   * the mark is what says they are back in it.
   */
  private get mark(): TemplateResult {
    const icon = this.complete ? checkCircleFill : this.current ? record : circle
    return html`<svg fill="currentColor" viewBox=${icon.viewBox}>${unsafeSVG(icon.content)}</svg>`
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { role: 'listitem' })
    this.internals.ariaCurrent = this.current ? 'step' : null
  }

  protected override render(): TemplateResult {
    /* Two half lines, one either side of the mark, rather than one line running
       the whole way to the next step.
       A single line was tried twice. Drawn to the next marker it has to know
       how far away that is, which is the next step's size, and a step knows
       only its own. Drawn across the gap alone it is a stub. Two halves need
       neither: each reaches from the mark to its own step's edge and half the
       gap beyond, so it meets the one coming the other way in the middle of the
       gap and the rule reads as continuous however wide the steps are or how
       differently they are filled.
       The first has nothing on its leading side and the last nothing on its
       trailing one, which `:host(:first-child)` and `:host(:last-child)` say
       with no index and no parent counting its children. */
    return html`<span part="lead" aria-hidden="true"></span>
      <span part="trail" aria-hidden="true"></span>
      <span part="marker" aria-hidden="true">
        <slot name="marker">${this.mark}</slot>
      </span>
      <span part="body">
        <helix-button
          part="label"
          appearance="tertiary"
          ?disabled=${this.disabled}
          @click=${this.select}
        >
          <slot></slot>
        </helix-button>
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
