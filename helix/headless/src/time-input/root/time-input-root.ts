import {
  AriaForwardController,
  valueAsTime as asTime,
  customElement,
  fillTemplate,
  timeAsValue as fromTime,
  type HelixBeforeChangeEvent,
  HelixFormElement,
  isTimeValue,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
  MixinPickerEditing,
  MixinPickerField,
  MixinTokens,
  valueAsMinutes,
  writeTime,
} from '@fusion.dev/helix-core'
import { clock } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html } from 'lit/static-html.js'
/* Base elements here, styled ones in the styled file. The arrangement Date
   Input has with its calendar. */
import '../../icon/index.js'
import '../../tag/index.js'
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
 * The value is always `HH:mm` on a 24-hour clock, because that is what the form
 * submits, what `min` and `max` compare against, and what sorts correctly as a
 * string. While idle, the field shows the time in the user's locale format.
 * Once the caret is in the field, it shows the value itself, because a
 * formatted time such as `2:30 PM` cannot be typed back and `Intl` has no
 * parser for it.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases TimeField, InputTime
 * @documentation https://fusion.dev/helix/components/time-input
 *
 * @slot feedback - The message that says what is wrong with the value.
 * @slot hint - Help under the field.
 * @slot trigger - The icon on the field that shows a list opens.
 *
 * @event {Event} change - Fired after the value changes.
 * @event {HelixBeforeChangeEvent} helix-before-change - Fired before the time changes. Cancelable: canceling it stops the change and leaves the decision to you.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before the list closes. Cancelable: canceling it keeps the list open and leaves the decision to you.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the list opens. Cancelable: canceling it keeps the list closed and leaves the decision to you.
 * @event {Event} input - Fired after the value changes.
 * @event {Event} toggle - Fired after the list opens or closes, with `newState` and `oldState`.
 *
 * @csspart control - The text input.
 * @csspart feedback - The message that says what is wrong with the value.
 * @csspart field - The box that holds the text and the trigger.
 * @csspart hint - Help under the field, while nothing is wrong.
 * @csspart label - The label above the field.
 * @csspart picker - The time picker inside the panel.
 * @csspart picker-column - One column of the picker.
 * @csspart picker-column-empty - The text shown when the filter hides every option.
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
 * @csspart picker-columns - The row of columns, in `wheels`.
 * @csspart picker-list - The listbox holding the times, in `list`.
 * @csspart picker-list-empty - The text shown when the filter hides every option.
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
 * @csspart picker-option - One time in the picker. Carries `data-between` inside a range.
 * @csspart picker-option-between - A time inside a chosen range, between its two ends. Set together with `picker-option`.
 * @csspart picker-option-description - The caption under the label, when there is one.
 * @csspart picker-option-item - The row.
 * @csspart picker-option-item-active - The row the keyboard is on.
 * @csspart picker-option-item-selected - The row of a chosen time: the one time, or either end of a range.
 * @csspart picker-option-label - The option's label.
 * @csspart picker-option-text - The label and the caption, as one column.
 * @csspart rest - The count of times held beyond the ones shown. A `<button>` with `expandable`, and a `<span>` without it.
 * @csspart surface - The floating panel.
 * @csspart tags - The row the times sit in.
 * @csspart time - One held time, as a tag, in `multiple`.
 * @csspart time-dismiss - The remove button, when `dismissible`.
 * @csspart time-dismiss-mark - The default icon on the remove button, shown when none is slotted.
 * @csspart time-start - The category before the label.
 * @csspart trigger - The control that opens the list.
 * @csspart trigger-icon - The icon on the button that opens the clock.
 *
 * @cssstate invalid - The control has an error to show, from the browser's validation or from your `feedback`.
 * @cssstate open - While the clock is open.
 */
