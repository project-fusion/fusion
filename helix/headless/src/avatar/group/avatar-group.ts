import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * The largest `max` a stylesheet can hide past.
 *
 * The fold is `:host([max="N"]) ::slotted(:nth-child(n + N+1))`, one selector
 * per value, because `An+B` takes a literal and no custom property can be read
 * into it. So the range is finite, and it is written down beside the count that
 * has to agree with it: a count that folds and a stylesheet that does not would
 * put a "+5" beside five avatars that are still on screen.
 */
export const FOLDS_UP_TO = 12

/**
 * @summary Overlapping avatars, with a count for the ones not shown.
 *
 * @description
 * A part of `Avatar` that arranges avatars.
 *
 * The group computes the overflow count from `max` and renders the "+3" itself.
 * There is no slot for it, because the number has to match which avatars are
 * hidden.
 *
 * Avatars past `max` stay in the DOM and are hidden. Changing `max` re-renders
 * nothing, and the accessible name is still built from all of them.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Avatar stack, Facepile
 * @documentation https://fusion.dev/helix/components/avatar
 *
 * @slot - The avatars, in the order they should be read.
 *
 * @csspart overflow - The count of avatars past `max`.
 */
@customElement('helix-headless-avatar-group')
export class HelixHeadlessAvatarGroup extends HelixElement {
  /**
   * Accessible name for the set, such as "Reviewers".
   */
  @property()
  label = ''

  /**
   * How many avatars are shown before the rest become a count.
   *
   * Unset shows all of them, which is what no limit means and is more useful
   * than refusing to render.
   *
   * **Reflected, because the fold is a stylesheet rule and nothing else.** A
   * sheet hides past the limit one selector per value, as `FOLDS_UP_TO`
   * describes, so the attribute *is* the mechanism: a `max` that reaches this
   * property and never reaches the host matches no rule, and every avatar is
   * drawn beside a count claiming some are hidden. Markup is the safe path and
   * hides the fault; a script is the broken one, and React takes it for
   * everyone, assigning a matching property rather than an attribute.
   *
   * **Optional rather than defaulted, per the rule that a reflected property
   * takes no default**: `max = 0` would stamp `max="0"` onto every host that
   * never asked for a limit, including on the server.
   */
  @property({ reflect: true, type: Number })
  max?: number

  /** The avatars, in light-DOM order. Empty on the server, which has no tree. */
  get avatars(): HTMLElement[] {
    /* What a render may know, since `overflow` reads this in `render`: none on
       a server, whose shim has no tree, nor while hydrating what one sent. */
    return this.knownChildren.filter((child): child is HTMLElement => child instanceof HTMLElement)
  }

  /**
   * How many avatars are past the limit, and so not shown.
   *
   * Not `hidden`, which is `HTMLElement`'s own boolean: a getter of that name
   * returning a number is a type error, and had it been assignable it would
   * have been worse, because a group with three extra members would have set
   * the attribute that hides the whole group.
   */
  get overflow(): number {
    const limit = this.max ?? 0
    const limited = limit > 0 && limit <= FOLDS_UP_TO
    return limited ? Math.max(this.avatars.length - limit, 0) : 0
  }

  /** Said once per element, because a re-render is not a second mistake. */
  private warned = false

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'group' })
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* Nothing hides anything here: the stylesheet does it, from `max` on the
       host. What is left is saying so when a `max` is set that no rule can
       match, because showing everyone is a defensible answer and showing
       everyone beside a "+5" is not. */
    const limit = this.max ?? 0
    if (limit > FOLDS_UP_TO && this.avatars.length > limit && !this.warned) {
      this.warned = true
      console.warn(
        `<${this.localName}> has max="${this.max}", past the ${FOLDS_UP_TO} the fold is written for, ` +
          'so every avatar is shown and none are counted. Lower `max`, or hand the group the ' +
          'avatars you want shown.',
      )
    }
  }

  protected override render(): TemplateResult {
    const past = this.overflow
    return html`<slot @slotchange=${() => this.requestUpdate()}></slot>
      ${past > 0 ? html`<span part="overflow" aria-hidden="true">+${past}</span>` : ''}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-avatar-group': HelixHeadlessAvatarGroup
  }
}
