import {
  customElement,
  elapsedTime,
  HelixElement,
  localeOf,
  type Relative,
  RelativeClockController,
  relativeTime,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { drawFields } from '../fields.js'
import { formatOptions } from '../options.js'

/** A date with no time of day, `YYYY-MM-DD`, which names a day rather than an instant. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * @summary A timestamp, formatted for the user's locale.
 *
 * @description
 * Formats a date with `Intl` where it is shown, so you do not write the same
 * `Intl` call and options in your own code.
 *
 * **`elapsed` shows compact relative time for a feed**, such as "42m", "3h", or
 * "1d". After six days it shows a date. In en-US, `Intl.NumberFormat` narrow
 * renders both `minute` and `month` as `m`, so a compact "3m" could mean three
 * minutes or three months. `elapsedTime` in `helix/core` does the measurement.
 *
 * **`relative` shows the same reading in words**, such as "3 hours ago" at
 * `long`, "3 hr. ago" at `short` and "3h ago" at `narrow`, the styles
 * `sl-relative-time` offers. `numeric="always"` says "1 day ago" where the
 * default says "yesterday".
 *
 * **`date-style` and `time-style` take each locale's own pattern**, such as
 * "Tuesday, August 4, 2026" at `full`, and stand in for the separate fields,
 * which `Intl` refuses beside them. `hour-cycle` sets a twelve or twenty-four
 * hour clock either way.
 *
 * **The text refreshes on one timer shared by the page.** Each element
 * schedules an update for when its current reading expires, and an element
 * showing a date schedules none, so a long feed left open costs almost nothing.
 * `frozen` draws the reading once and leaves it.
 *
 * **`fields` draws each field of a date as a part of its own**, such as
 * `day`, `month` and `year`, so a stylesheet can set the year in a lighter ink
 * or the weekday in capitals with `::part()`. The text between the fields is
 * the locale's own and has no part. An `elapsed` or `relative` reading is one
 * phrase, with no parts inside it.
 *
 * **The output is always `<time datetime>`**, so copy and paste and scripts
 * parsing the page get the exact instant, whatever the visible text says. A
 * screen reader reads the text, so an `elapsed` reading is named in full, such
 * as "3 hours ago", and carries the whole date as its title.
 *
 * **A date with no time, such as `2026-08-04`, is that day everywhere.** It is
 * formatted in UTC unless `time-zone` says otherwise, as Date Input and Date
 * Picker format their dates, so a reader west of UTC sees August 4 and not
 * August 3.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases RelativeTime, Timestamp, TimeAgo
 * @documentation https://fusion.dev/helix/components/format-date
 *
 * @csspart day - The day of the month, with `fields`.
 * @csspart day-period - AM or PM, or the locale's word for the part of the day, with `fields`.
 * @csspart era - The era, such as AD, with `fields` and `era`.
 * @csspart hour - The hour, with `fields`.
 * @csspart minute - The minute, with `fields`.
 * @csspart month - The month, with `fields`.
 * @csspart second - The second, with `fields`.
 * @csspart time - The `<time>` element that holds the formatted text.
 * @csspart time-zone-name - The time zone's name, with `fields`, where `time-zone-name` or a `long` or `full` `time-style` shows it.
 * @csspart weekday - The day of the week, with `fields`.
 * @csspart year - The year, with `fields`.
 *
 * @cssstate future - An `elapsed` or `relative` reading of a moment still to come, such as "in 3 hours".
 * @cssstate past - An `elapsed` or `relative` reading of a moment gone, such as "3 hours ago".
 */
@customElement('helix-headless-format-date')
export class HelixHeadlessFormatDate extends HelixElement {
  /**
   * The timestamp, in any format `Date` can parse.
   *
   * An ISO string is what an API sends and what `<time datetime>` takes, so it
   * is the shape that needs no translation at either end. Left unset this
   * renders nothing rather than the epoch, which is what parsing an empty string
   * would give.
   *
   * **The element's own text is read as a fallback, and only in a browser.**
   * `<helix-headless-format-date
   * elapsed>2026-08-27T01:00:00Z</helix-headless-format-date>` is the spelling
   * that reads best in markup, and it cannot be the only one: measured against
   * Lit's server shim, `textContent`, `children`, `firstChild` and
   * `querySelector` are all `undefined` there, so a server has no way to see
   * it. An element rendered on a server needs the attribute; one rendered in a
   * browser may use either.
   */
  @property()
  date = ''

  /**
   * The locale's own pattern for the date: `full`, `long`, `medium`, or
   * `short`. Set, it stands in for `weekday`, `day`, `month`, `year` and `era`.
   */
  @property({ attribute: 'date-style' })
  dateStyle?: 'full' | 'long' | 'medium' | 'short'

  /**
   * How the day of the month is written, where a date is shown.
   */
  @property()
  day?: 'numeric' | '2-digit'

  /**
   * Shows how long ago the timestamp was, in a compact form such as "3h", in
   * place of the date.
   *
   * Reflected, because it is the one property that decides which of two readings
   * this is and a stylesheet has a reason to know: a compact reading is a fixed
   * few characters and a date is not.
   */
  @property({ reflect: true, type: Boolean })
  elapsed = false

  /**
   * How the era is written, such as AD, where a date is shown.
   */
  @property()
  era?: 'long' | 'narrow' | 'short'

  /**
   * Draws each field of a date in a part of its own: `weekday`, `day`,
   * `month`, `year`, `era`, `hour`, `minute`, `second`, `day-period` and
   * `time-zone-name`, so `::part(year)` can set the year apart.
   *
   * Off by default, which draws the date as one run of text, as Shoelace and
   * Web Awesome do. An `elapsed` or `relative` reading is one phrase either
   * way.
   */
  @property({ type: Boolean })
  fields?: boolean

  /**
   * Draws an `elapsed` or `relative` reading once and leaves it, where it
   * would otherwise move on as it goes stale.
   *
   * For a reading that describes a moment the page itself is about, such as
   * "3 hours ago" in a report generated then, or a list a reader compares
   * line by line while it should not change under them. The reading is taken
   * when the element draws, and again whenever `date` or another option
   * changes. Turned off, the reading catches up and moves on again.
   * `sl-relative-time` and `wa-relative-time` keep still unless `sync` is
   * set; this keeps moving unless `frozen` is.
   */
  @property({ type: Boolean })
  frozen = false

  /**
   * How the hour is written, where a time of day is shown.
   */
  @property()
  hour?: 'numeric' | '2-digit'

  /**
   * The clock a time of day is written on: `h12` or `h11` for twelve hours,
   * `h23` or `h24` for twenty-four.
   *
   * Absent is the locale's own, which is right unless your product shows every
   * reader the same clock whatever their language.
   */
  @property({ attribute: 'hour-cycle' })
  hourCycle?: 'h11' | 'h12' | 'h23' | 'h24'

  /**
   * The locale to format the timestamp in.
   *
   * Absent is the page's: the `lang` of the nearest element with one, as
   * Shoelace and Web Awesome read it, then the runtime's own.
   */
  @property()
  locale = ''

  /** The locale the words are written in: `locale`, or the page's `lang`. */
  private get language(): string {
    return localeOf(this, this.locale)
  }

  /**
   * How the minute is written, where a time of day is shown.
   */
  @property()
  minute?: 'numeric' | '2-digit'

  /**
   * How the month is written, where a date is shown.
   */
  @property()
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow'

  /**
   * Whether a `relative` reading may use a word for a number: `auto` says
   * "yesterday" and "now", and `always` says "1 day ago" and "in 0 seconds".
   */
  @property()
  numeric?: 'always' | 'auto'

  /**
   * Shows how long ago the timestamp was, or how long until it, in words, in
   * place of the date: `long` ("3 hours ago"), `short` ("3 hr. ago") or
   * `narrow` ("3h ago").
   *
   * The reading refreshes as it goes stale, as `elapsed` does, and the whole
   * date is its title. `elapsed` wins where both are set.
   */
  @property()
  relative?: 'long' | 'narrow' | 'short'

  /**
   * How the second is written, where a time of day is shown.
   */
  @property()
  second?: 'numeric' | '2-digit'

  /**
   * The locale's own pattern for the time of day: `full`, `long`, `medium`, or
   * `short`. Set, it stands in for `hour`, `minute`, `second` and
   * `time-zone-name`.
   */
  @property({ attribute: 'time-style' })
  timeStyle?: 'full' | 'long' | 'medium' | 'short'

  /**
   * The time zone to read the timestamp in.
   *
   * Empty is the runtime's own.
   */
  @property({ attribute: 'time-zone' })
  timeZone?: string

  /**
   * Shows the name of the time zone, in its `long` or `short` form.
   */
  @property({ attribute: 'time-zone-name' })
  timeZoneName?: 'long' | 'short'

  /**
   * How the weekday is written, where one is shown.
   */
  @property()
  weekday?: 'long' | 'short' | 'narrow'

  /**
   * How the year is written, where a date is shown.
   */
  @property()
  year?: 'numeric' | '2-digit'

  /**
   * The clock this element last drew against, moved on when the reading goes
   * stale.
   *
   * A controller's time and not a read of `Date.now()` inside `render`, which
   * would make the template a function of something Lit cannot see change: the
   * element would draw the right text once and never notice it had gone stale.
   * The formatter says when its own answer expires, so the clock wakes at
   * exactly that moment rather than polling: an item minutes old once a minute,
   * an item hours old once an hour, and an item showing a date never.
   */
  private readonly clock = new RelativeClockController(this, {
    expires: (now) => {
      const moment = this.moment
      if (!moment || !this.reading) {
        return undefined
      }
      /* Drawn against now, and never woken: the clock schedules nothing for
         a reading that does not expire. */
      return this.frozen ? Infinity : this.readingAt(moment, now).next
    },
  })

  /**
   * The date read out of the light DOM, where no attribute carried one.
   *
   * Not a reactive state: `read` asks for the update itself, which keeps the
   * `state` decorator out of this element's bundle.
   */
  private written = ''

  private watching?: MutationObserver

  /** Whether the timestamp is a day with no time, which is formatted in UTC. */
  private get dateOnly(): boolean {
    return DATE_ONLY.test(this.source)
  }

  /** The timestamp, or nothing where there is not one to read. */
  private get moment(): Date | undefined {
    const source = this.source
    if (source === '') {
      return undefined
    }
    const parsed = new Date(source)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }

  /** The timestamp as written, in the attribute or in the light DOM. */
  private get source(): string {
    return (this.date || this.written).trim()
  }

  /** Whether the reading is how long ago rather than the date. */
  private get reading(): boolean {
    return this.elapsed || this.relative !== undefined
  }

  /** What the reading says now, and when it stops being true. */
  private readingAt(moment: Date, now: Date): Relative {
    return this.elapsed
      ? elapsedTime(this.language)(moment, now)
      : relativeTime(this.language, {
          numeric: this.numeric ?? 'auto',
          style: this.relative ?? 'long',
        })(moment, now)
  }

  override connectedCallback(): void {
    super.connectedCallback()
    /* Rebuilt on every connection rather than built once, because
       `disconnectedCallback` takes it down and a framework moves nodes for
       ordinary reasons: built in `firstUpdated` alone this comes back
       permanently dead the first time a list is reordered. Guarded on
       `hasUpdated` because the first connection happens before there is anything
       to watch. */
    if (this.hasUpdated) {
      this.watch()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    /* It outlives the element otherwise, and a page that mounts and unmounts a
       feed leaks one every time it opens. The clock stops itself. */
    this.watching?.disconnect()
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
    this.watch()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* The written text before the render, so the first one shows the date it
       names: read after it, the first render drew nothing and a second had to
       follow, and on a page a server rendered the value was never written. Not
       on a server or while hydrating what one sent, which could not read it. */
    if (this.childrenKnown) {
      this.read()
    }
    if (
      ['date', 'elapsed', 'frozen', 'locale', 'numeric', 'relative'].some((key) => changed.has(key))
    ) {
      this.clock.tick()
    }
    /* Which side of now a reading is on, so a page can mark what is overdue
       or still to come from CSS. Read against the clock the text is drawn
       against, so the two cannot disagree. */
    const ahead = this.reading ? (this.moment?.getTime() ?? NaN) - this.clock.now : NaN
    this.toggleState('past', ahead <= 0)
    this.toggleState('future', ahead > 0)
  }

  /** The light DOM's own text, which is the other way to write the value. */
  private read(): void {
    if (this.date !== '') {
      return
    }
    const written = this.textContent?.trim() ?? ''
    if (written !== this.written) {
      this.written = written
      this.requestUpdate()
      this.clock.tick()
    }
  }

  private watch(): void {
    this.watching?.disconnect()
    this.watching = new MutationObserver(() => this.read())
    this.watching.observe(this, { characterData: true, childList: true, subtree: true })
  }

  protected override render(): TemplateResult | typeof nothing {
    const moment = this.moment
    if (!moment) {
      return nothing
    }
    const datetime = this.dateOnly ? this.source : moment.toISOString()
    if (!this.reading) {
      /* Every `Intl` option a consumer set, and none they did not. One text
         node unless `fields` asks for a part to each field: in Chromium a
         date split into nodes is set a fraction of a pixel wider, so the
         split is not made where nobody styles the parts. */
      const format = new Intl.DateTimeFormat(
        this.language || undefined,
        formatOptions(this, this.dateOnly),
      )
      return html`<time part="time" datetime=${datetime}>${this.fields ? drawFields(format.formatToParts(moment)) : format.format(moment)}</time>`
    }
    /* The compact reading is what a feed shows, and "3h" is what a screen
       reader read for it, with the instant in `datetime` exposed to nobody. So
       the reading is named in full, "3 hours ago", and the whole date is its
       title. `time` is a role that takes a name. */
    const now = new Date(this.clock.now)
    /* The whole date in the locale's long pattern, through the same options
       as a date reading, so its clock and its zone are the reading's. */
    const whole = new Intl.DateTimeFormat(
      this.language || undefined,
      formatOptions(
        {
          dateStyle: 'long',
          hourCycle: this.hourCycle,
          timeStyle: this.dateOnly ? undefined : 'short',
          timeZone: this.timeZone,
        },
        this.dateOnly,
      ),
    ).format(moment)
    /* Named in full whatever is shown, so "3h ago" at `narrow` is heard as
       "3 hours ago", with the same choice of word or number. */
    const spoken = relativeTime(this.language, { numeric: this.numeric ?? 'auto' })(
      moment,
      now,
    ).text
    return html`<time part="time" datetime=${datetime} aria-label=${spoken} title=${whole}>${this.readingAt(moment, now).text}</time>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-format-date': HelixHeadlessFormatDate
  }
}
