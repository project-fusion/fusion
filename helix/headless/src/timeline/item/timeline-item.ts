import {
  customElement,
  HelixElement,
  hostAria,
  internalsOf,
  type Relative,
  RelativeClockController,
  relativeTime,
  words,
  wordsConverter,
  wordsLocale,
} from '@fusion.dev/helix-core'
import { circle, record } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/** The kinds of event a timeline entry can be, which `tone` takes. */
type TimelineTone = 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

/**
 * @summary One event on a timeline: when it happened, and what it was.
 *
 * @description
 * Given `datetime`, the label you write is wrapped in a `<time>` element, so a
 * machine-readable value such as "2026-08-19" travels with a label such as
 * "yesterday". Without `datetime`, the label is a `<span>`.
 *
 * **`relative` writes the time for you** as how long ago it was, such as "3
 * hours ago", from `datetime`, where the `time` slot is empty. The words move
 * on as they go stale, "3 hours ago" becoming "4 hours ago", with one wakeup
 * shared by every reading on the page, as `FormatDate` keeps its own. They are
 * in the language of the page, or of the nearest `lang`. The whole date and
 * time is the reading's `title`, so a pointer resting on "3 hours ago" shows
 * when it was, and a screen reader reads it as the description.
 *
 * Each entry draws the connector line that arrives at it and hides it when it
 * is the first entry, using `:host(:first-child)`. This needs no index, no
 * counting parent, and no script. `Steps` and `Breadcrumbs` work the same way.
 *
 * `tone` sets the kind of event and is the only thing that colors the mark. It
 * uses the same values as `Announcement`. **A screen reader hears the tone as
 * a word**, from `tone-labels`: the mark is an image named "Error",
 * "Information", "Success" or "Warning", so the color is not the only place
 * the meaning is. `neutral` and `primary` say nothing unless you name them.
 *
 * **`pending` marks an event that has not happened yet**, such as one that is
 * scheduled. The mark is the open circle, and a screen reader hears
 * `pending-label`, "Scheduled", with the tone's word.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Activity item, History entry, Event
 * @documentation https://fusion.dev/helix/components/timeline
 *
 * @slot - What happened.
 * @slot marker - The mark on the line. Defaults to a dot, which is the slot's fallback
 * content. A mark you slot is read as the tone's word, where the entry has one.
 * @slot time - When it happened, written the way you want it shown.
 *
 * @csspart content - What happened, and the time above it.
 * @csspart dot - The dot drawn when no marker is slotted.
 * @csspart marker - The mark on the line. An image named by the tone's word, and by `pending-label`, where either applies.
 * @csspart rail - The column that holds the mark and the line. Draw the two halves of the
 * line with `::part(rail)::before` and `::part(rail)::after` in your stylesheet. This
 * tier ships no CSS and renders no extra box for the line.
 * @csspart time - When it happened.
 */
@customElement('helix-headless-timeline-item')
export class HelixHeadlessTimelineItem extends HelixElement {
  /**
   * The key this part's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-timeline-item': { toneLabels: { danger: 'Fehler' } } })`.
   */
  static words = 'helix-timeline-item'

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
   * Marks an event that has not happened yet, such as one that is scheduled.
   * The mark is the open circle, and a screen reader hears `pending-label`.
   */
  @property({ reflect: true, type: Boolean })
  pending = false

  /** The time the reading is drawn against, moved on when the words go stale. */
  private readonly clock = new RelativeClockController(this, {
    expires: (now) => {
      const moment = this.moment
      return moment ? this.readingAt(moment, now).next : undefined
    },
  })

  /**
   * What the `time` slot shows where nothing is slotted: the reading under
   * `relative`, read against the clock before each render, and nothing
   * otherwise.
   */
  private reading = ''

  /** The whole date and time `datetime` names, the reading's title under `relative`. */
  private whole = ''

