import { customElement, HelixElement, hostAria } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One event on a timeline: when it happened, and what it was.
 *
 * @description
 * **The time is a `<time>`, and only when there is a time to put in it.** Given
 * `datetime`, the label a consumer wrote is wrapped in the element the platform
 * has for exactly this, so the machine-readable instant travels with the human
 * one: a crawler, a reader's own tooling and a copy-paste all get "2026-08-19",
 * where "yesterday" on its own is a word. Given no `datetime`, it stays a span,
 * because a `<time>` with nothing to be precise about is markup pretending.
 *
 * **The connector is this element's, not the list's.** Each entry draws the line
 * that arrives at it and hides it when it is first, which `:host(:first-child)`
 * settles with no index, no counting parent and no script. `Steps` and
 * `Breadcrumbs` both do it this way and for the same reason.
 *
 * `tone` says what kind of event it was, and it is the only thing that colours
 * the mark. It takes `Announcement`'s vocabulary rather than a second one.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Activity item, History entry, Event
 * @documentation https://helix.fusion.dev/components/timeline
 *
 * @slot - What happened.
 * @slot marker - The mark on the line. Falls back to a dot, which is the slot's
 * own fallback content rather than anything this element works out: whether a
 * consumer slotted a mark is a question only the platform can answer, and it
 * answers it by rendering what is inside the slot when nothing replaced it.
 * @slot time - When it happened, as a reader should see it written.
 *
 * @csspart connector - The line arriving at this entry.
 * @csspart dot - The mark drawn where nothing was slotted for one.
 * @csspart content - What happened, and the time above it.
 * @csspart marker - The mark on the line.
 * @csspart rail - The column holding the mark and the line.
 * @csspart time - When it happened.
 */
@customElement('helix-base-timeline-item')
export class HelixBaseTimelineItem extends HelixElement {
  /**
   * When it happened, machine-readable.
   *
   * Whatever `<time>` accepts, which is a date, a time, both, a duration or a
   * week. Unset, the label is written as it was given and nothing claims to
   * know what instant it names.
   */
  @property()
  datetime = ''

  /** What kind of event it was, which decides the mark's colour and nothing else. */
  @property({ reflect: true })
  tone?: 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { role: 'listitem' })
  }

  protected override render(): TemplateResult {
    const when = html`<slot name="time"></slot>`
    /* The time is a sibling of the content rather than the first thing inside
       it, so the two are separate rows and the rail can align its mark to the
       second of them. Nested, the mark could only ever be a fixed distance from
       the top of the entry, which is the time's height on a good day and wrong
       the moment a consumer writes two lines of it. */
    return html`<div part="rail">
        <div
          part="connector"
          aria-hidden="true"
        ></div>
        <span part="marker"
          ><slot name="marker"><span part="dot"></span></slot
        ></span>
      </div>
      ${
        this.datetime === ''
          ? html`<span part="time">${when}</span>`
          : html`<time
              part="time"
              datetime=${this.datetime}
              >${when}</time
            >`
      }
      <div part="content"><slot></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-timeline-item': HelixBaseTimelineItem
  }
}
