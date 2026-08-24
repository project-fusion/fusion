import { customElement, HelixElement, hostAria } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * The largest `max` the styled tier can hide past.
 *
 * The fold is `:host([max="N"]) ::slotted(:nth-child(n + N+1))`, one selector
 * per value, because `An+B` takes a literal and no custom property can be read
 * into it. So the range is finite and this is where it is written down, in the
 * tier that has to agree with it: a count that folds and a stylesheet that does
 * not would put a "+5" beside five avatars that are still on screen.
 */
const FOLDS_UP_TO = 12

/**
 * @summary Overlapping avatars, with a count for the ones not shown.
 *
 * @description
 * A part of `Avatar` rather than a family of its own: it arranges avatars and
 * is about nothing else, and its member is a complete `Avatar` the group did
 * not have to explain.
 *
 * **The overflow count is the group's, not a slot.** Which avatars are hidden
 * is a fact the group works out from `max` and how many it was given, so a
 * consumer writing the "+3" themselves would be writing a number that has to
 * agree with a list they do not control.
 *
 * **Hidden, not removed.** Past `max`, the extra avatars stay in the DOM and
 * stop being shown, so nothing re-renders when `max` changes and the accessible
 * name can still be built from all of them. The count is what a sighted reader
 * gets; the group's own name is what everyone else gets, and "Seven people" is
 * more useful than seven names read in a row.
 *
 * **And hidden by the stylesheet, not by this class.** It wrote `data-overflow`
 * onto each avatar from `updated`, which is one update too late and one element
 * too far out: Lit renders on a microtask, so an avatar appended past the limit
 * was laid out and painted before anything ran to hide it, and the group was
 * writing attributes onto markup a consumer owns to do it. Measured in Chrome
 * 148, appending two past `max="3"` and reading before yielding: five `flex`,
 * folding to three on the next update. The styled tier now does it with
 * `:host([max="N"]) ::slotted(:nth-child(n + N+1))`, which is right at the
 * first style resolution and writes nothing.
 *
 * **The fold is finite, and the count agrees with it.** `An+B` takes a literal,
 * so there is one selector per value of `max` and the range stops at twelve.
 * Past that the group shows everyone, counts nothing and says so, because
 * showing everyone is a defensible answer and showing everyone beside a "+5" is
 * not. `max` above twelve is a list the consumer should be slicing themselves.
 *
 * **It is a list.** A row of faces is a set of separate people, and a group
 * with no role announces as one run of text. `role="list"` needs its children
 * to be `listitem`, which they cannot be told to become without writing an
 * attribute onto a consumer's element, so the group carries `role="group"` and
 * its name instead: one announcement, correct, and nothing written to anyone
 * else's markup.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Avatar stack, Facepile
 * @documentation https://helix.fusion.dev/components/avatar
 *
 * @slot - The avatars, in the order they should be read.
 *
 * @csspart overflow - The count of avatars past `max`.
 */
@customElement('helix-headless-avatar-group')
export class HelixHeadlessAvatarGroup extends HelixElement {
  /** Accessible name for the set, such as "Reviewers". */
  @property()
  label = ''

  /**
   * How many avatars are shown before the rest become a count.
   *
   * Zero or less shows all of them, which is what an unset limit means and is
   * more useful than refusing to render.
   */
  @property({ type: Number })
  max = 0

  /** The avatars, in light-DOM order. Empty on the server, which has no tree. */
  get avatars(): HTMLElement[] {
    /* `?? []` is the server: Lit's element shim carries attributes and not a
       tree, so `children` is undefined there and spreading it throws. The same
       fault the menu item, the table and the carousel each had in turn, which
       is why it is written before it can happen again. */
    return [...(this.children ?? [])].filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    )
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
    const limited = this.max > 0 && this.max <= FOLDS_UP_TO
    return limited ? Math.max(this.avatars.length - this.max, 0) : 0
  }

  /** Said once per element, because a re-render is not a second mistake. */
  private warned = false

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'group' })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* Nothing hides anything here any more: the stylesheet does it, from `max`
       on the host, so the arrangement is right at the first style resolution
       rather than one update later. What is left is saying so when a `max` is
       set that no rule can match, because showing everyone is a defensible
       answer and showing everyone beside a "+5" is not. */
    if (this.max > FOLDS_UP_TO && this.avatars.length > this.max && !this.warned) {
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