@customElement('helix-headless-time-input')
export class HelixHeadlessTimeInput extends MixinPickerEditing(
  MixinPickerField(
    MixinControllerOpen(MixinTokens(MixinControllerValue(MixinField(HelixFormElement)))),
  ),
) {
  /* A consumer's `aria-describedby` names ids in their own tree and the control
     is in this shadow root, so the reference has to be carried down as an
     element rather than copied as an id. See `AriaForwardController`: measured
     in Chrome's own tree, the host held the description and the control the
     reader is actually on was exposed without it. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('control'),
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
   * Language tag the times are written in.
   *
   * Absent uses the runtime's own.
   */
  @property()
  locale = ''

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
   * Placeholder text shown before a time is entered.
   */
  @property()
  placeholder = 'HH:mm'

  /**
   * The message shown when a range holds more than two times.
   *
   * **Every sentence a control raises in the browser's bubble is a property**,
   * so a form in another language speaks it. Absent is the control's own
   * sentence, in English.
   */
  @property({ attribute: 'range-length-message' })
  rangeLengthMessage?: string

  /**
   * The message shown when a time is after `max`, with `{max}` filled in as
   * the field displays it.
   */
  @property({ attribute: 'range-overflow-message' })
  rangeOverflowMessage?: string

  /**
   * The message shown when a time is before `min`, with `{min}` filled in as
   * the field displays it.
   */
  @property({ attribute: 'range-underflow-message' })
  rangeUnderflowMessage?: string

  /**
   * The name of the button that removes one time, with `{name}` filled in.
   *
   * **The name goes in**, so a row of them is heard as which one each
   * removes rather than as "Remove" said once per time.
   */
  @property({ attribute: 'remove-label' })
  removeLabel = 'Remove {name}'

  /**
   * How far apart the offered times are, in minutes.
   */
  @property({ type: Number })
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
  @property({ attribute: 'trigger-label' })
  triggerLabel = 'Choose a time'

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

  /** One time, written the way `time-style` asks for. */
  private written(at: string): string {
    return this.timeStyle === 'iso' || !isTimeValue(at) ? at : writeTime(at, this.locale)
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

  /** Adds what was typed to the set, or takes the last one back out. */
  private readonly handleDraftKey = (event: KeyboardEvent): void => {
    if (this.mode !== 'multiple') {
      return
    }
    const held = this.held
    if (event.key === 'Enter' && isTimeValue(this.draft)) {
      event.preventDefault()
      if (!held.includes(this.draft)) {
        this.requestValue([...held, this.draft].sort().join(','))
      }
      this.draft = ''
    } else if (event.key === 'Backspace' && this.draft === '' && held.length > 0) {
      this.requestValue(held.slice(0, -1).join(','))
    }
  }

  /** Takes one time back out of the set. */
  private readonly removeTime = (at: string): void => {
    this.requestValue(this.held.filter((one) => one !== at).join(','))
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
    return held.length > 0 && held.every(isTimeValue) ? held.join(',') : ''
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
    const whole = held.length > 0 && held.every(isTimeValue)
    this.requestValue(whole ? held.join(',') : typed)
    this.restore()
  }

  private readonly handlePicked = (event: Event): void => {
    event.stopPropagation()
    this.requestValue((event as HelixBeforeChangeEvent).detail.value)
    this.restore()
    /* One time has nothing more to say, so the list gets out of the way. A range
       or a multiple has: the reader is still choosing, and shutting the list
       under them after the first pick is taking the control away mid-answer. */
    if (this.mode === undefined) {
      this.requestOpen(false)
      this.updateComplete.then(() => this.returnFocus())
    }
  }

  /** Each time, where `mode` holds several, sent one entry each. */
  protected override get answers(): readonly string[] | undefined {
    return this.mode === undefined ? undefined : this.held
  }
  /** What is wrong with the times, which the text input cannot say. */
  protected override validate(): string {
    /* Checked here rather than left to the input, which is `text` and has no
       idea what a time is.

       **Every time in the value, not the value itself**, which is what Date
       Input's own note says and what this was missing. A range holds two and a
       multiple holds any number, joined by commas, so `isTimeValue` on the whole
       string answered false for every range that had been filled in: two times
       chosen from the picker reported "Enter a time as HH:mm" and the field went
       invalid on being used correctly. */
    const held = this.held
    const floor = valueAsMinutes(this.min) ?? 0
    const ceiling = valueAsMinutes(this.max) ?? 1439
    if (held.length > 0 && !held.every(isTimeValue)) {
      return (
        this.badInputMessage ||
        (this.mode === undefined
          ? 'Enter a time as HH:mm.'
          : 'Enter times as HH:mm, separated by commas.')
      )
    }
    if (held.some((one) => (valueAsMinutes(one) ?? 0) < floor)) {
      return fillTemplate(this.rangeUnderflowMessage || 'Choose a time at or after {min}.', {
        min: writeTime(this.min, this.locale),
      })
    }
    if (held.some((one) => (valueAsMinutes(one) ?? 0) > ceiling)) {
      return fillTemplate(this.rangeOverflowMessage || 'Choose a time at or before {max}.', {
        max: writeTime(this.max, this.locale),
      })
    }
    if (this.mode === 'range' && held.length > 2) {
      return this.rangeLengthMessage || 'A range is two times.'
    }
    return ''
  }

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
  variant?: 'list' | 'wheels'

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
      exportparts="column: picker-column, column-empty: picker-column-empty,
        column-feedback: picker-column-feedback, column-filter-icon: picker-column-filter-icon,
        column-filter-mark: picker-column-filter-mark, column-hint: picker-column-hint,
        column-items: picker-column-items, column-label: picker-column-label,
        column-live: picker-column-live, column-loading: picker-column-loading, column-search: picker-column-search,
        column-search-field: picker-column-search-field, columns: picker-columns, list: picker-list,
        list-empty: picker-list-empty, list-feedback: picker-list-feedback,
        list-filter-icon: picker-list-filter-icon, list-filter-mark: picker-list-filter-mark,
        list-hint: picker-list-hint, list-items: picker-list-items, list-label: picker-list-label,
        list-live: picker-list-live, list-loading: picker-list-loading, list-search: picker-list-search,
        list-search-field: picker-list-search-field, option: picker-option,
        option-between: picker-option-between, option-item-active: picker-option-item-active,
        option-item-selected: picker-option-item-selected,
        option-description: picker-option-description, option-item: picker-option-item,
        option-label: picker-option-label, option-text: picker-option-text"
      ?invalid=${this.resolvedFeedback !== ''}
      mode=${this.mode ?? nothing}
      variant=${this.variant ?? nothing}
      label=${this.label || 'Time'}
      locale=${this.locale || nothing}
      max=${this.max}
      min=${this.min}
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
      exportparts="dismiss: time-dismiss, dismiss-mark: time-dismiss-mark, start: time-start"
                  dismissible
                  dismiss-label=${fillTemplate(this.removeLabel, { name: this.written(at) })}
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

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
      <div part="field" @keydown=${this.handleKeydown}>
        ${
          this.mode === 'multiple'
            ? this.renderTokenRow(
                this.shownTimes.map((at) => this.renderTag(at)),
                this.restCount,
              )
            : nothing
        }
        <input
          part="control"
          id=${this.controlId}
          type="text"
          .value=${this.display}
          name=${this.name || nothing}
          placeholder=${
            this.mode === 'multiple' && this.held.length > 0 ? nothing : this.placeholder || nothing
          }
          autocomplete=${this.autocomplete || nothing}
          aria-describedby=${this.describedBy ?? nothing}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readOnly}
          ?required=${this.required}
          @blur=${this.handleBlur}
          @focus=${this.handleFocus}
          @input=${this.handleInput}
          @keydown=${this.handleDraftKey}
        />
        <button
          part="trigger"
          type="button"
          aria-controls="surface"
          aria-expanded=${this.open ? 'true' : 'false'}
          aria-haspopup="listbox"
          aria-label=${this.triggerLabel}
          ?disabled=${this.isDisabled}
          @click=${() => this.toggleOpen()}
        >
          ${this.renderTrigger()}
        </button>
      </div>

      <div part="surface" id="surface" popover="manual" ?hidden=${!this.open}>
        ${this.renderPicker()}
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
