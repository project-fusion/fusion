import {
  customElement,
  elapsedTime,
  HelixElement,
  type Relative,
  RelativeClockController,
  relativeTime,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
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
 * @csspart time - The `<time>` element that holds the formatted text.
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
   * Empty is the runtime's own.
   */
  @property()
  locale = ''

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
      return moment && this.reading ? this.readingAt(moment, now).next : undefined
    },
  })

  /**
   * The date read out of the light DOM, where no attribute carried one.
   */
  @state()
  private written = ''

  private watching: MutationObserver | undefined = undefined

  /** Whether the timestamp is a day with no time, which is formatted in UTC. */
  private get dateOnly(): boolean {
    return DATE_ONLY.test((this.date || this.written).trim())
  }

  /** The timestamp, or nothing where there is not one to read. */
  private get moment(): Date | undefined {
    const source = this.date || this.written
    if (source === '') {
      return undefined
    }
    const parsed = new Date(source)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }

  /** Every `Intl.DateTimeFormat` option a consumer set, and none they did not. */
  private get options(): Intl.DateTimeFormatOptions {
    return formatOptions({
      dateOnly: this.dateOnly,
      dateStyle: this.dateStyle,
      day: this.day,
      era: this.era,
      hour: this.hour,
      hourCycle: this.hourCycle,
      minute: this.minute,
      month: this.month,
      second: this.second,
      timeStyle: this.timeStyle,
      timeZone: this.timeZone,
      timeZoneName: this.timeZoneName,
      weekday: this.weekday,
      year: this.year,
    })
  }

  /** Whether the reading is how long ago rather than the date. */
  private get reading(): boolean {
    return this.elapsed || this.relative !== undefined
  }

  /** What the reading says now, and when it stops being true. */
  private readingAt(moment: Date, now: Date): Relative {
    return this.elapsed
      ? elapsedTime(this.locale)(moment, now)
      : relativeTime(this.locale, {
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
    this.watching = undefined
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
      changed.has('date') ||
      changed.has('elapsed') ||
      changed.has('locale') ||
      changed.has('numeric') ||
      changed.has('relative')
    ) {
      this.clock.tick()
    }
  }

  /** The light DOM's own text, which is the other way to write the value. */
  private read(): void {
    if (this.date !== '') {
      return
    }
    const written = this.textContent?.trim() ?? ''
    if (written !== this.written) {
      this.written = written
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
    const datetime = this.dateOnly ? (this.date || this.written).trim() : moment.toISOString()
    if (!this.reading) {
      const text = new Intl.DateTimeFormat(this.locale || undefined, this.options).format(moment)
      return html`<time part="time" datetime=${datetime}>${text}</time>`
    }
    /* The compact reading is what a feed shows, and "3h" is what a screen
       reader read for it, with the instant in `datetime` exposed to nobody. So
       the reading is named in full, "3 hours ago", and the whole date is its
       title. `time` is a role that takes a name. */
    const now = new Date(this.clock.now)
    const zone = this.timeZone || (this.dateOnly ? 'UTC' : undefined)
    const whole = new Intl.DateTimeFormat(this.locale || undefined, {
      dateStyle: 'long',
      ...(this.dateOnly ? {} : { timeStyle: 'short' }),
      ...(this.hourCycle ? { hourCycle: this.hourCycle } : {}),
      ...(zone ? { timeZone: zone } : {}),
    }).format(moment)
    /* Named in full whatever is shown, so "3h ago" at `narrow` is heard as
       "3 hours ago", with the same choice of word or number. */
    const spoken = relativeTime(this.locale, { numeric: this.numeric ?? 'auto' })(moment, now).text
    return html`<time
      part="time"
      datetime=${datetime}
      aria-label=${spoken}
      title=${whole}
    >${this.readingAt(moment, now).text}</time>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-format-date': HelixHeadlessFormatDate
  }
}
