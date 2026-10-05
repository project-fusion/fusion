import {
  clockLocale,
  commaList,
  customElement,
  dayPeriod,
  elementById,
  fillTemplate,
  type HelixBeforeChangeEvent,
  HelixFormElement,
  type HourCycle,
  inlineStep,
  isTwelveHour,
  MixinControllerValue,
  nearestTime,
  offeredTimes,
  reportValues,
  secondsAsValue,
  timeBarred,
  timeFault,
  valueAsSeconds,
  wheelParts,
  wholeHour,
  writeClock,
} from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
/* Relative, so this registers the headless elements and the styled file's
   identical imports register the styled ones. `tier` picks which the template
   asks for. */
import '../../listbox/index.js'
import '../../option/index.js'

/**
 * @summary A control for choosing a time from a list or from wheels.
 *
 * @description
 * Shows the times at each `step` as a `Listbox`, which provides the keyboard
 * behavior, typeahead, scrolling into view, and announcements for a set of
 * options. `variant="wheels"` shows a column each for the hour, the minute, and
 * the meridiem, and one for the second with `seconds`. Left and Right move
 * between the wheels, and Tab does too.
 *
 * `hour-cycle` writes every time on a twelve or a twenty-four hour clock
 * whatever the locale, and `seconds` holds times to the second.
 *
 * The step keeps the list usable. At the default of 15 minutes a day is 96
 * rows, which people can scroll or type into. At 1 minute it is 1,440. Use the
 * list for the times your product offers, and Time Input for any time, the same
 * way Date Input separates typing a date from picking one on the calendar.
 *
 * The value is always `HH:mm` on a 24-hour clock, or `HH:mm:ss` with
 * `seconds`. A form submits that shape,
 * `min` and `max` compare against it, and it sorts as a string. Each row's text
 * follows the person's own conventions, from `Intl`.
 *
 * The chosen row is marked in the served markup. The listbox gets the answer as
 * `.value`, and Lit SSR serializes no property binding, so without more the 96
 * served rows would carry no mark until the listbox upgrades and runs `place`.
 * Each option also gets `selected`, an attribute binding that does serialize,
 * and `place` then writes the same answer from the same value. This is the same
 * `selected` you write on `Option` elsewhere in Helix, and Date Picker marks
 * its choice in markup for the same reason. The list and the wheels both do
 * this, because each wheel is also a listbox.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Time, TimeList
 * @documentation https://fusion.dev/helix/components/time-picker
 *
 * @event {Event} change - Fired after the value changes.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before the time changes, and cancelable. Canceling it keeps the current time.
 * @event {Event} input - Fired after the value changes.
 *
 * @csspart column - One column of the wheels.
 * @csspart column-empty - The text shown when the filter hides every option.
 * @csspart column-feedback - The message that says what is wrong with the value.
 * @csspart column-filter-icon - The icon beside the filter field.
 * @csspart column-filter-mark - The default icon beside the filter field, shown when none is slotted.
 * @csspart column-hint - Help under the list.
 * @csspart column-items - The list of options.
 * @csspart column-label - The label above the list.
 * @csspart column-live - A copy of the empty and loading text, in a region that screen readers announce when it changes. Visually hidden in the styled tier.
 * @csspart column-loading - The text shown while the options load.
 * @csspart column-search - The region that holds the filter field.
 * @csspart column-search-field - The filter field.
 * @csspart columns - The row of columns, in `wheels`.
 * @csspart list - The listbox holding the times, in `list`.
 * @csspart list-empty - The text shown when the filter hides every option.
 * @csspart list-feedback - The message that says what is wrong with the value.
 * @csspart list-filter-icon - The icon beside the filter field.
 * @csspart list-filter-mark - The default icon beside the filter field, shown when none is slotted.
 * @csspart list-hint - Help under the list.
 * @csspart list-items - The list of options.
 * @csspart list-label - The label above the list.
 * @csspart list-live - A copy of the empty and loading text, in a region that screen readers announce when it changes. Visually hidden in the styled tier.
 * @csspart list-loading - The text shown while the options load.
 * @csspart list-search - The region that holds the filter field.
 * @csspart list-search-field - The filter field.
 * @csspart option - One time in the list. It carries `data-between` inside a range.
 * @csspart option-between - A time inside a chosen range, excluding its ends, beside `option`.
 * @csspart option-description - The caption under the time's label, when there is one.
 * @csspart option-item - The row.
 * @csspart option-item-active - The row the keyboard is on.
 * @csspart option-item-selected - The row of a chosen time: the one time, or either end of a range.
 * @csspart option-label - The time's label.
 * @csspart option-text - The label and the caption, as one column.
 */
