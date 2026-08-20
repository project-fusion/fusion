import { customElement, HelixElement, hostAria } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A record of what happened, in the order it happened.
 *
 * @description
 * **Not `Steps`, and the difference is what the thing is for.** A stepper is a
 * process a reader is moving through: it has a stage they are on, stages they
 * have finished, and stages ahead, so it carries `active` and `complete` and
 * numbers itself. A timeline is a record of events that already happened, or are
 * scheduled to. Nothing is current, nothing is complete, and what each entry
 * carries instead is a time. Building this as an appearance of `Steps` would
 * have meant a stepper with no step you are on.
 *
 * What it does take from `Steps` is the connector. Each entry draws the line
 * that arrives at it and hides it when it is first, which needs neither an index
 * nor a parent that counts: `:host(:first-child)` is the whole of it, resolved
 * at layout with no script, so a server's markup is right before anything runs.
 *
 * `role="list"` on the host rather than an `<ol>` in the shadow root, for the
 * reason `Steps` gives: the entries are the consumer's elements in the light
 * DOM, so a list element here would be a list whose items are somewhere else.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Activity feed, History, Changelog, Audit trail
 * @documentation https://helix.fusion.dev/components/timeline
 *
 * @slot - The entries.
 */
@customElement('helix-base-timeline')
export class HelixBaseTimeline extends HelixElement {
  /**
   * Which way time runs. Down the page, or along it.
   *
   * Reflected, because the entries read it: an entry draws its own connector and
   * has to know which edge that line arrives on, and a property on this element
   * is not something its light-DOM children can select against. The attribute
   * is, through `:host-context`.
   */
  @property({ reflect: true })
  orientation?: 'horizontal'

  /** Names the record, for a reader arriving at it out of context. */
  @property()
  label = ''

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* On the host through internals rather than as an attribute, so the role is
       there for a screen reader without being markup the server never wrote.
       `Steps` says the same about its own list. */
    hostAria(this.internals, { label: this.label, role: 'list' })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-timeline': HelixBaseTimeline
  }
}
