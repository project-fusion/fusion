import { customElement, elapsedTime, HelixElement, subscribe } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

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
 * @summary A timestamp, written the way the reader's locale writes one.
 *
 * @description
 * A date in a page is almost never wanted as an ISO string, and formatting one
 * in the consumer's own code means every consumer ships a copy of the same
 * `Intl` call and a different set of options. This is that call, as an element,
 * so a date is written where it is shown.
 *
 * **`elapsed` is the mode a feed wants, and it stops being relative on
 * purpose.** "42m", "3h", "1d" is what a row of activity reads as, and past a
 * week the compact form is a lie: `Intl.NumberFormat` narrow renders both
 * `minute` and `month` as `m` in en-US, so "3m" is three minutes at the top of a
 * feed and three months further down it. Past six days this shows a date, which
 * is shorter to read and impossible to misread. `elapsedTime` in `helix/core`
 * carries the measurement.
 *
 * **The reading refreshes itself, from one timer the page shares.** A relative
 * timestamp is correct for as long as its unit lasts and wrong afterwards, and a
 * page left open is exactly where that shows. Each element asks to be woken when
 * its own reading expires rather than polling, and an element showing a date
 * asks for nothing at all: fifty rows and fifty intervals is fifty wakeups a
 * second where one will do, and a feed of last month's notifications should cost
 * nothing to leave open.
 *
 * **`<time datetime>` whatever the text says**, so a screen reader, a copy and
 * paste, and anything parsing the page all get the real instant rather than
 * "yesterday".
 *
 * @since 0.1.0
 * @status experimental
 * @category typography
 * @aliases RelativeTime, Timestamp, TimeAgo
 * @documentation https://helix.fusion.dev/components/format-date
 *
 * @csspart time - The `<time>` element carrying the reading.
 */
@customElement('helix-headless-format-date')
export class HelixHeadlessFormatDate extends HelixElement {
  /**
   * The timestamp, as anything `Date` parses.
   *
   * An ISO string is what an API sends and what `<time datetime>` takes, so it
   * is the shape that needs no translation at either end. Left unset this
   * renders nothing rather than the epoch, which is what parsing an empty string
   * would give.
   *
   * **The element's own text is read as a fallback, and only in a browser.**
   * `<helix-format-date elapsed>2026-08-27T01:00:00Z</helix-format-date>` is the
   * spelling that reads best in markup, and it cannot be the only one: measured
   * against Lit's server shim, `textContent`, `children`, `firstChild` and
   * `querySelector` are all `undefined` there, so a server has no way to see it.
   * An element rendered on a server needs the attribute; one rendered in a
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
   * Show how long ago it was, compactly, instead of the date.
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
   * Locale for the reading.
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
   * Whether to name the time zone, and how.
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
    if (this.timeZone) {
      asked.timeZone = this.timeZone
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
    this.read()
    this.watch()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
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
    if (!Number.isFinite(next)) {
      return
    }
    this.stopTicking = subscribe(next, () => this.tick())
  }

  protected override render(): TemplateResult | typeof nothing {
    const moment = this.moment
    if (!moment) {
      return nothing
    }
    const text = this.elapsed
      ? elapsedTime(this.locale)(moment, new Date(this.clock ?? Date.now())).text
      : new Intl.DateTimeFormat(this.locale || undefined, this.options).format(moment)
    return html`<time part="time" datetime=${moment.toISOString()}>${text}</time>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-format-date': HelixHeadlessFormatDate
  }
}
