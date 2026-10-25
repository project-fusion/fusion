import { customElement, HelixElement, hostAria, words } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
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
 * **A feed that loads more entries sets `loading` while it fetches.** The
 * timeline is busy, and an entry after the last says "Loading more"
 * (`loading-text`, or your own content in the `loading` slot). Put a button
 * that asks for more after the timeline, and move focus to the first new
 * entry when they arrive.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Activity feed, History, Changelog, Audit trail
 * @documentation https://fusion.dev/helix/components/timeline
 *
 * @slot - The entries, and any groups of them.
 * @slot loading - Content for the entry after the last while `loading` is set. Falls back to `loading-text`.
 *
 * @csspart loading - The entry after the last while `loading` is set.
 *
 * @cssstate loading - While `loading` is set.
 */
@customElement('helix-headless-timeline')
export class HelixHeadlessTimeline extends HelixElement {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-timeline': { loadingText: 'Wird geladen' } })`.
   */
  static words = 'helix-timeline'

  /**
   * Accessible name for the timeline, for people who reach it out of context.
   */
  @property()
  label = ''

  /**
   * Marks the timeline as busy fetching more entries, and draws an entry
   * after the last that says so.
   */
  @property({ reflect: true, type: Boolean })
  loading = false

  /**
   * The old name of `loading-text`, read only where a page sets it.
   *
   * @deprecated Use `loading-text`. Removed in the next release.
   */
  @property({ attribute: 'loading-label' })
  loadingLabel?: string

  /** The text of the entry drawn while `loading` is set, where the `loading` slot is empty. */
  @words
  @property({ attribute: 'loading-text' })
  loadingText = 'Loading more'

  protected override render(): TemplateResult {
    return html`<slot></slot>${
      this.loading
        ? html`<div part="loading" role="listitem"><slot name="loading">${this.loadingLabel ?? this.loadingText}</slot></div>`
        : nothing
    }`
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* On the host through internals rather than as an attribute, so the role is
       there for a screen reader without being markup the server never wrote.
       `Steps` says the same about its own list. */
    hostAria(this.internals, { label: this.label, role: 'list' })
    this.internals.ariaBusy = this.loading ? 'true' : null
    this.toggleState('loading', this.loading)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-timeline': HelixHeadlessTimeline
  }
}
