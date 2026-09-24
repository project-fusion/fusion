import {
  valueAsTime as asTime,
  customElement,
  timeAsValue as fromTime,
  type HelixBeforeChangeEvent,
  HelixFormElement,
  MixinControllerValue,
  minutesAsValue,
  reportValues,
  valueAsMinutes,
  writeTime,
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
 * **A list rather than three wheels**, and the reason is what a list already
 * is. `Listbox` brings the keyboard, the typeahead, the scroll into view and
 * the announcement of a set of options, and a time at a step is a set of
 * options. Three little wheels for hours, minutes and a meridiem are three
 * controls to build, three to test, and a tab stop each for something a reader
 * answers once.
 *
 * **A step is what makes it a list at all.** Fifteen minutes is ninety-six rows,
 * which a reader scrolls or types into; one minute is one thousand four hundred
 * and forty, which is a listbox in name only. So the list is for the times a
 * product actually offers, and arbitrary times are the field's job in Input
 * Time, the same division Date Input draws between typing a date and using the
 * calendar.
 *
 * **The value is `HH:mm` on a twenty-four hour clock, always.** That is what a
 * form submits and what `min` and `max` compare against, and it sorts as a
 * string, which is the whole reason the shape is that one. What each row *says*
 * is the reader's own convention, from `Intl`.
 *
 * **The chosen row is marked in the markup, not worked out on upgrade.** The
 * listbox is handed the answer as `.value`, and lit-ssr serializes no property
 * binding, so a served `value="09:30"` shipped ninety-six rows with nothing on
 * any of them saying which one it was: the mark arrived when the listbox
 * upgraded and ran `place`. So each option is given `selected` as well, which
 * is an attribute binding and does serve, and which the listbox then agrees
 * with rather than fights, `place` writing the same answer from the same value.
 * `selected` is the declaration a consumer writes on `Option` anywhere else in
 * the library, and Date Picker expresses its own choice as markup for the same
 * reason: a picker whose answer is invisible until a script runs is a picker
 * whose answer is not served at all. Both readings do it, the list and the
 * wheels, a wheel being a listbox like the list is.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Time, TimeList
 * @documentation https://fusion.dev/helix/components/time-picker
 *
 * @event {Event} change - Announced once the value has moved.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before the time changes. Cancelable: refusing it takes the decision and nothing moves.
 * @event {Event} input - Announced once the value has moved.
 *
 * @csspart column - One of them.
 * @csspart column-empty - Shown when a filter has hidden everything.
 * @csspart column-feedback - What is wrong with it.
 * @csspart column-filter-icon - The mark beside that field.
 * @csspart column-filter-mark - The glyph beside the filter field, where none is slotted.
 * @csspart column-hint - Help under the list.
 * @csspart column-items - The list itself.
 * @csspart column-label - The question, over the list.
 * @csspart column-live - The inner list's `live`, the region a screen reader hears its empty and loading lines from.
 * @csspart column-loading - Shown while the options are still on their way.
 * @csspart column-search - The region holding the field that narrows the list.
 * @csspart column-search-field - The field itself.
 * @csspart columns - The row of columns, in `wheels`.
 * @csspart list - The listbox holding the times, in `list`.
 * @csspart list-empty - Shown when a filter has hidden everything.
 * @csspart list-feedback - What is wrong with it.
 * @csspart list-filter-icon - The mark beside that field.
 * @csspart list-filter-mark - The glyph beside the filter field, where none is slotted.
 * @csspart list-hint - Help under the list.
 * @csspart list-items - The list itself.
 * @csspart list-label - The question, over the list.
 * @csspart list-live - The inner list's `live`, the region a screen reader hears its empty and loading lines from.
 * @csspart list-loading - Shown while the options are still on their way.
 * @csspart list-search - The region holding the field that narrows the list.
 * @csspart list-search-field - The field itself.
 * @csspart option - One time in it. Carries `data-between` inside a range.
 * @csspart option-between - A time inside a chosen range, short of either end, beside `option`.
 * @csspart option-description - The caption under the words, when there is one.
 * @csspart option-item - The row.
 * @csspart option-item-active - The row the keyboard is on.
 * @csspart option-item-selected - The row of a chosen time: the one time, or either end of a range.
 * @csspart option-label - The words.
 * @csspart option-text - The words and the caption, as one column.
 */
@customElement('helix-headless-time-picker')
export class HelixHeadlessTimePicker extends MixinControllerValue(HelixFormElement) {
  /**
   * What a reader is told when the value holds something that is not a time.
   *
   * **Every sentence a control raises in the browser's bubble is a property**,
   * named for the validity flag it reports, so a form in another language
   * speaks it. Absent is the control's own sentence, in English.
   */
  @property({ attribute: 'bad-input-message' })
  badInputMessage?: string

  /**
   * Times that cannot be chosen, comma separated, as `HH:mm`.
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
   * Latest time offered, as `HH:mm`.
   */
  @property()
  max = '23:59'

  /**
   * Earliest time offered, as `HH:mm`.
   */
  @property()
  min = '00:00'

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
   * Whether the control refuses changes while still submitting its value.
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

  /**
   * Whether the form refuses to submit while nothing is chosen.
   */
  @property({ reflect: true, type: Boolean })
  required = false

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
    const from = valueAsMinutes(this.min) ?? 0
    const to = valueAsMinutes(this.max) ?? 1439
    const step = Math.max(1, Math.round(this.step))
    const found: number[] = []
    for (let at = from; at <= to; at += step) {
      found.push(at)
    }
    return found
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
    return this.disableTimes
      .split(',')
      .map((one) => one.trim())
      .filter(Boolean)
      .includes(at)
  }

  /**
   * Whether every offered time in an hour is barred.
   *
   * `shown` is the meridiem the wheel is on, so `1` means 01:00 under AM and
   * 13:00 under PM. Absent is a 24 hour clock, where the number is the hour.
   */
  private wholeHourBarred(shown: number, half?: 'AM' | 'PM'): boolean {
    const whole = half === undefined ? shown : (shown % 12) + (half === 'PM' ? 12 : 0)
    const within = this.times.filter((at) => Math.floor(at / 60) === whole)
    return within.length > 0 && within.every((at) => this.barred(minutesAsValue(at)))
  }

  /** Whether every offered time in a half of the clock is barred. */
  private halfBarred(half: 'AM' | 'PM'): boolean {
    const within = this.times.filter((at) => (half === 'PM') === at >= 720)
    return within.length > 0 && within.every((at) => this.barred(minutesAsValue(at)))
  }

  /** The times held, which is a list whether or not a mode is set. */
  private get held(): string[] {
    return this.value
      .split(',')
      .map((one) => one.trim())
      .filter(Boolean)
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

  /** The three readings a wheel shows, from the value or from `min`. */
  private get parts(): { hour: number; meridiem: 'AM' | 'PM'; minute: number } {
    const at = valueAsMinutes(this.value) ?? valueAsMinutes(this.min) ?? 0
    const hour = Math.floor(at / 60)
    return { hour, meridiem: hour < 12 ? 'AM' : 'PM', minute: at % 60 }
  }

  /** Puts a changed column back together into a whole time. */
  private readonly moveColumn = (part: 'hour' | 'meridiem' | 'minute', to: string): void => {
    if (this.isDisabled) {
      return
    }
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
    /* The wheels build a value from three columns and never reach
       `handleChange`, so the refusal has to be repeated here. Disabling the
       options is not enough on its own: a reader on 09:00 who moves the hour to
       10 lands on 10:00, and 10:00 can be barred while nothing in the hour
       column was. */
    const whole = minutesAsValue(next)
    if (this.barred(whole)) {
      return
    }
    this.requestValue(whole)
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
   * Each wheel comes to rest on its own answer, and the list on the time it
   * holds.
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
   * How far apart the offered times are, in minutes.
   *
   * Fifteen, which is four rows an hour and ninety-six in a day: enough that a
   * reader scrolls rather than hunts, and few enough that the list is a list.
   * Anything under five is a thousand rows and wants a field instead.
   */
  @property({ type: Number })
  step = 15

  /** Refuses every change while read-only. See `readOnly`. */
  override requestValue(next: string): boolean {
    if (this.readOnly) {
      return false
    }
    return super.requestValue(next)
  }

  /**
   * What a reader is told when a time is required and none is chosen.
   */
  @property({ attribute: 'value-missing-message' })
  valueMissingMessage?: string

  /**
   * Whether the times are one list or a column each.
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
        this.valueMissingMessage ?? 'Choose a time.',
        anchor,
      )
      return
    }
    /* A value the wheels cannot read is bad input, the same as on the calendar:
       `value="not-a-time"` marks no row, and would otherwise report `:valid` and
       be handed to the form. `asTime` rejects the hours and minutes that are
       shaped right and out of range as well as the ones that are not shaped
       right at all. */
    const held = this.held
    if (held.length > 0 && held.some((one) => asTime(one) === null)) {
      this.internals.setValidity(
        { badInput: true },
        this.badInputMessage ??
          (this.mode === undefined
            ? 'Enter a time as HH:mm.'
            : 'Enter times as HH:mm, separated by commas.'),
        anchor,
      )
      return
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
    if (this.disabled) {
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
     server markup never had. */
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

  /** Puts the keyboard on the list, which is the only control here. */
  override focus(options?: FocusOptions): void {
    this.partNamed('list')?.focus(options)
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
    part: 'hour' | 'meridiem' | 'minute',
    label: string,
    values: string[],
    written: (one: string) => string,
    value: string,
    barred: (one: string) => boolean = () => false,
  ): TemplateResult {
    return html`<${this.tag('listbox')}
      part="column"
      data-column=${part}
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
    return html`<div part="columns" data-unset=${this.value === '' ? '' : nothing}>
      ${this.renderColumn(
        'hour',
        'Hour',
        hours.map(String),
        (one) => (twelve ? one : one.padStart(2, '0')),
        shownHour,
        (one) => this.wholeHourBarred(Number(one), twelve ? meridiem : undefined),
      )}
      ${this.renderColumn(
        'minute',
        'Minute',
        this.minutes.map(String),
        (one) => one.padStart(2, '0'),
        String(minute),
        (one) => this.barred(minutesAsValue(hour * 60 + Number(one))),
      )}
      ${
        twelve
          ? this.renderColumn(
              'meridiem',
              'Before or after noon',
              ['AM', 'PM'],
              (one) => one,
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
      exportparts="empty: list-empty, feedback: list-feedback, filter-icon: list-filter-icon,
        filter-mark: list-filter-mark, hint: list-hint, items: list-items, label: list-label,
        live: list-live, loading: list-loading, search: list-search, search-field: list-search-field"
      aria-label=${this.label}
      data-unset=${this.value === '' ? '' : nothing}
      ?disabled=${this.isDisabled}
      ?multiple=${this.mode !== undefined}
      .value=${this.value}
      @helix-before-change=${this.handleChange}
      @input=${this.handleListInput}
    >
      ${this.times.map((minutes) => {
        const at = minutesAsValue(minutes)
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
          >${writeTime(at, this.locale)}</${this.tag('option')}
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
    return asTime(this.value)
  }

  set valueAsDate(date: Date | null) {
    this.value = fromTime(date)
  }

  /** The value as milliseconds since midnight, or `NaN` while there is no time. */
  get valueAsNumber(): number {
    return asTime(this.value)?.getTime() ?? Number.NaN
  }

  set valueAsNumber(ms: number) {
    this.value = Number.isNaN(ms) ? '' : fromTime(new Date(ms))
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-time-picker': HelixHeadlessTimePicker
  }
}
