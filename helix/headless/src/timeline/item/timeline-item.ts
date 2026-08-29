import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { circle, record } from '@fusion.dev/helix-icons'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

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
 * `tone` says what kind of event it was, and it is the only thing that colors
 * the mark. It takes `Announcement`'s vocabulary rather than a second one.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Activity item, History entry, Event
 * @documentation https://helix.fusion.dev/components/timeline
 *
 * @slot - What happened.
 * @slot marker - The mark on the line. Falls back to a dot, which is the slot's
 * own fallback content: whether a consumer slotted a mark is a question only the
 * platform can answer, and it answers it at assignment time.
 * @slot time - When it happened, as a reader should see it written.
 *
 * @csspart connector - The line arriving at this entry.
 * @csspart content - What happened, and the time above it.
 * @csspart dot - The mark drawn where nothing was slotted for one.
 * @csspart marker - The mark on the line.
 * @csspart rail - The column holding the mark and the line.
 * @csspart time - When it happened.
 */
@customElement('helix-headless-timeline-item')
export class HelixHeadlessTimelineItem extends HelixElement {
  /**
   * When it happened, machine-readable.
   *
   * Whatever `<time>` accepts, which is a date, a time, both, a duration or a
   * week. Unset, the label is written as it was given and nothing claims to
   * know what instant it names.
   */
  @property()
  datetime = ''

  /**
   * What kind of event it was, which decides the mark's color and nothing else.
   */
  @property({ reflect: true })
  tone?: 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { role: 'listitem' })
  }

  /**
   * The mark for an entry that slotted none, which the tone decides.
   *
   * **A seam is a `protected render…()` and never a getter.** A slot's fallback
   * answers a consumer and a seam answers the tier above, and a getter answers
   * neither. The check tests for parentheses, `${this.x}` being permitted
   * because a property is not markup a tier would redraw, so a getter returning
   * a template reads as a bare reference and is let through.
   *
   * Toned entries are reporting something, so they take the circle with a
   * center, which is `Steps` drawing the stage a reader is standing on. Untoned
   * ones are just things that happened and take the open circle, which is
   * `Steps` drawing a stage nobody has reached. The same two glyphs in both
   * components rather than two that resemble each other: a shape drawn twice
   * drifts, and these are already the marks a reader has learned one page over.
   */
  protected renderMarker(): TemplateResult {
    const icon = this.tone === undefined ? circle : record
    return html`<span part="marker"
      ><slot name="marker"
        ><svg part="dot" fill="currentColor" viewBox=${icon.viewBox} aria-hidden="true">
          ${unsafeSVG(icon.content)}
        </svg></slot
      ></span
    >`
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
        ${this.renderMarker()}
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
    'helix-headless-timeline-item': HelixHeadlessTimelineItem
  }
}