@customElement('helix-headless-time-picker')
export class HelixHeadlessTimePicker extends MixinControllerValue(HelixFormElement) {
  /**
   * The validation message for a value that is not a time.
   *
   * **Every sentence a control raises in the browser's bubble is a property**,
   * named for the validity flag it reports, so a form in another language
   * speaks it. Absent is the control's own sentence, in English.
   */
  @property({ attribute: 'bad-input-message' })
  badInputMessage?: string

  /**
   * Times that cannot be chosen, as `HH:mm`, separated by commas or spaces.
   *
   * The counterpart to Date Picker's `disable-dates`, and it exists for the same
   * shape of problem: `min` and `max` take away a span, and what a booking
   * usually has to take away is a scatter. A morning with 09:30 and 11:00
   * already gone is not two bounds.
   *
   * A time not on the step is simply never offered, so it is not an error to
   * name one, and naming every time in the list is how the empty state is
   * reached honestly rather than by handing over an empty range.
   */
  @property({ attribute: 'disable-times' })
  disableTimes = ''

  /**
   * The clock the times are written on: `h12` for twelve hours with a
   * meridiem, `h23` for twenty-four.
   *
   * Absent is the locale's own, which is right for a reader's own form. Set it
   * where every reader must see the same clock whatever their language, as a
   * timetable does. The value is `HH:mm` on twenty-four hours either way.
   */
  @property({ attribute: 'hour-cycle' })
  hourCycle?: HourCycle

  /**
   * What the wheel of hours is called, read by screen readers.
   */
  @property({ attribute: 'hour-label' })
  hourLabel = 'Hour'

  /**
   * Whether the current selection fails validation.
   *
   * A flag rather than a message, the same split Date Picker draws. A flat
   * picker has no room of its own for a sentence: the field that wraps one owns
   * the label, the hint and the feedback, and a second message inside the panel
   * would be the same error said twice. What is left for the picker is the one
   * thing the field cannot draw from outside, the mark on the answer itself.
   */
  @property({ reflect: true, type: Boolean })
  invalid = false

  /**
   * Accessible name for the list, which has no visible one of its own.
   *
   * An `aria-label` or `aria-labelledby` on the host names the list instead.
   */
  @property()
  label = 'Time'

  /**
   * Language tag the times are written in.
   *
   * Absent uses the runtime's own.
   */
  @property()
  locale = ''

  /**
   * Stops the arrow keys in the list from choosing each time they move to.
   * Enter, Space or a click chooses.
   *
   * Time Input sets it, so a reader moves through the list before the panel
   * closes on a time.
   */
  @property({ type: Boolean })
  manual = false

  /**
   * Latest time offered, as `HH:mm`.
   */
  @property()
  max = '23:59'

  /**
   * What the wheel of the half of the day is called, read by screen readers.
   * Its two options are written as the locale writes them, such as AM and PM.
   */
  @property({ attribute: 'meridiem-label' })
  meridiemLabel = 'Before or after noon'

  /**
   * Earliest time offered, as `HH:mm`.
   */
  @property()
  min = '00:00'

  /**
   * What the wheel of minutes is called, read by screen readers.
   */
  @property({ attribute: 'minute-label' })
  minuteLabel = 'Minute'

  /**
   * How many times can be held at once.
   *
   * Absent is one. `range` holds a start and an end with everything between
   * them shown as part of the answer, `multiple` holds any number, and both are
   * carried as one comma-separated value: the same shape `DatePicker` uses,
   * because it is the same question asked of a different unit.
   *
   * **A range is two picks, and a third starts over.** That is the calendar's
   * behavior and a reader who has met one has met both. The alternative, a
   * separate "from" and "to" control, is two answers to what a product asks as
   * one, and it makes the between part impossible to show.
   *
   * **Neither works on wheels and the variant falls back.** A range on
   * wheels is two sets of wheels, which is two controls; a multiple is a set,
   * and a wheel has exactly one value by construction. Rather than draw
   * something that cannot say what it holds, `wheels` renders as a list
   * whenever a mode is set.
   */
  @property({ reflect: true })
  mode?: 'multiple' | 'range'

  /**
   * The validation message for a time after `max`. `{max}` is replaced with
   * `max`, written in `locale`.
   */
  @property({ attribute: 'range-overflow-message' })
  rangeOverflowMessage?: string

  /**
   * The validation message for a time before `min`. `{min}` is replaced with
   * `min`, written in `locale`.
   */
  @property({ attribute: 'range-underflow-message' })
  rangeUnderflowMessage?: string

