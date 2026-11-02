import {
  AriaForwardController,
  valueAsTime as asTime,
  clockLocale,
  customElement,
  drawIcon,
  formatWords,
  timeAsValue as fromTime,
  type HelixBeforeChangeEvent,
  HelixClearEvent,
  HelixFormElement,
  type HourCycle,
  handedLocale,
  hostWords,
  isClockValue,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
  MixinPickerEditing,
  MixinPickerField,
  MixinSegmentedField,
  MixinTokens,
  numberConverter,
  readWrittenTime,
  slottedWords,
  timeFault,
  words,
  wordsLocale,
  writeClock,
} from '@fusion.dev/helix-core'
import { clock, x } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html } from 'lit/static-html.js'
/* Base elements here, styled ones in the styled file. The arrangement Date
   Input has with its calendar. */
import '../../tag/root/index.js'
import '../../time-picker/index.js'

/**
 * @summary A field for a time, typed or picked from a list.
 *
 * @description
 * The list is a `TimePicker`, which you can also use on its own, for example in
 * a settings pane. This element adds the field, the overlay, and the form
 * association, the same arrangement Date Input has with `DatePicker` and Color
 * Input has with `ColorPicker`.
 *
 * You can type a time or pick one. The list offers times at a step, and the
 * field lets you enter any time, such as `09:07`.
 *
 * The value is always `HH:mm` on a 24-hour clock, or `HH:mm:ss` with
 * `seconds`, because that is what the form
 * submits, what `min` and `max` compare against, and what sorts correctly as a
 * string. While idle, the field shows the time in the user's locale format.
 * Once the caret is in the field, it shows the value itself. You can type
 * `14:30`, or a time as you write one, such as `2:30 PM`, `2.30pm`, or
 * `14h30`, and the field reads it as you leave it, with AM and PM in the
 * locale's words.
 *
 * Typing sends `input` on each keystroke and `change` when you leave the
 * field. The trigger and ArrowDown open the list, and so does a press into the
 * field; Tab into the field opens nothing. The text field is a `combobox`
 * with `aria-haspopup="dialog"`, `aria-expanded`, and `aria-controls`, since
 * Down opens the list from it. In the list, the arrow keys, typed digits and PageUp and PageDown
 * move through the times, and Enter, Space or a click chooses one and closes
 * the panel. With `picker="wheels"` each wheel moves the time as you turn it,
 * the panel stays open, and Enter or Escape closes it.
 *
 * With `segmented`, the field is a row of segments in place of the text: an
 * hour, a minute, and AM or PM where the clock has them, each set with digits
 * or the arrow keys. Alt+Down opens the list from a segment. A `range` is two
 * rows with a dash between them, the start and the end, and `multiple` keeps
 * the text.
 *
 * Text that is not a time gives the form an empty value, as a native time
 * field does, and `value` keeps the text so it can be corrected.
 *
 * **Keyboard.** The field is one tab stop, or each segment is with
 * `segmented`, and the trigger is one more.
 *
 * | Key | What it does |
 * |---|---|
 * | Down | In the text field, opens the list on the chosen time. |
 * | Alt with Down | Opens the list, from the text field or a segment. |
 * | Enter | In the text field, takes the typed time and submits the form, as a native field does. In the list, chooses the highlighted time. |
 * | Escape | Closes the list and puts focus back in the field. |
 * | Up, Down on a segment | Steps the segment by one, round from its last value to its first. |
 * | Page Up, Page Down on a segment | Steps by a page: two hours, or fifteen minutes or seconds. |
 * | Home, End on a segment | Goes to the segment's first or last value. |
 * | Digits on a segment | Fill it, and move to the next once it can take no more. |
 * | A letter on the half of the day | Picks the half whose name starts with it, such as A for AM. |
 * | Backspace, Delete on a segment | Take off its last digit, or move to the segment before where it is empty. |
 * | Left, Right on a segment | Move to the previous or the next segment, along the line of text. |
 *
 * In the list, the keys are `TimePicker`'s.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases TimeField, InputTime
 * @documentation https://fusion.dev/helix/components/time-input
 *
 * @slot clear-icon - Replaces the cross on the clear button, under `clearable`.
 * @slot end - Content after the time, before the trigger, such as a clear button.
 * @slot feedback - The message that says what is wrong with the value.
 * @slot hint - Help under the field.
 * @slot label - The label, for content richer than the `label` text.
 * @slot panel-footer - Content in the panel under the times, such as a note or an action.
 * @slot panel-header - Content in the panel above the times, such as a heading or a shortcut.
 * @slot start - Content before the time, such as an icon.
 * @slot trigger - The icon on the field that shows a list opens.
 *
 * @event {Event} change - Fired after the value changes.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before the time changes. Cancelable: canceling it stops the change and leaves the decision to you.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before the list closes. Cancelable: canceling it keeps the list open and leaves the decision to you.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the list opens. Cancelable: canceling it keeps the list closed and leaves the decision to you.
 * @event {HelixClearEvent} helix-clear - Fired after the clear button has emptied the field, after `input` and `change`.
 * @event {Event} input - Fired after the value changes.
 * @event {ToggleEvent} toggle - Fired after the list opens or closes, with `newState` and `oldState`.
 *
 * @csspart clear - The button that empties the field, under `clearable`, while it holds a time.
 * @csspart control - The text input.
 * @csspart feedback - The message that says what is wrong with the value.
 * @csspart field - The box that holds the text and the trigger.
 * @csspart hint - Help under the field, while nothing is wrong.
 * @csspart label - The label above the field.
 * @csspart literal - The text the locale writes between two segments, such as a colon, in `segmented`.
 * @csspart picker - The time picker inside the panel.
 * @csspart picker-column - One column of the picker.
 * @csspart picker-column-empty - The text shown when the filter hides every option.
 * @csspart picker-column-error - A wheel's `error` part, which the list never sets: its times do not load.
 * @csspart picker-column-feedback - The column's message that says what is wrong with the value.
 * @csspart picker-column-filter-icon - The icon beside the filter field.
 * @csspart picker-column-filter-mark - The default icon beside the filter field, shown when none is slotted.
 * @csspart picker-column-hint - Help under the list.
 * @csspart picker-column-items - The list of options.
 * @csspart picker-column-label - The label above the list.
 * @csspart picker-column-live - The inner column's `live` part, the region screen readers announce its empty and loading text from.
 * @csspart picker-column-loading - The text shown while the options load.
 * @csspart picker-column-search - The region that holds the filter field.
 * @csspart picker-column-search-field - The filter field.
 * @csspart picker-column-voice - The dictation button in the filter field.
 * @csspart picker-column-voice-level - The meter that draws the microphone's level in place of its glyph while the field listens, where the tier defines Voice Level.
 * @csspart picker-column-voice-level-canvas - The canvas the dictation meter draws on.
 * @csspart picker-column-voice-listening - The dictation button while it listens.
 * @csspart picker-column-voice-status - What a screen reader hears as dictation starts and stops.
 * @csspart picker-columns - The row of columns, in `wheels`.
 * @csspart picker-feedback - The picker's own message, under the times, while the picker's `feedback` is set.
 * @csspart picker-hint - The picker's hint, which Time Input never sets: help under the field is the field's own `hint`.
 * @csspart picker-label - The picker's visible label, which Time Input never draws: the field's `label` names it.
 * @csspart picker-list - The listbox holding the times, in `list`.
 * @csspart picker-list-empty - The text shown when the filter hides every option.
 * @csspart picker-list-error - The list's `error` part, which the list never sets: its times do not load.
 * @csspart picker-list-feedback - The inner list's message that says what is wrong with the value.
 * @csspart picker-list-filter-icon - The icon beside the filter field.
 * @csspart picker-list-filter-mark - The default icon beside the filter field, shown when none is slotted.
 * @csspart picker-list-hint - Help under the list.
 * @csspart picker-list-items - The list of options.
 * @csspart picker-list-label - The label above the list.
 * @csspart picker-list-live - The inner list's `live` part, the region screen readers announce its empty and loading text from.
 * @csspart picker-list-loading - The text shown while the options load.
 * @csspart picker-list-search - The region that holds the filter field.
 * @csspart picker-list-search-field - The filter field.
 * @csspart picker-list-voice - The dictation button in the filter field.
 * @csspart picker-list-voice-level - The meter that draws the microphone's level in place of its glyph while the field listens, where the tier defines Voice Level.
 * @csspart picker-list-voice-level-canvas - The canvas the dictation meter draws on.
 * @csspart picker-list-voice-listening - The dictation button while it listens.
 * @csspart picker-list-voice-status - What a screen reader hears as dictation starts and stops.
 * @csspart picker-now - The picker's button that chooses the current time, which Time Input does not draw.
 * @csspart picker-option - One time in the picker. Carries `data-between` inside a range.
 * @csspart picker-option-between - A time inside a chosen range, between its two ends. Set together with `picker-option`.
 * @csspart picker-option-description - The caption under the label, when there is one.
 * @csspart picker-option-item - The row.
 * @csspart picker-option-item-active - The row the keyboard is on.
 * @csspart picker-option-item-selected - The row of a chosen time: the one time, or either end of a range.
 * @csspart picker-option-label - The option's label.
 * @csspart picker-option-text - The label and the caption, as one column.
 * @csspart range-separator - The dash between a range's two rows of segments, in `segmented`, beside `literal`.
 * @csspart rest - The count of times held beyond the ones shown. A `<button>` with `expandable`, and a `<span>` without it.
 * @csspart segment - One part of the time, an hour, a minute, a second or AM and PM, in `segmented`.
 * @csspart segment-placeholder - A segment with nothing in it yet. Applied with `segment`.
 * @csspart segments - The row of segments that holds the time, in `segmented`.
 * @csspart surface - The floating panel.
 * @csspart tags - The row the times sit in.
 * @csspart time - One held time, as a tag, in `multiple`.
 * @csspart time-cell - The tag's grid cell, which a tag draws only inside a tag group.
 * @csspart time-dismiss - The remove button, when `dismissible`.
 * @csspart time-dismiss-mark - The default icon on the remove button, shown when none is slotted.
 * @csspart time-label - The label, trimmed to its capitals and baseline.
 * @csspart time-link - The tag's link around its label, which a tag draws only with `href`.
 * @csspart time-start - The category before the label.
 * @csspart trigger - The control that opens the list.
 * @csspart trigger-icon - The icon on the button that opens the clock.
 *
 * @cssstate aligned-start - While the clock lines up with the start of the field.
 * @cssstate blank - The field holds no time.
 * @cssstate invalid - The control has an error to show, from the browser's validation or from your `feedback`.
 * @cssstate open - While the clock is open.
 * @cssstate placed-bottom - While the clock sits below the field.
 * @cssstate placed-top - While the clock sits above the field, where there was no room below.
 */
