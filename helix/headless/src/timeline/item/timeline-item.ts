import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { circle, record } from '@fusion.dev/helix-icons'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary One event on a timeline: when it happened, and what it was.
 *
 * @description
 * Given `datetime`, the label you write is wrapped in a `<time>` element, so a
 * machine-readable value such as "2026-08-19" travels with a label such as
 * "yesterday". Without `datetime`, the label is a `<span>`.
 *
 * Each entry draws the connector line that arrives at it and hides it when it
 * is the first entry, using `:host(:first-child)`. This needs no index, no
 * counting parent, and no script. `Steps` and `Breadcrumbs` work the same way.
 *
 * `tone` sets the kind of event and is the only thing that colors the mark. It
 * uses the same values as `Announcement`.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Activity item, History entry, Event
 * @documentation https://fusion.dev/helix/components/timeline
 *
 * @slot - What happened.
 * @slot marker - The mark on the line. Defaults to a dot, which is the slot's fallback
 * content.
 * @slot time - When it happened, written the way you want it shown.
 *
 * @csspart content - What happened, and the time above it.
 * @csspart dot - The dot drawn when no marker is slotted.
 * @csspart marker - The mark on the line.
 * @csspart rail - The column that holds the mark and the line. Draw the two halves of the
 * line with `::part(rail)::before` and `::part(rail)::after` in your stylesheet. This
 * tier ships no CSS and renders no extra box for the line.
 * @csspart time - When it happened.
 */
@customElement('helix-headless-timeline-item')
export class HelixHeadlessTimelineItem extends HelixElement {
  /**
   * When it happened, in machine-readable form. Setting it wraps the time in a
   * `<time>` element.
   *
   * Whatever `<time>` accepts, which is a date, a time, both, a duration or a
   * week. Unset, the label is written as it was given and nothing claims to
   * know what instant it names.
   */
  @property()
  datetime = ''

  /**
   * The kind of event. It sets the color of the mark and nothing else.
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