  /**
   * Every time on offer, as seconds since midnight.
   *
   * Built from `min` upward rather than from midnight, so a list that starts at
   * `09:00` steps from nine rather than offering `09:15` because that is where
   * the quarter hours from midnight happen to land. A step that does not divide
   * the hour is a real thing to want, twenty minutes being the obvious one, and
   * this is the reading that makes it behave. See `offeredTimes`.
   */
  private get times(): number[] {
    return offeredTimes(this.min, this.max, this.step, this.seconds)
  }

  /** The locale with the clock `hour-cycle` asks for. */
  private get clock(): string {
    return clockLocale(this.locale, this.hourCycle)
  }

  /** A time as the value writes it, to the second where `seconds` asks. */
  private valueFor(at: number): string {
    return secondsAsValue(at, this.seconds)
  }

  /**
   * Whether a time is barred by name.
   *
   * `barred`, not `disabled`, for the reason Date Picker records: this is a form
   * control and `HelixFormElement.disabled` is a boolean about the whole of it,
   * so a method and a flag cannot share the name.
   *
   * Only the named list. `min` and `max` are not consulted here because they
   * never produce a row to bar: `times` builds the list between them, so a time
   * outside the bounds is absent rather than present and refused.
   */
  private barred(at: string): boolean {
    const seconds = valueAsSeconds(at)
    return seconds !== null && this.barredAt(seconds)
  }

  /** The same question of seconds since midnight, matching `09:30` and `09:30:00` alike. */
  private barredAt(at: number): boolean {
    return timeBarred(at, this.disableTimes)
  }

  /**
   * The offered time nearest to one the wheels built, which keeps them inside
   * `min`, `max` and `step`.
   *
   * A wheel sets one part of a time and keeps the others, so moving the hour
   * from 16:45 to 17 built 17:45 against a `max` of 17:00, and moving the half
   * of the day built 05:45 against a `min` of 09:00. Measured before this,
   * both reported valid and were submitted. The nearest earlier time wins a
   * tie, so a step past `max` lands on `max`'s own row.
   */
  private nearest(at: number): number {
    return nearestTime(this.times, at)
  }

  /**
   * Whether every offered time in an hour is barred.
   *
   * `shown` is the meridiem the wheel is on, so `1` means 01:00 under AM and
   * 13:00 under PM. Absent is a 24 hour clock, where the number is the hour.
   */
  private wholeHourBarred(shown: number, half?: 'AM' | 'PM'): boolean {
    const whole = wholeHour(shown, half)
    const within = this.times.filter((at) => Math.floor(at / 3600) === whole)
    return within.length > 0 && within.every((at) => this.barredAt(at))
  }

  /** Whether every offered time in a half of the clock is barred. */
  private halfBarred(half: 'AM' | 'PM'): boolean {
    const within = this.times.filter((at) => (half === 'PM') === at >= 43_200)
    return within.length > 0 && within.every((at) => this.barredAt(at))
  }

  /** The times held, which is a list whether or not a mode is set. */
  private get held(): string[] {
    return commaList(this.value)
  }