  /** The instant `datetime` names, where `relative` asks for a reading of it. */
  private get moment(): Date | undefined {
    if (this.relative === undefined || this.datetime === '') {
      return undefined
    }
    const parsed = new Date(this.datetime)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }

  /** What the reading says at `now`, and when it stops being true. */
  private readingAt(moment: Date, now: Date): Relative {
    return relativeTime(wordsLocale(this), { style: this.relative || 'long' })(moment, now)
  }

  /** What a screen reader hears for an entry that is `pending`. */
  @words
  @property({ attribute: 'pending-label' })
  pendingLabel = 'Scheduled'

  /**
   * Writes the time as how long ago it was, or how long until it, from
   * `datetime`, where the `time` slot is empty: `long` ("3 hours ago"),
   * `short` ("3 hr. ago") or `narrow` ("3h ago"). Set with no value, it is
   * `long`. The words move on as they go stale.
   */
  @property()
  relative?: 'long' | 'narrow' | 'short'

  /**
   * The kind of event. It sets the color of the mark, and a screen reader
   * hears it as the word `tone-labels` gives it.
   */
  @property({ reflect: true })
  tone?: 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning'

  /**
   * What a screen reader is told this entry's tone is, such as "Failed".
   * Absent is the tone's word in `tone-labels`.
   */
  @property({ attribute: 'tone-label' })
  toneLabel = ''

  /**
   * What a screen reader is told each tone is, by the tone's name, written as
   * JSON in the attribute: `tone-labels='{"danger":"Failed"}'`. A tone with no
   * word is not read, which is `neutral` and `primary` in English.
   */
  @words
  @property({ attribute: 'tone-labels', converter: wordsConverter })
  toneLabels: Partial<Record<TimelineTone, string>> = {
    danger: 'Error',
    info: 'Information',
    success: 'Success',
    warning: 'Warning',
  }

  /** What the mark says: the tone's word and the pending word, where either applies. */
  private get markName(): string {
    const tone = this.tone === undefined ? '' : this.toneLabel || (this.toneLabels[this.tone] ?? '')
    return [tone, this.pending ? this.pendingLabel : ''].filter((word) => word !== '').join(', ')
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (['datetime', 'relative'].some((key) => changed.has(key))) {
      this.clock.tick()
    }
    const moment = this.moment
    this.reading = moment ? this.readingAt(moment, new Date(this.clock.now)).text : ''
    /* A date alone is midnight UTC to `Date`, so it is written in UTC, or
       west of Greenwich it would be the day before. */
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(this.datetime)
    this.whole = moment
      ? new Intl.DateTimeFormat(wordsLocale(this), {
          dateStyle: 'long',
          ...(dateOnly ? { timeZone: 'UTC' } : { timeStyle: 'short' }),
        }).format(moment)
      : ''
    hostAria(internalsOf(this), { role: 'listitem' })
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
   * `Steps` drawing a stage nobody has reached, and so does a `pending`
   * entry, which nobody has reached yet either. The same two glyphs in both
   * components rather than two that resemble each other: a shape drawn twice
   * drifts, and these are already the marks a reader has learned one page over.
   */
  protected renderMarker(): TemplateResult {
    const icon = this.tone === undefined || this.pending ? circle : record
    /* **An image named by the meaning**, so the color is not the only place
       the tone is. On the mark's box rather than the glyph, so a mark a page
       slots is read the same way, and none where there is nothing to say. */
    const name = this.markName
    return html`<span
      part="marker"
      role=${name === '' ? nothing : 'img'}
      aria-label=${name === '' ? nothing : name}
      ><slot name="marker"
        ><svg part="dot" fill="currentColor" viewBox=${icon.viewBox} aria-hidden="true">
          ${unsafeSVG(icon.content)}
        </svg></slot
      ></span
    >`
  }

  protected override render(): TemplateResult {
    const when = html`<slot name="time">${this.reading}</slot>`
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
              title=${this.whole || nothing}
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
