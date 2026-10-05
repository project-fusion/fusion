import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** The heading's id inside the shadow root, which names the group's list. */
const HEADING_ID = 'heading'

/**
 * @summary A run of timeline entries under a heading, such as a day.
 *
 * @description
 * Groups entries by date, such as "Today" and "Yesterday", in a timeline that
 * holds many. The group is an entry of the timeline, and its entries are a
 * list of their own, named by the heading. A screen reader lists the heading
 * with the page's headings and hears how many entries each day holds.
 *
 * The heading's level is `heading-level`, and 3 where it is not set.
 *
 * Each group draws its own line, so the line stops at the last entry of one
 * day and starts again at the first entry of the next.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Day, Section, Date group
 * @documentation https://fusion.dev/helix/components/timeline
 *
 * @slot - The entries.
 * @slot heading - The heading, when it is more than text. Falls back to `label`.
 *
 * @csspart entries - The list that holds the entries.
 * @csspart heading - The heading.
 */
@customElement('helix-headless-timeline-group')
export class HelixHeadlessTimelineGroup extends HelixElement {
  /**
   * The level of the group's heading, from 1 to 6.
   */
  @property({ attribute: 'heading-level', type: Number })
  headingLevel?: number

  /**
   * The heading, when it is plain text, such as "Today".
   *
   * The fallback of the `heading` slot, so slotted content replaces it.
   */
  @property()
  label = ''

  /* An entry of the timeline's list, said through `ElementInternals` so
     nothing is written onto the host. In `willUpdate`, which a server calls
     too. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { role: 'listitem' })
  }

  protected override render(): TemplateResult {
    const level = Math.min(6, Math.max(1, Math.trunc(this.headingLevel ?? 3)))
    return html`<div part="heading" id=${HEADING_ID} role="heading" aria-level=${level}>
        <slot name="heading">${this.label}</slot>
      </div>
      <div part="entries" role="list" aria-labelledby=${HEADING_ID}><slot></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-timeline-group': HelixHeadlessTimelineGroup
  }
}