  /**
   * The list's own `input`, stopped at the boundary.
   *
   * It is composed, so it crosses out of this shadow root on its own, and this
   * element announces the time itself: a page listening here heard two `input`s
   * for one choice, the second from the list inside, after the `change` that
   * should have been the last word. Found running the events example.
   */
  private readonly handleListInput = (event: Event): void => {
    event.stopPropagation()
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
    /* The listbox is told as well, which is what grays it and takes it out of
       the tab order, and this refuses at the source so every path in is covered
       by one check.
       `isDisabled` rather than `disabled`, which is only the half a consumer
       wrote: an ancestor `<fieldset disabled>` is the other half. */
    if (this.isDisabled) {
      return
    }
    const announced = (event as HelixBeforeChangeEvent).detail.value
    /* The listbox already skips a disabled option, so this is the second lock
       rather than the first: it covers a value arriving from a consumer's own
       dispatch, and it is what makes the refusal a fact about the component
       rather than about the listbox it happens to render. */
    if (announced.split(',').some((one) => this.barred(one.trim()))) {
      return
    }
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

  /** The readings the wheels show, from the value or from `min`. */
  private get parts(): ReturnType<typeof wheelParts> {
    const at = valueAsSeconds(this.value) ?? valueAsSeconds(this.min) ?? 0
    return wheelParts(at, isTwelveHour(this.clock))
  }

  /** Puts a changed column back together into a whole time. */
  private readonly moveColumn = (
    part: 'hour' | 'meridiem' | 'minute' | 'second',
    to: string,
  ): void => {
    if (this.isDisabled) {
      return
    }
    const { hour, meridiem, minute, second } = this.parts
    let [h, m, sec] = [hour, minute, second]
    if (part === 'minute') {
      m = Number(to)
    } else if (part === 'second') {
      sec = Number(to)
    } else if (part === 'hour') {
      /* On a twelve hour clock the column says 1 to 12 and the meridiem says
         which half, so the two have to be recombined rather than read straight:
         12 AM is midnight and 12 PM is noon, which is the one pair that does not
         follow the pattern. */
      h = wholeHour(Number(to), isTwelveHour(this.clock) ? meridiem : undefined)
    } else {
      h = (hour % 12) + (to === 'PM' ? 12 : 0)
    }
    /* The wheels build a value from their columns and never reach
       `handleChange`, so the refusal has to be repeated here. Disabling the
       options is not enough on its own: a reader on 09:00 who moves the hour to
       10 lands on 10:00, and 10:00 can be barred while nothing in the hour
       column was. */
    const nearest = this.nearest(h * 3600 + m * 60 + sec)
    if (this.barredAt(nearest)) {
      return
    }
    this.requestValue(this.valueFor(nearest))
  }

  /** Every whole hour that has at least one offered time in it. */
  private get hours(): number[] {
    const found = new Set(this.times.map((at) => Math.floor(at / 3600)))
    return [...found]
  }

  /** Every minute offered within the hour currently shown. */
  private get minutes(): number[] {
    const hour = this.parts.hour
    const found = new Set(
      this.times
        .filter((at) => Math.floor(at / 3600) === hour)
        .map((at) => Math.floor(at / 60) % 60),
    )
    return [...found]
  }

  /** Every second offered within the minute currently shown. */
  private get secondsShown(): number[] {
    const { hour, minute } = this.parts
    return this.times
      .filter((at) => Math.floor(at / 60) === hour * 60 + minute)
      .map((at) => at % 60)
  }

  /**
   * Scrolls each wheel to its selected value, and the list to its selected
   * time.
   *
   * A dial that opens at midnight when it holds ten in the evening is a dial
   * showing the wrong thing, and CSS cannot fix it: `scroll-snap-type` chooses a
   * snap point when something scrolls, and nothing has. Measured before this,
   * with the value at 22:00, the hour wheel sat 288 pixels above its answer. The
   * list had the same fault: holding 09:30 it opened on 12:00 AM with the answer
   * 38 rows down and out of sight, flat on a page and in every Time Input panel.
   * A list holding several, a range or a set, is left where it is, having no
   * one row to come to rest on.
   *
   * The wheels on every update, because the columns re-render as the value
   * moves and the minute column's contents change with the hour. The list on
   * the first only, where it is flat on a page: centering it on every choice
   * would move the row out from under the pointer that chose it.
   *
   * **And it is public, because an update is not the only moment that matters.**
   * Inside a panel this element renders while the panel is still
   * `display: none`, so every box measures zero and there is nothing to center
   * against: measured, the hour wheel stayed 288 pixels off its answer because
   * the only call happened before anything had a size. Whatever shows the panel
   * calls this again afterwards. The guard below makes the early call harmless
   * rather than wrong, which is why it can be left in.
   */
  reveal(): void {
    if (this.mode !== undefined) {
      return
    }
    if (this.variant !== 'wheels') {
      this.partNamed<HTMLElement & { reveal?: () => void }>('list')?.reveal?.()
      return
    }
    for (const column of this.renderRoot?.querySelectorAll<HTMLElement & { reveal?: () => void }>(
      '[part="column"]',
    ) ?? []) {
      column.reveal?.()
    }
  }

  /**
   * Blocks changes to the time. The value is still submitted with the form.
   *
   * **Enforced by refusing every request in one place**, which is the seam this
   * component already has: `requestValue` is what every path here comes through,
   * and gating it once is what stops the next call site from being written
   * without the check.
   *
   * Not `disabled`, which is the confusion worth naming: a disabled control
   * submits nothing and leaves the tab order, and a read-only one submits its
   * value and stays reachable, which is what a form showing a value somebody
   * else set needs.
   */
  @property({ attribute: 'readonly', reflect: true, type: Boolean })
  readOnly = false

  /** Refuses every change while read-only. See `readOnly`. */
  override requestValue(next: string): boolean {
    if (this.readOnly) {
      return false
    }
    return super.requestValue(next)
  }

  /**
   * Stops the form from submitting while no time is chosen.
   */
  @property({ reflect: true, type: Boolean })
  required = false

  /**
   * What the wheel of seconds is called, read by screen readers.
   */
  @property({ attribute: 'second-label' })
  secondLabel = 'Second'

  /**
   * Whether times carry their seconds.
   *
   * The value becomes `HH:mm:ss`, each time is written with its seconds, the
   * wheels take a column of seconds, and `step` counts seconds, the unit
   * `<input type="time">` counts in. A list at a step of one second is 86,400
   * rows, so give `seconds` a `step` and bounds that keep it a list, or use
   * the wheels.
   */
  @property({ type: Boolean })
  seconds = false

  /**
   * How far apart the offered times are, in minutes, or in seconds with
   * `seconds`.
   *
   * Fifteen, which is four rows an hour and ninety-six in a day: enough that a
   * reader scrolls rather than hunts, and few enough that the list is a list.
   * Anything under five is a thousand rows and wants a field instead.
   */
  @property({ type: Number })
  step = 15

  /**
   * The validation message for a time that `step` skips.
   */
  @property({ attribute: 'step-mismatch-message' })
  stepMismatchMessage?: string

  /**
   * The validation message for a time that `disable-times` bars.
   */
  @property({ attribute: 'unavailable-message' })
  unavailableMessage?: string

  /**
   * The validation message for a required time picker with no time chosen.
   */
  @property({ attribute: 'value-missing-message' })
  valueMissingMessage?: string

  /**
   * What is wrong with a time the picker can read, as a validity flag and a
   * message, or nothing.
   *
   * Measured before this: a time past `max` or one `disable-times` bars,
   * whether set by a script or built on the wheels, reported valid and was
   * submitted, where a native time input reports the bound it is past.
   */
  private fault(at: string): [keyof ValidityStateFlags, string] | undefined {
    switch (
      timeFault(at, {
        disableTimes: this.disableTimes,
        max: this.max,
        min: this.min,
        offered: this.times,
      })
    ) {
      case 'rangeUnderflow':
        return [
          'rangeUnderflow',
          fillTemplate(this.rangeUnderflowMessage || 'Choose a time at or after {min}.', {
            min: writeClock(this.min, this.clock, this.seconds),
          }),
        ]
      case 'rangeOverflow':
        return [
          'rangeOverflow',
          fillTemplate(this.rangeOverflowMessage || 'Choose a time at or before {max}.', {
            max: writeClock(this.max, this.clock, this.seconds),
          }),
        ]
      case 'unavailable':
        return ['badInput', this.unavailableMessage || 'Choose a time that is available.']
      case 'stepMismatch':
        return ['stepMismatch', this.stepMismatchMessage || 'Choose one of the times on offer.']
      default:
        return undefined
    }
  }

  /**
   * Shows the times as one `list`, or as `wheels` with a column for each part
   * of the time.
   *
   * `list` is the default and offers whole times, which is what a product with
   * opening hours or slots actually has. `wheels` splits them into an hour, a
   * minute and, where the locale uses one, a meridiem: three short columns
   * instead of ninety-six rows, and the only way to reach `23:45` without
   * scrolling most of a day.
   *
   * The trade is that a wheel cannot say which *combinations* are on offer. A
   * list of half hours from nine to five is seventeen rows and every one of them
   * is a time the product has; the same thing as columns is an hour column and a
   * minute column, and nothing in either says the two are only valid together.
   * The bounds are still enforced, so a reader can be refused after the fact,
   * which is worse than not being offered it.
   *
   * So: `list` where the set is the point, `wheels` where any time is allowed
   * and the range is a whole day.
   *
   * **Optional rather than defaulted, which is not a style preference.** A
   * reflecting property with a default writes its attribute onto every host the
   * moment the element upgrades, including the ones a consumer rendered and did
   * not touch, and React reads that as a hydration mismatch. The absent
   * attribute *is* the list, which the stylesheet reads as the base rule, so
   * only the departure has to be named.
   */
  @property({ reflect: true })
  variant?: 'list' | 'wheels'

  /**
   * Reports "required and empty", or clears it.
   *
   * Written out rather than taken from `MixinField`, which is where the seven
   * form controls get this. That mixin brings a label, a hint and a feedback
   * region with it, and this is a grid rather than a field: it is composed
   * *into* the field that has those, so taking the mixin would give one control
   * two of each. What is shared is five lines, and the anchor is what the
   * browser points its bubble at.
   */
  private reportRequired(): void {
    const anchor = this.partNamed('list') ?? undefined
    if (this.required && this.value === '') {
      this.internals.setValidity(
        { valueMissing: true },
        this.valueMissingMessage || 'Choose a time.',
        anchor,
      )
      return
    }
    /* A value the wheels cannot read is bad input, the same as on the calendar:
       `value="not-a-time"` marks no row, and would otherwise report `:valid` and
       be handed to the form. `valueAsSeconds` rejects the hours and minutes
       that are shaped right and out of range as well as the ones that are not
       shaped right at all. */
    const held = this.held
    if (held.length > 0 && held.some((one) => valueAsSeconds(one) === null)) {
      const shape = this.seconds ? 'HH:mm:ss' : 'HH:mm'
      this.internals.setValidity(
        { badInput: true },
        this.badInputMessage ||
          (this.mode === undefined
            ? `Enter a time as ${shape}.`
            : `Enter times as ${shape}, separated by commas.`),
        anchor,
      )
      return
    }
    for (const one of held) {
      const fault = this.fault(one)
      if (fault) {
        this.internals.setValidity({ [fault[0]]: true }, fault[1], anchor)
        return
      }
    }
    this.internals.setValidity({})
  }

  /**
   * Reports the times to the form, one entry each.
   *
   * `FormData` and one entry per time, which is `DatePicker.report` exactly.
   * `mode="multiple"` is genuinely several answers, and a server reading
   * `times=09:00,17:00` would have to split it on a convention this library
   * invented; `range` sends its two in order, so start and end arrive as the
   * pair they already are.
   *
   * **Nothing at all without a `name`.** A `FormData` carries its own names and
   * its entries are appended whatever the element is called, so an unnamed
   * picker would submit empty-named times rather than being skipped the way a
   * control reporting a plain string is. That is the same guard, for the same
   * reason, that the calendar's own note spells out.
   */
  private report(): void {
    if (this.isDisabled) {
      this.internals.setFormValue(null)
      return
    }
    reportValues(this.internals, this.name, this.held)
  }

  /**
   * Reveals once the wheels, or the list and its rows, have rendered themselves.
   *
   * `updated` is this element's own moment, and each wheel is a `Listbox` that
   * was created during this very render: its first update has been scheduled
   * and has not run, so it has no rows and no height and `reveal` measures zero
   * and gives up. Measured on a standalone picker, every column sat at
   * `scrollTop: 0` with the answer nine rows down, which reads as a wheel
   * showing the wrong time rather than as one that failed to scroll.
   *
   * Whatever opens a panel calls `reveal` again afterwards, for the separate
   * reason that method documents. Flat on a page there is no panel and no
   * second call.
   *
   * Safe to run on every update: the listbox stops as soon as the chosen row is
   * within a pixel of center, so a call with nothing to do costs two rect reads
   * and changes nothing. It cannot fight a reader mid-scroll either, since
   * scrolling a wheel changes no property and so schedules no update.
   */
  private async revealWhenSettled(): Promise<void> {
    const settling = [
      ...(this.renderRoot?.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>(
        '[part="column"], [part="list"], [part~="option"]',
      ) ?? []),
    ]
    await Promise.all(settling.map((one) => one.updateComplete))
    this.reveal()
  }

  /**
   * Whether the list has brought itself to its answer yet. It does that once,
   * and after that only whatever opens a panel calls `reveal`.
   */
  private listRevealed = false

  /* `ariaInvalid` on the host through `ElementInternals`, the same route
     Date Picker takes and for the reason the whole library records: a `role` or a
     state written onto the host as an attribute is one a React consumer's
     server markup never had. **And on each list it draws**, since the host has
     no role and a reader is in a list: read from Chromium's tree, an invalid
     picker's list reported no invalid state. The list carries it to its own
     control through `AriaForwardController`. */
  /**
   * The list's name: the host's `aria-labelledby` read out, then its
   * `aria-label`, then `label`.
   *
   * Read out as words, because the list is inside two shadow roots and an id on
   * the page reaches neither. Measured before this: `<helix-time-picker
   * aria-label="Slot">` was a listbox named "Time".
   */
  private get listName(): string {
    const named = (this.getAttribute('aria-labelledby') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => elementById(this, id)?.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ')
    return named || this.getAttribute('aria-label') || this.label
  }

  /**
   * Hears the host's `aria-label` and `aria-labelledby` change, which no
   * property reports. Made on connection, there being no `MutationObserver` on
   * a server.
   */
  private naming: MutationObserver | undefined = undefined

  override connectedCallback(): void {
    super.connectedCallback()
    this.naming = new MutationObserver(() => this.requestUpdate())
    this.naming.observe(this, { attributeFilter: ['aria-label', 'aria-labelledby'] })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.naming?.disconnect()
    this.naming = undefined
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.internals.ariaInvalid = this.invalid ? 'true' : null
    /* Here rather than in `updated`, which is where `DatePicker` reports from
       too: the value is known before the render and a form read between the two
       should not see the previous one. */
    this.report()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.reportRequired()
    if (this.variant === 'wheels') {
      this.reveal()
      void this.revealWhenSettled()
    } else if (!this.listRevealed) {
      this.listRevealed = true
      void this.revealWhenSettled()
    }
  }

  /**
   * Moves focus to the list, or to the first wheel.
   *
   * The wheels render no list, so focus went nowhere on them and a wrapping
   * component could not move focus into the picker.
   */
  override focus(options?: FocusOptions): void {
    ;(this.partNamed('list') ?? this.partNamed('column'))?.focus(options)
  }

  /**
   * One wheel, which is a listbox like the whole list is.
   *
   * `protected` rather than `private`, which is the whole of what a seam is
   * here: a tier above has to be able to reach it.
   *
   * `barred` is passed per column rather than read from `disableTimes` here,
   * because a column holds a third of a time and only the caller knows the
   * other two thirds. What that means differs by column and the difference is
   * not a detail: a minute is barred when *this* hour plus it is, and an hour is
   * barred only when every minute in it is, since one free minute is a reason to
   * open the wheel rather than to close it.
   */
  protected renderColumn(
    part: 'hour' | 'meridiem' | 'minute' | 'second',
    label: string,
    values: string[],
    written: (one: string) => string,
    value: string,
    barred: (one: string) => boolean = () => false,
  ): TemplateResult {
    return html`<${this.tag('listbox')}
      part="column"
      data-column=${part}
      aria-invalid=${this.invalid ? 'true' : nothing}
      exportparts="empty: column-empty, feedback: column-feedback, filter-icon: column-filter-icon,
        filter-mark: column-filter-mark, hint: column-hint, items: column-items, label: column-label,
        live: column-live, loading: column-loading, search: column-search, search-field: column-search-field"
      aria-label=${label}
      ?disabled=${this.isDisabled}
      .value=${value}
      @helix-before-change=${(event: Event) => {
        event.stopPropagation()
        this.moveColumn(part, (event as HelixBeforeChangeEvent).detail.value)
      }}
      @input=${this.handleListInput}
    >
      ${values.map(
        (one) =>
          html`<${this.tag('option')}
            part="option"
            exportparts="description: option-description, item: option-item,
              item-active: option-item-active, item-selected: option-item-selected,
              label: option-label, text: option-text"
            value=${one}
            ?disabled=${barred(one)}
            ?selected=${one === value}
            >${written(one)}</${this.tag('option')}
          >`,
      )}
    </${this.tag('listbox')}>`
  }

  /**
   * Left and Right move between the wheels, as Web Awesome's columns do, and
   * Tab still does.
   *
   * A wheel is a listbox and takes Up and Down, so the horizontal pair was
   * free. Along the line of text, which runs from the right on a right-to-left
   * page, and stopping at the first and last wheel.
   */
  private readonly handleColumnsKeydown = (event: KeyboardEvent): void => {
    const step = inlineStep(this, event.key)
    if (step === 0 || event.altKey || event.ctrlKey || event.metaKey) {
      return
    }
    const columns = [...(this.renderRoot?.querySelectorAll<HTMLElement>('[part="column"]') ?? [])]
    const at = columns.findIndex((column) => event.composedPath().includes(column))
    const next = columns[at + step]
    if (at < 0 || !next) {
      return
    }
    event.preventDefault()
    next.focus()
  }

  private renderSpinner(): TemplateResult {
    const twelve = isTwelveHour(this.clock)
    const { hour, meridiem, minute, second, shown } = this.parts
    /* The hour column reads 1 to 12 on a twelve hour clock, so the whole hours
       on offer are mapped into that half and de-duplicated: 13:00 and 01:00 are
       both "1", and offering it twice is offering a choice that is not one. */
    const hours = twelve
      ? [...new Set(this.hours.map((one) => (one % 12 === 0 ? 12 : one % 12)))].sort(
          (a, b) => a - b,
        )
      : this.hours
    /* A group named as the list would be, so the wheels are heard as the parts
       of one named time. */
    return html`<div
      part="columns"
      role="group"
      aria-label=${this.listName}
      data-unset=${this.value === '' ? '' : nothing}
      @keydown=${this.handleColumnsKeydown}
    >
      ${this.renderColumn(
        'hour',
        this.hourLabel,
        hours.map(String),
        (one) => (twelve ? one : one.padStart(2, '0')),
        String(shown),
        (one) => this.wholeHourBarred(Number(one), twelve ? meridiem : undefined),
      )}
      ${this.renderColumn(
        'minute',
        this.minuteLabel,
        this.minutes.map(String),
        (one) => one.padStart(2, '0'),
        String(minute),
        (one) => this.barredAt(hour * 3600 + Number(one) * 60),
      )}
      ${
        this.seconds
          ? this.renderColumn(
              'second',
              this.secondLabel,
              this.secondsShown.map(String),
              (one) => one.padStart(2, '0'),
              String(second),
              (one) => this.barredAt(hour * 3600 + minute * 60 + Number(one)),
            )
          : nothing
      }
      ${
        twelve
          ? this.renderColumn(
              'meridiem',
              this.meridiemLabel,
              ['AM', 'PM'],
              (one) => dayPeriod(one as 'AM' | 'PM', this.clock),
              meridiem,
              (one) => this.halfBarred(one as 'AM' | 'PM'),
            )
          : nothing
      }
    </div>`
  }

  /**
   * The flat list of times, for the variant that is not wheels, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own,
   * wrap this one, pass it a property the base does not know about, or leave it
   * out, without reimplementing the whole template to do any of them. The tag is
   * interpolated rather than written, so `tier` resolves it: this renders the
   * headless element, and a styled subclass that sets `tier` renders the styled one
   * from the same template.
   */
  protected renderList(): TemplateResult {
    return html`<${this.tag('listbox')}
      part="list"
      aria-invalid=${this.invalid ? 'true' : nothing}
      exportparts="empty: list-empty, feedback: list-feedback, filter-icon: list-filter-icon,
        filter-mark: list-filter-mark, hint: list-hint, items: list-items, label: list-label,
        live: list-live, loading: list-loading, search: list-search, search-field: list-search-field"
      aria-label=${this.listName}
      data-unset=${this.value === '' ? '' : nothing}
      ?disabled=${this.isDisabled}
      ?manual=${this.manual}
      ?multiple=${this.mode !== undefined}
      .value=${this.value}
      @helix-before-change=${this.handleChange}
      @input=${this.handleListInput}
    >
      ${this.times.map((seconds) => {
        const at = this.valueFor(seconds)
        const between = this.between(at)
        return html`<${this.tag('option')}
          part="option${between ? ' option-between' : ''}"
          exportparts="description: option-description, item: option-item,
            item-active: option-item-active, item-selected: option-item-selected,
            label: option-label, text: option-text"
          value=${at}
          ?disabled=${this.barred(at)}
          ?selected=${this.held.includes(at)}
          data-between=${between ? '' : nothing}
          >${writeClock(at, this.clock, this.seconds)}</${this.tag('option')}
        >`
      })}
    </${this.tag('listbox')}>`
  }

  protected override render(): TemplateResult {
    /* A mode falls back to the list, for the reason the property records: a
       range on wheels is two sets of wheels and a multiple is a set, which a
       wheel cannot hold. */
    if (this.variant === 'wheels' && this.mode === undefined) {
      return this.renderSpinner()
    }
    return html`${this.renderList()}`
  }

  /**
   * The value as a `Date` on 1 January 1970 UTC, or `null` while there is no time.
   *
   * The platform's own pair on `<input type="time">`, epoch day included: a time
   * is an offset into a day rather than an instant, and putting it on the epoch
   * is what makes `valueAsNumber` come out as milliseconds since midnight rather
   * than as a moment nobody meant. Assigning any date reads the clock off it, so
   * a consumer handing over `new Date()` gets the time of day they expected.
   */
  get valueAsDate(): Date | null {
    const at = valueAsSeconds(this.value)
    return at === null ? null : new Date(at * 1000)
  }

  set valueAsDate(date: Date | null) {
    this.valueAsNumber = date ? date.getTime() : Number.NaN
  }

  /** The value as milliseconds since midnight, or `NaN` while there is no time. */
  get valueAsNumber(): number {
    const at = valueAsSeconds(this.value)
    return at === null ? Number.NaN : at * 1000
  }

  /* Read off the day the time falls in, so any `Date` gives its time of day,
     to the minute or, with `seconds`, to the second. */
  set valueAsNumber(ms: number) {
    this.value = Number.isNaN(ms)
      ? ''
      : this.valueFor(Math.floor((((ms % 86_400_000) + 86_400_000) % 86_400_000) / 1000))
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-time-picker': HelixHeadlessTimePicker
  }
}
