import {
  customElement,
  type HelixChangeEvent,
  HelixFormElement,
  MixinControllerValue,
} from '@helix-io/core'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
/* Side-effect imports, because this renders these in its own shadow root and a
   custom element registers on import. The public tags rather than the base ones:
   a consumer on the styled tier gets the styled elements, and one on the
   headless tier brings their own under those names. */
import '../../listbox/index.js'
import '../../option/index.js'

/** Whether a string is a time the rest of this component can reason about. */
export const isTime = (value: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

/** Minutes since midnight, or `null` where it is not a time. */
export const toMinutes = (value: string): number | null => {
  if (!isTime(value)) {
    return null
  }
  const [hours = '0', minutes = '0'] = value.split(':')
  return Number(hours) * 60 + Number(minutes)
}

/** Minutes since midnight back to `HH:mm`, which is the value shape throughout. */
export const fromMinutes = (minutes: number): string => {
  const whole = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`
}

/**
 * A time written the way the reader's locale writes one.
 *
 * `Intl` decides between a twelve and a twenty-four hour clock, because that is
 * a property of the locale rather than of this component: `en-US` gets
 * `2:30 PM` and `en-GB` gets `14:30` without either being configured. There is
 * no flag to force one, deliberately. A product that needs to override its
 * reader's own convention has a locale problem rather than a component one, and
 * the value is 24 hour regardless.
 */
export const writeTime = (value: string, locale?: string): string => {
  const minutes = toMinutes(value)
  if (minutes === null) {
    return value
  }
  const at = new Date(Date.UTC(2000, 0, 1, Math.floor(minutes / 60), minutes % 60))
  /* `timeStyle` rather than `hour` and `minute` assembled by hand. Measured in
     Chrome: `hour: 'numeric'` gives `9:00` for `en-GB`, unpadded, which is not
     how a twenty-four hour clock is written, while `hour: '2-digit'` gives
     `09:00 AM` for `en-US`, which is not how a twelve hour one is. `short` is
     each locale's own answer: `09:00` and `9:00 AM`. */
  return new Intl.DateTimeFormat(locale || undefined, {
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(at)
}

/**
 * Whether the reader's locale writes times on a twelve hour clock.
 *
 * Asked of `Intl` rather than derived from a list of locales, because it is
 * exactly the question `resolvedOptions` answers and the list is long and
 * changes. `en-US` is true, `en-GB`, `fr-FR` and `ja-JP` are false, measured.
 */
const isTwelveHour = (locale?: string): boolean =>
  new Intl.DateTimeFormat(locale || undefined, { timeStyle: 'short' }).resolvedOptions().hour12 ===
  true

/**
 * @summary Picks a time, from a list of them.
 *
 * @description
 * **A list rather than three spinners**, and the reason is what a list already
 * is. `helix-listbox` brings the keyboard, the typeahead, the scroll into view
 * and the announcement of a set of options, and a time at a step is a set of
 * options. Three little spinners for hours, minutes and a meridiem are three
 * controls to build, three to test, and a tab stop each for something a reader
 * answers once.
 *
 * **A step is what makes it a list at all.** Fifteen minutes is ninety-six rows,
 * which a reader scrolls or types into; one minute is one thousand four hundred
 * and forty, which is a listbox in name only. So the list is for the times a
 * product actually offers, and arbitrary times are the field's job in Input
 * Time, the same division Input Date draws between typing a date and using the
 * calendar.
 *
 * **The value is `HH:mm` on a twenty-four hour clock, always.** That is what a
 * form submits and what `min` and `max` compare against, and it sorts as a
 * string, which is the whole reason the shape is that one. What each row *says*
 * is the reader's own convention, from `Intl`.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases TimePicker, TimeList
 * @documentation https://helix.fusion.dev/components/time
 *
 * @event {HelixChangeEvent} helix-change - Fired when the time changes.
 *
 * @csspart list - The listbox holding the times, in `list`.
 * @csspart columns - The row of columns, in `spinner`.
 * @csspart column - One of them.
 * @csspart items - The scrolling column inside it, forwarded from the listbox.
 * @csspart empty - What it says when nothing matches, forwarded from the listbox.
 * @csspart option - One time in it. Carries `data-between` inside a range.
 */
@customElement('helix-base-time')
export class HelixBaseTime extends MixinControllerValue(HelixFormElement) {
  /**
   * How far apart the offered times are, in minutes.
   *
   * Fifteen, which is four rows an hour and ninety-six in a day: enough that a
   * reader scrolls rather than hunts, and few enough that the list is a list.
   * Anything under five is a thousand rows and wants a field instead.
   */
  @property({ type: Number })
  step = 15

  /** Earliest time offered, as `HH:mm`. */
  @property()
  min = '00:00'

  /** Latest time offered, as `HH:mm`. */
  @property()
  max = '23:59'

  /** Language tag the times are written in. Absent uses the runtime's own. */
  @property()
  locale = ''

  /** Accessible name for the list, which has no visible one of its own. */
  @property()
  label = 'Time'

  /**
   * How many times can be held at once.
   *
   * Absent is one. `range` holds a start and an end with everything between
   * them shown as part of the answer, `multiple` holds any number, and both are
   * carried as one comma-separated value: the same shape `helix-calendar` uses,
   * because it is the same question asked of a different unit.
   *
   * **A range is two picks, and a third starts over.** That is the calendar's
   * behaviour and a reader who has met one has met both. The alternative, a
   * separate "from" and "to" control, is two answers to what a product asks as
   * one, and it makes the between part impossible to show.
   *
   * **Neither works as a spinner and the appearance falls back.** A range on
   * wheels is two sets of wheels, which is two controls; a multiple is a set,
   * and a wheel has exactly one value by construction. Rather than draw
   * something that cannot say what it holds, `spinner` renders as a list
   * whenever a mode is set.
   */
  @property({ reflect: true })
  mode?: 'multiple' | 'range'

  /**
   * Whether the times are one list or a column each.
   *
   * `list` is the default and offers whole times, which is what a product with
   * opening hours or slots actually has. `spinner` splits them into an hour, a
   * minute and, where the locale uses one, a meridiem: three short columns
   * instead of ninety-six rows, and the only way to reach `23:45` without
   * scrolling most of a day.
   *
   * The trade is that a spinner cannot say which *combinations* are on offer. A
   * list of half hours from nine to five is seventeen rows and every one of them
   * is a time the product has; the same thing as columns is an hour column and a
   * minute column, and nothing in either says the two are only valid together.
   * The bounds are still enforced, so a reader can be refused after the fact,
   * which is worse than not being offered it.
   *
   * So: `list` where the set is the point, `spinner` where any time is allowed
   * and the range is a whole day.
   */
  @property({ reflect: true })
  appearance: 'list' | 'spinner' = 'list'

  /**
   * Every time on offer, as minutes since midnight.
   *
   * Built from `min` upward rather than from midnight, so a list that starts at
   * `09:00` steps from nine rather than offering `09:15` because that is where
   * the quarter hours from midnight happen to land. A step that does not divide
   * the hour is a real thing to want, twenty minutes being the obvious one, and
   * this is the reading that makes it behave.
   */
  private get times(): number[] {
    const from = toMinutes(this.min) ?? 0
    const to = toMinutes(this.max) ?? 1439
    const step = Math.max(1, Math.round(this.step))
    const found: number[] = []
    for (let at = from; at <= to; at += step) {
      found.push(at)
    }
    return found
  }

  /** The times held, which is a list whether or not a mode is set. */
  private get held(): string[] {
    return this.value
      .split(',')
      .map((one) => one.trim())
      .filter(Boolean)
  }

  /**
   * Takes what the list announced and constrains it to what the mode allows.
   *
   * The listbox is put in `multiple` for both modes, because that is what marks
   * more than one row and toggles on press. A range then differs only in what is
   * kept: two, and a third pick starts again from that third one. Working out
   * which is newest by difference rather than by position, since a toggle can
   * remove as easily as add and the announced list is a set rather than a
   * sequence.
   */
  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    const announced = (event as HelixChangeEvent).detail.value
    if (this.mode !== 'range') {
      this.requestValue(announced)
      return
    }
    const next = announced
      .split(',')
      .map((one) => one.trim())
      .filter(Boolean)
    if (next.length <= 2) {
      this.requestValue(next.sort().join(','))
      return
    }
    const before = new Set(this.held)
    const added = next.find((one) => !before.has(one))
    this.requestValue(added ?? '')
  }

  /** Whether a time falls inside a range, which is what gets banded. */
  private between(at: string): boolean {
    if (this.mode !== 'range') {
      return false
    }
    const [from, to] = this.held
    return from !== undefined && to !== undefined && at > from && at < to
  }

  /** The three readings a spinner shows, from the value or from `min`. */
  private get parts(): { hour: number; meridiem: 'AM' | 'PM'; minute: number } {
    const at = toMinutes(this.value) ?? toMinutes(this.min) ?? 0
    const hour = Math.floor(at / 60)
    return { hour, meridiem: hour < 12 ? 'AM' : 'PM', minute: at % 60 }
  }

  /** Puts a changed column back together into a whole time. */
  private readonly moveColumn = (part: 'hour' | 'meridiem' | 'minute', to: string): void => {
    const { hour, meridiem, minute } = this.parts
    let next = hour * 60 + minute
    if (part === 'minute') {
      next = hour * 60 + Number(to)
    } else if (part === 'hour') {
      /* On a twelve hour clock the column says 1 to 12 and the meridiem says
         which half, so the two have to be recombined rather than read straight:
         12 AM is midnight and 12 PM is noon, which is the one pair that does not
         follow the pattern. */
      const shown = Number(to)
      const whole = isTwelveHour(this.locale) ? (shown % 12) + (meridiem === 'PM' ? 12 : 0) : shown
      next = whole * 60 + minute
    } else {
      const half = hour % 12
      next = (half + (to === 'PM' ? 12 : 0)) * 60 + minute
    }
    this.requestValue(fromMinutes(next))
  }

  /** Every whole hour that has at least one offered time in it. */
  private get hours(): number[] {
    const found = new Set(this.times.map((at) => Math.floor(at / 60)))
    return [...found]
  }

  /** Every minute offered within the hour currently shown. */
  private get minutes(): number[] {
    const hour = this.parts.hour
    return this.times.filter((at) => Math.floor(at / 60) === hour).map((at) => at % 60)
  }

  /**
   * Each wheel comes to rest on its own answer.
   *
   * A dial that opens at midnight when it holds ten in the evening is a dial
   * showing the wrong thing, and CSS cannot fix it: `scroll-snap-type` chooses a
   * snap point when something scrolls, and nothing has. Measured before this,
   * with the value at 22:00, the hour wheel sat 288 pixels above its answer.
   *
   * On every update rather than on the first, because the columns re-render as
   * the value moves and the minute column's contents change with the hour.
   *
   * **And it is public, because an update is not the only moment that matters.**
   * Inside a panel this element renders while the panel is still
   * `display: none`, so every box measures zero and there is nothing to centre
   * against: measured, the hour wheel stayed 288 pixels off its answer because
   * the only call happened before anything had a size. Whatever shows the panel
   * calls this again afterwards. The guard below makes the early call harmless
   * rather than wrong, which is why it can be left in.
   */
  reveal(): void {
    if (this.appearance !== 'spinner' || this.mode !== undefined) {
      return
    }
    for (const column of this.renderRoot?.querySelectorAll<HTMLElement & { reveal?: () => void }>(
      '[part="column"]',
    ) ?? []) {
      column.reveal?.()
    }
  }

  protected override updated(changed: import('lit').PropertyValues): void {
    super.updated(changed)
    this.reveal()
  }

  /** Puts the keyboard on the list, which is the only control here. */
  override focus(options?: FocusOptions): void {
    this.renderRoot?.querySelector<HTMLElement>('[part="list"]')?.focus(options)
  }

  /** One column of a spinner, which is a listbox like the whole list is. */
  private renderColumn(
    part: 'hour' | 'meridiem' | 'minute',
    label: string,
    values: string[],
    written: (one: string) => string,
    value: string,
  ): TemplateResult {
    return html`<helix-listbox
      part="column"
      data-column=${part}
      exportparts="items"
      aria-label=${label}
      .value=${value}
      @helix-change=${(event: Event) => {
        event.stopPropagation()
        this.moveColumn(part, (event as HelixChangeEvent).detail.value)
      }}
    >
      ${values.map(
        (one) => html`<helix-option part="option" value=${one}>${written(one)}</helix-option>`,
      )}
    </helix-listbox>`
  }

  private renderSpinner(): TemplateResult {
    const twelve = isTwelveHour(this.locale)
    const { hour, meridiem, minute } = this.parts
    const shownHour = twelve ? String(hour % 12 === 0 ? 12 : hour % 12) : String(hour)
    /* The hour column reads 1 to 12 on a twelve hour clock, so the whole hours
       on offer are mapped into that half and de-duplicated: 13:00 and 01:00 are
       both "1", and offering it twice is offering a choice that is not one. */
    const hours = twelve
      ? [...new Set(this.hours.map((one) => (one % 12 === 0 ? 12 : one % 12)))].sort(
          (a, b) => a - b,
        )
      : this.hours
    return html`<div part="columns">
      ${this.renderColumn(
        'hour',
        'Hour',
        hours.map(String),
        (one) => (twelve ? one : one.padStart(2, '0')),
        shownHour,
      )}
      ${this.renderColumn(
        'minute',
        'Minute',
        this.minutes.map(String),
        (one) => one.padStart(2, '0'),
        String(minute),
      )}
      ${
        twelve
          ? this.renderColumn(
              'meridiem',
              'Before or after noon',
              ['AM', 'PM'],
              (one) => one,
              meridiem,
            )
          : nothing
      }
    </div>`
  }

  protected override render(): TemplateResult {
    /* A mode falls back to the list, for the reason the property records: a
       range on wheels is two sets of wheels and a multiple is a set, which a
       wheel cannot hold. */
    if (this.appearance === 'spinner' && this.mode === undefined) {
      return this.renderSpinner()
    }
    return html`<helix-listbox
      part="list"
      exportparts="items, empty"
      aria-label=${this.label}
      ?multiple=${this.mode !== undefined}
      .value=${this.value}
      @helix-change=${this.handleChange}
    >
      ${this.times.map((minutes) => {
        const at = fromMinutes(minutes)
        return html`<helix-option
          part="option"
          value=${at}
          data-between=${this.between(at) ? '' : nothing}
          >${writeTime(at, this.locale)}</helix-option
        >`
      })}
    </helix-listbox>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-time': HelixBaseTime
  }
}
