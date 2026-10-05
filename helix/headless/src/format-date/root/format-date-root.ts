import {
  customElement,
  elapsedTime,
  HelixElement,
  relativeTime,
  subscribe,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/** A date with no time of day, `YYYY-MM-DD`, which names a day rather than an instant. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** The `Intl.DateTimeFormat` options this element carries, in its own spelling. */
interface Absolute {
  day?: 'numeric' | '2-digit'
  hour?: 'numeric' | '2-digit'
  minute?: 'numeric' | '2-digit'
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow'
  second?: 'numeric' | '2-digit'
  timeZone?: string
  timeZoneName?: 'long' | 'short'
  weekday?: 'long' | 'short' | 'narrow'
  year?: 'numeric' | '2-digit'
}

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
   * How the hour is written, where a time of day is shown.
   */
  @property()
  hour?: 'numeric' | '2-digit'

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
   * How the second is written, where a time of day is shown.
   */
  @property()
  second?: 'numeric' | '2-digit'

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
   * The clock this element last drew against.
   *
   * A state field and not a read of `Date.now()` inside `render`, which would
   * make the template a function of something Lit cannot see change: the element
   * would draw the right text once and never notice it had gone stale.
   */
  @state()
  private clock: number | undefined = undefined

  /**
   * The date read out of the light DOM, where no attribute carried one.
   */
  @state()
  private written = ''

  private stopTicking: (() => void) | undefined = undefined

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
  private get options(): Absolute {
    const asked: Absolute = {}
    if (this.day) {
      asked.day = this.day
    }
    if (this.hour) {
      asked.hour = this.hour
    }
    if (this.minute) {
      asked.minute = this.minute
    }
    if (this.month) {
      asked.month = this.month
    }
    if (this.second) {
      asked.second = this.second
    }
    /* A day with no time is midnight UTC once parsed, and read in a zone west
       of it that is the day before. Measured before this: `2026-08-04` read
       "August 3, 2026" in Los Angeles. */
    if (this.timeZone) {
      asked.timeZone = this.timeZone
    } else if (this.dateOnly) {
      asked.timeZone = 'UTC'
    }
    if (this.timeZoneName) {
      asked.timeZoneName = this.timeZoneName
    }
    if (this.weekday) {
      asked.weekday = this.weekday
    }
    if (this.year) {
      asked.year = this.year
    }
    return asked
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.tick()
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
    /* Both outlive the element otherwise, and a page that mounts and unmounts a
       feed leaks one of each every time it opens. */
    this.stopTicking?.()
    this.stopTicking = undefined
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
    if (changed.has('date') || changed.has('elapsed') || changed.has('locale')) {
      this.tick()
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
      this.tick()
    }
  }

  private watch(): void {
    this.watching?.disconnect()
    this.watching = new MutationObserver(() => this.read())
    this.watching.observe(this, { characterData: true, childList: true, subtree: true })
  }

  /**
   * Schedules the next reading, and only the next one.
   *
   * The formatter says when its own answer expires, so this asks for exactly
   * that moment rather than polling: an item minutes old wakes once a minute, an
   * item hours old once an hour, and an item showing a date never, which is the
   * difference between a feed that costs nothing to leave open and one that
   * does.
   */
  private tick(): void {
    this.stopTicking?.()
    this.stopTicking = undefined
    const moment = this.moment
    if (!moment || !this.elapsed) {
      return
    }
    const now = new Date()
    this.clock = now.getTime()
    const { next } = elapsedTime(this.locale)(moment, now)
    /* Only on a page. A server runs `willUpdate` and has nobody to update a
       reading for, and a subscription there is a timer up to an hour long that
       holds the element after its markup has been sent: measured, rendering the
       notifications examples left a process that would not exit. */
    if (!Number.isFinite(next) || !this.isConnected) {
      return
    }
    this.stopTicking = subscribe(next, () => this.tick())
  }

  protected override render(): TemplateResult | typeof nothing {
    const moment = this.moment
    if (!moment) {
      return nothing
    }
    const datetime = this.dateOnly ? (this.date || this.written).trim() : moment.toISOString()
    if (!this.elapsed) {
      const text = new Intl.DateTimeFormat(this.locale || undefined, this.options).format(moment)
      return html`<time part="time" datetime=${datetime}>${text}</time>`
    }
    /* The compact reading is what a feed shows, and "3h" is what a screen
       reader read for it, with the instant in `datetime` exposed to nobody. So
       the reading is named in full, "3 hours ago", and the whole date is its
       title. `time` is a role that takes a name. */
    const now = new Date(this.clock ?? Date.now())
    const zone = this.timeZone || (this.dateOnly ? 'UTC' : undefined)
    const whole = new Intl.DateTimeFormat(this.locale || undefined, {
      dateStyle: 'long',
      ...(this.dateOnly ? {} : { timeStyle: 'short' }),
      ...(zone ? { timeZone: zone } : {}),
    }).format(moment)
    return html`<time
      part="time"
      datetime=${datetime}
      aria-label=${relativeTime(this.locale)(moment, now).text}
      title=${whole}
    >${elapsedTime(this.locale)(moment, now).text}</time>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-format-date': HelixHeadlessFormatDate
  }
}
