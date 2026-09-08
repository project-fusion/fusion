import { customElement, HelixElement, HelixSelectEvent, hostAria } from '@fusion.dev/helix-core'
import { check, circle, record } from '@fusion.dev/helix-icons'
import type { PropertyValues, TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html } from 'lit/static-html.js'
/* Relative, so this registers the base button and the styled file's identical
   import registers the styled one. `tier` picks which the template asks for. */
import '../../button/index.js'

/**
 * @summary One stage in a sequence.
 *
 * @description
 * **The name is a button, and only the name.** The marker is `aria-hidden`
 * decoration, so wrapping it would add hit area and no meaning. It is
 * `helix-button` rather than a `<button>` this element resets: the hover wash,
 * the focus ring and the disabled treatment are decisions the button carries.
 *
 * **It says nothing about where a reader may go.** Every step is pressable and
 * announces itself with `helix-select`; refusing the ones ahead is `disabled`,
 * which the consumer sets, because only they know whether a form can be
 * skipped.
 *
 * **The marker is a slot whose fallback is the state.** A finished stage shows
 * a check, the current one a target, one not yet reached an empty ring. Exactly
 * one is rendered, chosen from the step's own two booleans, rather than three
 * with two hidden in CSS: the accessibility tree would otherwise carry marks
 * that are not there.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Stage
 * @documentation https://helix.fusion.dev/components/steps
 *
 * @slot - The step's name.
 * @slot content - What the stage holds, shown while it is the current one.
 * @slot description - A line under the name, for what the stage is for.
 * @slot marker - Replaces the number, or the check a complete step shows.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the step is pressed. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart body - The name and its description.
 * @csspart content - What the stage holds, while it is open.
 * @csspart description - The line under it.
 * @csspart label - The step's name, which is a `helix-button`.
 * @csspart label-button - The inner control.
 * @csspart lead - The half line arriving from the step before.
 * @csspart mark - The glyph inside the marker: a tick, a dot, or an empty ring.
 * @csspart marker - The shape carrying the number or the check.
 * @csspart trail - The half line running on to the next.
 */
@customElement('helix-headless-step')
export class HelixHeadlessStep extends HelixElement {
  /**
   * Whether the reader has finished this stage.
   */
  @property({ reflect: true, type: Boolean })
  complete = false

  /**
   * Whether this is the stage the reader is in.
   */
  @property({ reflect: true, type: Boolean })
  current = false

  /**
   * Whether the reader may go to this stage.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * What this stage is called when it announces itself.
   */
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
   * rather than losing it to the target: they did finish it, and the name and
   * the rule below still say which one is open.
   *
   * **Three shapes, and the reader can tell them apart with the color off.**
   * An outline circle for a stage nobody has reached, the same circle with a
   * center for the one they are standing on, a bare check for one that is done.
   * The first two are one shape filling in, which is the progression, and the
   * check is the only mark that leaves the family because finishing is the only
   * state that is not a position in the sequence. A coin around the check would
   * put two of the three inside the same container and leave hue doing the work
   * of telling them apart.
   *
   * The bare check matches `Timeline`, deliberately: the two components report
   * the same kind of thing, a sequence with marks down it, and a check on a
   * hairline in one beside a check inside a coin in the other is two answers to
   * one question.
   */
  protected renderMarker(): TemplateResult {
    const icon = this.complete ? check : this.current ? record : circle
    return html`<slot name="marker"
      ><svg part="mark" fill="currentColor" viewBox=${icon.viewBox}
        >${unsafeSVG(icon.content)}</svg
      ></slot
    >`
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { role: 'listitem' })
    this.internals.ariaCurrent = this.current ? 'step' : null
  }

  /**
   * The step's own label, which is a control because a step can be gone to, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own,
   * wrap this one, or leave it out, without reimplementing the whole template.
   * The tag is interpolated rather than written, so `tier` resolves it: this
   * renders the headless element, and a styled subclass that sets `tier`
   * renders the styled one from the same template.
   */
  protected renderLabel(): TemplateResult {
    return html`<${this.tag('button')}
      part="label"
      exportparts="button: label-button"
      emphasis="ghost"
      ?disabled=${this.disabled}
      @click=${this.select}
    >
      <slot></slot>
    </${this.tag('button')}>`
  }

  protected override render(): TemplateResult {
    /* Two half lines, one either side of the mark, rather than one line running
       the whole way to the next step.
       A single line drawn to the next marker has to know how far away that is,
       which is the next step's size, and a step knows only its own; drawn
       across the gap alone it is a stub. Two halves need neither: each reaches
       from the mark to its own step's edge and half the gap beyond, so it meets
       the one coming the other way in the middle of the gap and the rule reads
       as continuous however wide the steps are or how differently they are
       filled.
       The first has nothing on its leading side and the last nothing on its
       trailing one, which `:host(:first-child)` and `:host(:last-child)` say
       with no index and no parent counting its children. */
    return html`<span part="lead" aria-hidden="true"></span>
      <span part="trail" aria-hidden="true"></span>
      <span part="marker" aria-hidden="true">
        ${this.renderMarker()}
      </span>
      <span part="body">
        ${this.renderLabel()}
        <span part="description"><slot name="description"></slot></span>
      </span>
      <div part="content"><slot name="content"></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-step': HelixHeadlessStep
  }
}
