import { customElement, HelixElement, hostAria } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

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
@customElement('helix-base-avatar-group')
export class HelixBaseAvatarGroup extends HelixElement {
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
    return this.max > 0 ? Math.max(this.avatars.length - this.max, 0) : 0
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'group' })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* Marked on the avatars themselves, because the group cannot select its own
       light-DOM children past a count from CSS alone: `::slotted()` takes a
       compound selector and not `:nth-child()` counting from the other end.
       Client only, which is where a limit can be applied at all, since the
       server cannot see the children to count them. */
    const max = this.max > 0 ? this.max : Number.POSITIVE_INFINITY
    this.avatars.forEach((avatar, index) => {
      avatar.toggleAttribute('data-overflow', index >= max)
    })
  }

  protected override render(): TemplateResult {
    const past = this.overflow
    return html`<slot @slotchange=${() => this.requestUpdate()}></slot>
      ${past > 0 ? html`<span part="overflow" aria-hidden="true">+${past}</span>` : ''}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-avatar-group': HelixBaseAvatarGroup
  }
}
