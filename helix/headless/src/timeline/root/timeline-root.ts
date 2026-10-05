import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A list of events, in the order they happened.
 *
 * @description
 * A timeline is a record of events that happened or are scheduled. Each entry
 * carries a time, and no entry is current or complete. For a process you move
 * through, with a current stage and `active` and `complete` states, use
 * `Steps`.
 *
 * Each entry draws the connector line that arrives at it and hides it when it
 * is first, using `:host(:first-child)`. This resolves at layout with no
 * script, so the server markup is correct before anything runs.
 *
 * The host has `role="list"`, because the entries are your elements in the
 * light DOM. `Steps` does the same.
 *
 * **Group entries by date with `Timeline.Group`**, which puts a heading such as
 * "Today" over its entries. The group is an entry of the timeline, and its
 * entries are a list of their own named by the heading.
 *
 * **The reading order is the order you write the entries in**, in every layout
 * the styled tier draws: down the page, either side of a line down the middle,
 * or across the page. Inside each entry the time is read before what happened.
 * Write the entries in the order the events happened, oldest or newest first,
 * and the layout only moves where they are drawn.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Activity feed, History, Changelog, Audit trail
 * @documentation https://fusion.dev/helix/components/timeline
 *
 * @slot - The entries, and any groups of them.
 */
@customElement('helix-headless-timeline')
export class HelixHeadlessTimeline extends HelixElement {
  /**
   * Accessible name for the timeline, for people who reach it out of context.
   */
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
    'helix-headless-timeline': HelixHeadlessTimeline
  }
}