@customElement('helix-headless-time-input')
export class HelixHeadlessTimeInput extends MixinSegmentedField(
  MixinPickerEditing(
    MixinPickerField(
      MixinControllerOpen(MixinTokens(MixinControllerValue(MixinField(HelixFormElement)))),
    ),
  ),
) {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-time-input': { triggerLabel: 'Uhrzeit auswählen' } })`.
   */
  static words = 'helix-time-input'

  /* A consumer's `aria-describedby` names ids in their own tree and the control
     is in this shadow root, so the reference has to be carried down as an
     element rather than copied as an id. See `AriaForwardController`: measured
     in Chrome's own tree, the host held the description and the control the
     reader is actually on was exposed without it. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('control') ?? this.segmentGroup,
  })

  /**
   * What the browser may autofill here, as one of the platform's own tokens.
   *
   * Empty leaves the attribute off, which is the browser's default and is what
   * lets autofill work at all.
   */
  @property()
  autocomplete = ''

  /**
   * Whether the field shows a button that empties it, as Input's `clearable`
   * does. Shown only while the field holds something to clear and is neither
   * disabled nor read-only.
   */
  @property({ type: Boolean })
  clearable = false

  /** The accessible name of the clear button, which shows only an icon. */
  @words
  @property({ attribute: 'clear-label' })
  clearLabel = 'Clear'

  /** Typed, so a keystroke is announced as `input` alone. See `announcesInput`. */
  protected override readonly announcesInput = true

  /**
   * Times that cannot be chosen, as `HH:mm`, separated by commas or spaces.
   *
   * Handed to the list, which offers them as unavailable, and checked against
   * a typed time, which is then invalid.
   */
  @property({ attribute: 'disable-times' })
  disableTimes = ''

  /**
   * The clock the times are written on: `h12` for twelve hours with a
   * meridiem, `h23` for twenty-four. Absent is the locale's own.
   *
   * Handed to the list. The value is `HH:mm` on twenty-four hours either way.
   */
  @property({ attribute: 'hour-cycle' })
  hourCycle?: HourCycle

  /**
   * Language tag the times are written in.
   *
   * Absent is the page's: the `lang` of the nearest element with one, as
   * Shoelace and Web Awesome read it, then the runtime's own.
   */
  @property()
  locale = ''

  /** The locale the words and times are written in: `locale`, or the page's `lang`. */
  private get language(): string {
    return wordsLocale(this)
  }

  /**
   * Latest time that can be chosen, as `HH:mm`.
   */
  @property()
  max = '23:59'

  /**
   * Earliest time that can be chosen, as `HH:mm`.
   */
  @property()
  min = '00:00'

  /**
   * How many times the field holds at once.
   *
   * Absent is one. `range` holds a start and an end, `multiple` holds any
   * number, and both are carried as one comma-separated value, which is what a
   * form submits. `TimePicker` carries the longer note on the interaction and
   * on why a wheel cannot do either.
   */
  @property({ reflect: true })
  mode?: 'multiple' | 'range'

  /**
   * The words on the list's button that chooses the current time, drawn with
   * `show-now`.
   */
  @words
  @property({ attribute: 'now-label' })
  nowLabel = 'Now'

  /**
   * Whether the panel shows one list of times or a column for each part of the
   * time.
   *
   * `list` offers whole times, which is what a product with slots or opening
   * hours has. `wheels` splits them into an hour, a minute and a meridiem where
   * the locale uses one, which is the only way to reach `23:45` without
   * scrolling most of a day. `TimePicker` carries the longer note on the trade.
   *
   * **Optional rather than defaulted, which is not a style preference.** A
   * reflecting property with a default writes its attribute onto every host the
   * moment the element upgrades, including the ones a consumer rendered and did
   * not touch, and React reads that as a hydration mismatch. The absent
   * attribute *is* the list, which the stylesheet reads as the base rule, so
   * only the departure has to be named.
   */
  @property({ reflect: true })
  picker?: 'list' | 'wheels'

  /**
   * Placeholder text shown before a time is entered.
   */
  @words
  @property()
  placeholder = 'HH:mm'

  /**
   * The message shown when a range holds more than two times.
   *
   * **Every sentence a control raises in the browser's bubble is a property**,
   * so a form in another language speaks it. Unset is the sentence registered
   * for the page's language, then the English.
   */
  @words
  @property({ attribute: 'range-length-message' })
  rangeLengthMessage = 'A range is two times.'

  /**
   * The message shown when a time is after `max`, with `{max}` filled in as
   * the field displays it.
   */
  @words
  @property({ attribute: 'range-overflow-message' })
  rangeOverflowMessage = 'Choose a time at or before {max}.'

  /**
   * The message shown when a time is before `min`, with `{min}` filled in as
   * the field displays it.
   */
  @words
  @property({ attribute: 'range-underflow-message' })
  rangeUnderflowMessage = 'Choose a time at or after {min}.'

  /**
   * The name of the button that removes one time, with `{name}` filled in.
   *
   * **The name goes in**, so a row of them is heard as which one each
   * removes rather than as "Remove" said once per time.
   */
  @words
  @property({ attribute: 'remove-label' })
  removeLabel = 'Remove {name}'

  /**
   * Whether times carry their seconds: the value is `HH:mm:ss`, a typed time
   * may give them, the field writes them, and the list's `step` counts seconds.
   * See Time Picker's `seconds`.
   */
  @property({ type: Boolean })
  seconds = false

  /**
   * Draws a button under the times in the list that chooses the current time,
   * moved to the nearest time on offer. See Time Picker's `show-now`. Its words
   * are `now-label`.
   */
  @property({ attribute: 'show-now', type: Boolean })
  showNow = false

  /**
   * How far apart the offered times are, in minutes, or in seconds with
   * `seconds`.
   */
  @property({ converter: numberConverter('step', 15) })
  step = 15

  /**
   * Whether the field shows the time in the local style or as the value
   * itself.
   *
   * `local` is the reader's own convention from `Intl`, which is what a time is
   * for reading; `iso` is `HH:mm`, which is what it is for typing. The field
   * swaps to the value while the caret is in it either way, so the rendering is
   * never something this element would refuse to read back.
   */
  @property({ attribute: 'time-style' })
  timeStyle: 'iso' | 'local' = 'local'

  /**
   * The name of the button that opens the list, read by screen readers.
   */
  @words
  @property({ attribute: 'trigger-label' })
  triggerLabel = 'Choose a time'

  /**
   * The message shown when `disable-times` bars a time.
   */
  @words
  @property({ attribute: 'unavailable-message' })
  unavailableMessage = 'Choose a time that is available.'

  /** Every time in the value, which may hold more than one. */
  private get held(): string[] {
    /* The en dash and the spaced hyphen both mean "to", because a range is shown
       that way and what is shown is what gets typed back. A time carries a colon
       rather than a hyphen, so unlike a date there is no ambiguity to guard
       against, and the guard is kept anyway for the sake of one reading. */
    return this.value
      .replace(/\s+[–-]\s+/g, ',')
      .split(',')
      .map((one) => one.trim())
      .filter(Boolean)
  }

  /**
   * A row of segments holds one time, and `range` takes two rows with a dash
   * between them, as React Aria's range fields do. `multiple` keeps the line
   * of text, whose tags are how it writes several.
   */
  protected override get segmentable(): boolean {
    return this.mode !== 'multiple'
  }

  protected override get segmentGroups(): number {
    return this.mode === 'range' ? 2 : 1
  }

  protected override get segmentedKind(): 'time' {
    return 'time'
  }

  protected override get segmentLocale(): string {
    return this.language
  }

  protected override get segmentOptions(): { hourCycle?: HourCycle | undefined; seconds: boolean } {
    return { hourCycle: this.hourCycle, seconds: this.seconds }
  }

  /** Whether a typed time is one this field holds, to the second where it holds seconds. */
  private isTime(at: string): boolean {
    return isClockValue(at, this.seconds)
  }

  /** One time, written the way `time-style` asks for. */
  private written(at: string): string {
    return this.timeStyle === 'iso' || !this.isTime(at)
      ? at
      : writeClock(at, clockLocale(this.language, this.hourCycle), this.seconds)
  }

  /** What the field shows: the value while it is being edited, a reading when not. */
  protected override get display(): string {
    if (this.mode === 'multiple') {
      return this.draft
    }
    const held = this.held
    if (this.editing || this.timeStyle === 'iso') {
      return this.mode === 'range' && held.length === 2 ? held.join(' – ') : this.value
    }
    const written = held.map((one) => this.written(one))
    return this.mode === 'range' ? written.join(' – ') : written.join(', ')
  }

  /**
   * What is being typed but not yet held, for `multiple` only.
   *
   * The other modes type into the value directly, because one time and a range
   * are both a whole answer the moment they are complete. A multiple is a set
   * being added to, so the field needs somewhere to hold a time before it joins.
   */
  @state()
  private draft = ''

  /** The times that get a tag, which is all of them until the cap says not. */
  private get shownTimes(): string[] {
    const held = this.held
    /* `shownLimit` rather than `maxTags`, which is the whole of what
       expanding does: the mixin returns zero while expanded, so the cap
       lifts and every time gets a tag. */
    return this.shownLimit > 0 ? held.slice(0, this.shownLimit) : held
  }

  /** How many are held beyond the ones shown. */
  private get restCount(): number {
    return Math.max(0, this.held.length - this.shownTimes.length)
  }

  /**
   * A time as the reader wrote it, as the value writes one: `HH:mm` as it
   * is, and `2:30 PM`, `2.30pm`, `14h30`, or `1430` read back, with the half
   * of the day in the locale's words. Empty where it is no time.
   */
  private read(text: string): string {
    return this.isTime(text) ? text : readWrittenTime(text, this.language, this.seconds)
  }

  /**
   * The text the reader leaves, read: a time written as a reader writes one
   * becomes the value as the field commits. Not on each key, where `2:3` is
   * a time a moment before it is `2:30`.
   */
  private readonly handleTextCommit = (event: Event): void => {
    if (this.mode !== 'multiple') {
      const held = this.held
      const read = held.map((one) => this.read(one))
      if (held.length > 0 && !held.every((one) => this.isTime(one)) && read.every(Boolean)) {
        this.requestValue(read.join(','))
      }
    }
    this.handleCommit(event)
  }

  /** Adds what was typed to the set, or takes the last one back out. */
  private readonly handleDraftKey = (event: KeyboardEvent): void => {
    if (this.mode !== 'multiple') {
      return
    }
    const held = this.held
    const draft = this.read(this.draft.trim())
    if (event.key === 'Enter' && draft !== '') {
      event.preventDefault()
      if (!held.includes(draft)) {
        this.requestPicked([...held, draft].sort().join(','))
      }
      this.draft = ''
    } else if (event.key === 'Backspace' && this.draft === '' && held.length > 0) {
      this.requestPicked(held.slice(0, -1).join(','))
    }
  }

  /** Takes one time back out of the set. */
  private readonly removeTime = (at: string): void => {
    this.requestPicked(this.held.filter((one) => one !== at).join(','))
  }

  /**
   * What the list should show, which is only ever a whole time.
   *
   * Half-typed input reaches here on every keystroke and `09:` is not a time.
   * Handing it on would clear the list's selection mid-word, which is the same
   * reason Date Input withholds a half-typed date from its calendar.
   */
  private get picked(): string {
    const held = this.held
    return held.length > 0 && held.every((one) => this.isTime(one)) ? held.join(',') : ''
  }

  private readonly handleInput = (event: Event): void => {
    event.stopPropagation()
    // Typing is editing, whatever the focus did. The field has to hold the value
    // while it is being changed, or a keystroke lands in a rendering.
    this.editing = true
    const typed = (event.target as HTMLInputElement).value
    if (this.mode === 'multiple') {
      this.draft = typed
      return
    }
    /* Stored as commas once every time in it is whole, and kept exactly as typed
       until then, which is the same rule Date Input follows: a form should
       submit `09:00,17:00` however the dash was written, and half-typed text
       must survive so the caret does not move mid-entry. */
    const held = typed
      .replace(/\s+[–-]\s+/g, ',')
      .split(',')
      .map((one) => one.trim())
      .filter(Boolean)
    const whole = held.length > 0 && held.every((one) => this.isTime(one))
    this.requestValue(whole ? held.join(',') : typed)
    this.restore()
  }

  private readonly handlePicked = (event: Event): void => {
    event.stopPropagation()
    /* A refusal reaches the list too, so it stays on the time the field holds.
       Measured before this: the field kept 09:30 while the list moved to the
       refused 10:00. */
    if (!this.requestPicked((event as HelixBeforeChangeEvent).detail.value)) {
      event.preventDefault()
      this.restore()
      return
    }
    this.restore()
    /* One time has nothing more to say, so the list gets out of the way. A range
       or a multiple has: the reader is still choosing, and shutting the list
       under them after the first pick is taking the control away mid-answer.

       Nor on the wheels, where turning the hour is a third of a time. Measured
       before this: choosing an hour closed the panel before a minute could be
       chosen. Enter or Escape closes them. */
    if (this.mode === undefined && this.picker !== 'wheels') {
      this.requestOpen(false)
      this.updateComplete.then(() => this.returnFocus())
    }
  }

  /**
   * Enter on the wheels closes the panel, the time on them being the answer.
   *
   * The list closes on the choice Enter makes. A wheel turned by the arrows
   * already holds its time, so Enter there chooses nothing new, and this is
   * what says the reader is done.
   */
  private readonly handleWheelEnter = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && this.picker === 'wheels' && this.open) {
      event.preventDefault()
      this.requestOpen(false)
      this.returnFocus()
    }
  }

  /**
   * Each time, where `mode` holds several, sent one entry each.
   *
   * Text that is no time, such as `2:45 P`, is sent as one empty entry, as a
   * native time field sends a time it cannot read. Measured before this: a
   * range written `09:00/10:30` was invalid and submitted the text.
   */
  protected override get answers(): readonly string[] | undefined {
    if (this.mode !== undefined) {
      const held = this.held
      return held.every((one) => this.isTime(one)) ? held : ['']
    }
    const text = this.value.trim()
    return text === '' || this.isTime(text) ? undefined : ['']
  }
  /** What is wrong with the times, which the text input cannot say. */
  protected override validate(): string | readonly [keyof ValidityStateFlags, string] {
    /* Checked here rather than left to the input, which is `text` and has no
       idea what a time is.

       **Every time in the value, not the value itself**, which is what Date
       Input's own note says and what this was missing. A range holds two and a
       multiple holds any number, joined by commas, so `isClockValue` on the whole
       string answered false for every range that had been filled in: two times
       chosen from the picker reported "Enter a time as HH:mm" and the field went
       invalid on being used correctly. */
    const held = this.held
    if (held.length > 0 && !held.every((one) => this.isTime(one))) {
      return (
        this.badInputMessage ||
        formatWords(this, 'unreadableMessage', {
          example: this.written(this.seconds ? '14:30:15' : '14:30'),
          mode: this.mode ?? 'single',
          shape: this.seconds ? 'HH:mm:ss' : 'HH:mm',
        })
      )
    }
    /* Each fault across every time, in the order the messages take, so a
       range with one end early and the other late says it is early. */
    const rules = { disableTimes: this.disableTimes, max: this.max, min: this.min }
    const faults = held.map((one) => timeFault(one, rules))
    /* With the flag a native time input sets, as Time Picker reports them; a
       time barred by name is `badInput`, there being no native flag for one. */
    if (faults.includes('rangeUnderflow')) {
      return [
        'rangeUnderflow',
        formatWords(this, 'rangeUnderflowMessage', {
          min: writeClock(this.min, clockLocale(this.language, this.hourCycle), this.seconds),
        }),
      ]
    }
    if (faults.includes('rangeOverflow')) {
      return [
        'rangeOverflow',
        formatWords(this, 'rangeOverflowMessage', {
          max: writeClock(this.max, clockLocale(this.language, this.hourCycle), this.seconds),
        }),
      ]
    }
    if (faults.includes('unavailable')) {
      return this.unavailableMessage
    }
    if (this.mode === 'range' && held.length > 2) {
      return this.rangeLengthMessage
    }
    return ''
  }

  /**
   * The message for text that is no time, where `bad-input-message` is not
   * set. `{mode}` is `single`, `range`, or `multiple`, `{example}` is a time
   * written as the field writes one, `2:30 PM` in `en-US` and `14:30` in
   * `de-DE`, and `{shape}` is `HH:mm`, or `HH:mm:ss` with `seconds`.
   *
   * **The default names a time the field reads back.** It said "Enter a time
   * as HH:mm." to a reader whose field showed `2:30 PM`, and a pattern token
   * is words for a developer.
   */
  @words
  @property({ attribute: 'unreadable-message' })
  unreadableMessage =
    '{mode, select, single {Enter a time such as {example}.} other {Enter times such as {example}, separated by commas.}}'

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* After the mixin has shown the panel, not before. A set of wheels centers
       each on its own answer and cannot do it against a box of zero height,
       which is what everything in a `popover` measures until something shows
       it. The picker calls this on its own updates too; that one lands too
       early and is harmless, and this one is the call that works. */
    if (this.open) {
      this.partNamed<HTMLElement & { reveal?: () => void }>('picker')?.reveal?.()
    }
  }

  /**
   * The clock the field opens, behind a seam the styled tier can move.
   *
   * A method rather than an inline fragment, so a tier above can replace or
   * wrap it without reimplementing the template. The tag is interpolated rather
   * than written, so `tier` resolves it to this tier's own element.
   */
  protected renderPicker(): TemplateResult {
    return html`<${this.tag('time-picker')}
      part="picker"
      exportparts="column: picker-column, column-empty: picker-column-empty, column-error: picker-column-error,
        column-feedback: picker-column-feedback, column-filter-icon: picker-column-filter-icon,
        column-filter-mark: picker-column-filter-mark, column-hint: picker-column-hint,
        column-items: picker-column-items, column-label: picker-column-label,
        column-live: picker-column-live, column-loading: picker-column-loading, column-search: picker-column-search,
        column-search-field: picker-column-search-field, column-voice: picker-column-voice,
        column-voice-level: picker-column-voice-level, column-voice-level-canvas: picker-column-voice-level-canvas, column-voice-listening: picker-column-voice-listening, column-voice-status: picker-column-voice-status, columns: picker-columns, feedback: picker-feedback, hint: picker-hint,
        label: picker-label, list: picker-list,
        list-empty: picker-list-empty, list-error: picker-list-error, list-feedback: picker-list-feedback,
        list-filter-icon: picker-list-filter-icon, list-filter-mark: picker-list-filter-mark,
        list-hint: picker-list-hint, list-items: picker-list-items, list-label: picker-list-label,
        list-live: picker-list-live, list-loading: picker-list-loading, list-search: picker-list-search,
        list-search-field: picker-list-search-field, list-voice: picker-list-voice,
        list-voice-level: picker-list-voice-level, list-voice-level-canvas: picker-list-voice-level-canvas, list-voice-listening: picker-list-voice-listening, list-voice-status: picker-list-voice-status, now: picker-now, option: picker-option,
        option-between: picker-option-between, option-item-active: picker-option-item-active,
        option-item-selected: picker-option-item-selected,
        option-description: picker-option-description, option-item: picker-option-item,
        option-label: picker-option-label, option-text: picker-option-text"
      ?invalid=${this.resolvedFeedback !== ''}
      mode=${this.mode ?? nothing}
      picker=${this.picker ?? nothing}
      disable-times=${this.disableTimes || nothing}
      manual
      label=${hostWords(this, slottedWords(this, ['label']) || this.label) || 'Time'}
      hour-cycle=${this.hourCycle ?? nothing}
      locale=${handedLocale(this) || nothing}
      max=${this.max}
      min=${this.min}
      now-label=${this.nowLabel}
      ?seconds=${this.seconds}
      ?show-now=${this.showNow}
      step=${this.step}
      .value=${this.picked}
      @helix-before-change=${this.handlePicked}
      @change=${this.stopInner}
      @input=${this.stopInner}
    ></${this.tag('time-picker')}>`
  }

  /* Date Input's tag is this one under its own part name, with its own label
     on the remove control, which is why neither is the mixin's. */
  /**
   * One chosen time, as a tag, behind a seam the styled tier can move.
   *
   * A method rather than an inline fragment, so a tier above can replace or
   * wrap it without reimplementing the template. The tag is interpolated rather
   * than written, so `tier` resolves it to this tier's own element.
   */
  protected renderTag(at: string): TemplateResult {
    return html`<${this.tag('tag')}
                  part="time"
      exportparts="cell: time-cell, dismiss: time-dismiss, dismiss-mark: time-dismiss-mark, label: time-label, link: time-link, start: time-start"
                  dismissible
                  dismiss-label=${formatWords(this, 'removeLabel', { name: this.written(at) })}
                  ?disabled=${this.isDisabled}
                  @helix-dismiss=${(event: Event) => {
                    event.stopPropagation()
                    this.removeTime(at)
                  }}
                  >${this.written(at)}</${this.tag('tag')}
                >`
  }

  /* Date Input has this seam with its own icon, and it is not the mixin's
     because a part a mixin renders is credited to every host that applies it,
     Color Input included, whose trigger is a swatch. */
  /**
   * The mark on the button that opens the clock, behind a seam.
   *
   * Slot fallback, so a consumer replaces it by slotting; and a method, so the
   * tier above replaces it by overriding.
   *
   * **A named import rather than `<helix-headless-icon>`**, on three counts.
   * `Icon` indexes the whole icon map at runtime, `icons[this.name]`, and no
   * bundler can shake a runtime lookup, so every consumer of any component that
   * renders one ships all 50kB of path data; a named import ships one path. The
   * import is checked when the package compiles, where a `name` string is
   * checked only by a later name lookup. And `Icon` is not registered on the
   * headless tier at all, which registers `helix-headless-icon`, so a headless
   * consumer gets an inert unknown element and no mark whatsoever.
   */
  protected renderTrigger(): TemplateResult {
    return html`<slot name="trigger"><svg aria-hidden="true" fill="currentColor" part="trigger-icon" viewBox=${clock.viewBox}>
        ${unsafeSVG(clock.content)}
      </svg></slot>`
  }

  /** Whether there is a clear button on screen right now. */
  private get showsClear(): boolean {
    return this.clearable && this.value !== '' && !this.isDisabled && !this.readOnly
  }

  /**
   * Empties the field, through `requestValue` so a consumer who owns the
   * value decides, then says `change` and `helix-clear` and puts focus back
   * in the field, the button having gone.
   */
  private readonly handleClear = (): void => {
    if (this.value !== '' && this.requestValue('')) {
      this.announceChange()
      this.dispatchEvent(new HelixClearEvent())
    }
    void this.updateComplete.then(() => this.returnFocus())
  }

  /** The cross on the clear button, behind a seam a tier can move. */
  protected renderClearIcon(): TemplateResult {
    return html`<slot name="clear-icon">${drawIcon(x)}</slot>`
  }

  /** The line of text the times are typed into, where the field shows no segments. */
  private renderControl(): TemplateResult {
    return html`<input
      part="control"
      id=${this.controlId}
      type="text"
      .value=${this.display}
      name=${this.name || nothing}
      placeholder=${
        this.mode === 'multiple' && this.held.length > 0 ? nothing : this.placeholder || nothing
      }
      role="combobox"
      aria-controls="surface"
      aria-expanded=${this.open ? 'true' : 'false'}
      aria-haspopup="dialog"
      autocomplete=${this.autocomplete || nothing}
      aria-describedby=${this.describedBy ?? nothing}
      aria-invalid=${this.invalidity ?? nothing}
      ?disabled=${this.isDisabled}
      ?readonly=${this.readOnly}
      ?required=${this.required}
      @blur=${this.handleBlur}
      @change=${this.handleTextCommit}
      @focus=${this.handleFocus}
      @input=${this.handleInput}
      @keydown=${this.handleDraftKey}
      @keypress=${this.handleKeypress}
    />`
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('blank', this.value === '')
  }

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
      <div part="field" @keydown=${this.handleKeydown}>
        <slot name="start"></slot>
        ${
          this.mode === 'multiple'
            ? this.renderTokenRow(
                this.shownTimes.map((at) => this.renderTag(at)),
                this.restCount,
              )
            : nothing
        }
        ${this.segmentsShown ? this.renderSegments() : this.renderControl()}
        <slot name="end"></slot>
        ${
          this.showsClear
            ? html`<button
                part="clear"
                type="button"
                aria-label=${this.clearLabel}
                @click=${this.handleClear}
              >
                ${this.renderClearIcon()}
              </button>`
            : nothing
        }
        <button
          part="trigger"
          type="button"
          aria-controls="surface"
          aria-disabled=${this.readOnly ? 'true' : nothing}
          aria-expanded=${this.open ? 'true' : 'false'}
          aria-haspopup="dialog"
          aria-label=${this.triggerLabel}
          ?disabled=${this.isDisabled}
          @click=${this.handleTriggerClick}
        >
          ${this.renderTrigger()}
        </button>
      </div>

      ${
        /* A dialog named by the trigger's words, as on Date Input and Color
           Input. The trigger said it opened a listbox, and the surface had no
           role at all; the list inside is in another shadow root, which no
           IDREF reaches, and the wheels are three lists. */
        ''
      }
      <div
        part="surface"
        id="surface"
        role="dialog"
        aria-label=${this.triggerLabel}
        popover="manual"
        ?hidden=${!this.open}
        @keydown=${this.handleWheelEnter}
      >
        <slot name="panel-header"></slot>
        ${this.renderPicker()}
        <slot name="panel-footer"></slot>
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }

  /* Time Picker holds this pair identically and Date Input holds it over a
     different conversion. Why all four write it out rather than sharing a
     mixin is argued once, on `value-as.ts`. */
  /**
   * The value as a `Date` on January 1, 1970 UTC, or `null` while there is no
   * time.
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
    'helix-headless-time-input': HelixHeadlessTimeInput
  }
}
