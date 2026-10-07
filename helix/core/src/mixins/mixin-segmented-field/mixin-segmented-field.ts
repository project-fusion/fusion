import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { HelixFormElement } from '../../helix-form-element/helix-form-element.js'
import type { MonthSystem } from '../../utils/calendar/calendar.js'
import {
  isPartial,
  isTwelveHourLayout,
  type SegmentedKind,
  type SegmentKind,
  type SegmentOptions,
  type SegmentSlot,
  type Segments,
  segmentKey,
  segmentLayout,
  segmentName,
  segmentRange,
  segmentsOf,
  segmentsValue,
  segmentText,
  segmentValueText,
  shownValue,
} from '../../utils/date-segments/date-segments.js'
import { inlineStep } from '../../utils/inline-step/inline-step.js'
import { latinDigits } from '../../utils/number-format/number-format.js'
import { appleTouch } from '../../utils/platform/platform.js'
import { verdictFlags } from '../../utils/verdict-flags/verdict-flags.js'
import { formatWords, words } from '../../words/words.js'
import type { MixinControllerOpenInterface } from '../mixin-controller-open/mixin-controller-open.js'
import type { MixinControllerValueInterface } from '../mixin-controller-value/mixin-controller-value.js'
import type { MixinFieldInterface } from '../mixin-field/mixin-field.js'
import type { MixinPickerFieldInterface } from '../mixin-picker-field/mixin-picker-field.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/** What this is applied over: a picker field, which `MixinPickerField` makes. */
type SegmentedBase = HelixFormElement &
  MixinControllerOpenInterface &
  MixinControllerValueInterface &
  MixinFieldInterface &
  MixinPickerFieldInterface

/**
 * The public surface `MixinSegmentedField` adds.
 *
 * Declared separately because TypeScript cannot emit declarations for an
 * anonymous class that has private members (TS4094).
 */
export declare class MixinSegmentedFieldInterface {
  /**
   * What a row of segments reports when the field is required and every
   * segment is empty, where `value-missing-message` is not set. `{kind}` is
   * `date` or `time`.
   */
  emptyMessage: string

  /** What a screen reader hears for a segment with nothing in it. */
  emptySegmentLabel: string

  /**
   * What a row of segments reports while some segments are set and others
   * are not, where `bad-input-message` is not set. `{kind}` is `date` or
   * `time`.
   */
  incompleteMessage: string

  /**
   * Whether the field is a row of segments, one for each part of the date or
   * time, in place of a line of text.
   */
  segmented: boolean

  /**
   * What a screen reader hears before the segments of a range's first date or
   * time, after each segment's own name.
   */
  rangeStartLabel: string

  /** What a screen reader hears before the segments of a range's second date or time. */
  rangeEndLabel: string

  /** Whether the segments are drawn: `segmented`, where the family can hold them. */
  protected get segmentsShown(): boolean

  /** How many rows of segments the value takes: two for a range, one otherwise. */
  protected get segmentGroups(): number

  /** The row of segments, the group a description is carried to, or `null` while none is drawn. */
  protected get segmentGroup(): HTMLElement | null

  /** Whether this family can show segments in its current shape. */
  protected get segmentable(): boolean

  /** A date or a time. */
  protected get segmentedKind(): SegmentedKind

  /** The locale the segments are laid out and named in. */
  protected get segmentLocale(): string

  /** The clock and the seconds a time is laid out with. */
  protected get segmentOptions(): SegmentOptions

  /** The calendar a date's parts are counted in, or `undefined` for the Gregorian calendar. */
  protected get segmentSystem(): MonthSystem | undefined

  /** The row of segments, in the locale's order, with what it writes between them. */
  protected renderSegments(): TemplateResult
}

/**
 * Grafts the segmented field React Aria's DateField and TimeField are, and Web
 * Awesome's time input has, onto a picker field: one `spinbutton` for each part
 * of the date or the time, in the order the locale writes them.
 *
 * **Typing into a text field asks the reader to know the format.** Date Input
 * and Time Input read ISO, `2026-08-04` and `14:30`, because `Intl` formats and
 * does not parse, and a reader in Germany who types `4.8.2026` is refused. A
 * segment needs no format: the month is a month, set with digits or the arrow
 * keys, and the layout puts it where the locale does, so the field reads
 * `04.08.2026` in German and `08/04/2026` in English with nothing to parse.
 *
 * **What a segment does with a key**, which is React Aria's: digits fill it and
 * move on once it cannot take another, Up and Down step it and wrap, Page Up
 * and Page Down step it by a page, a week of days, five years or fifteen
 * minutes, Home and End go to its ends, Backspace and Delete empty it, Left and Right move between
 * segments along the line of text, and Alt+Down opens the picker. Each segment
 * is a tab stop, as each is in React Aria.
 *
 * **The value is whole or empty.** A date with no year is no date, so the value
 * stays empty while any segment is, and the field reports `badInput` as a
 * native date input does with a half-typed date. The arithmetic is
 * `date-segments`, so this draws and listens and nothing else.
 *
 * **Opt-in, with `segmented`**, because the text field is what every example and
 * every form already holds, and a row of segments draws differently.
 */
export const MixinSegmentedField = <T extends Constructor<SegmentedBase>>(Base: T) => {
  // JSDoc is duplicated from MixinSegmentedFieldInterface deliberately. The
  // interface is what TypeScript consumers see; this class is what the manifest
  // analyzer reads when resolving inherited members into dependent packages.
  class SegmentedFieldElement extends Base {
    /**
     * The key the segments' words are registered under: the host's own,
     * which each family names with its styled tag, `static words =
     * 'helix-date-input'`. A host with none reads its tag name.
     */
    static words = ''

    /**
     * What a row of segments reports when the field is required and every
     * segment is empty, where `value-missing-message` is not set. `{kind}` is
     * `date` or `time`.
     */
    @words
    @property({ attribute: 'empty-message' })
    emptyMessage = '{kind, select, date {Enter a date.} other {Enter a time.}}'

    /**
     * What a screen reader hears for a segment with nothing in it, which a
     * sighted reader sees as dashes.
     */
    @words
    @property({ attribute: 'empty-segment-label' })
    emptySegmentLabel = 'Empty'

    /**
     * What a row of segments reports while some segments are set and others
     * are not, where `bad-input-message` is not set. `{kind}` is `date` or
     * `time`.
     */
    @words
    @property({ attribute: 'incomplete-message' })
    incompleteMessage = '{kind, select, date {Enter a whole date.} other {Enter a whole time.}}'

    /**
     * What a screen reader hears before the segments of a range's second date
     * or time, after each segment's own name.
     */
    @words
    @property({ attribute: 'range-end-label' })
    rangeEndLabel = 'End'

    /**
     * What a screen reader hears before the segments of a range's first date
     * or time, after each segment's own name: "month, Start, Stay".
     */
    @words
    @property({ attribute: 'range-start-label' })
    rangeStartLabel = 'Start'

    /**
     * Whether the field is a row of segments, one for each part of the date or
     * time, in place of a line of text.
     *
     * Each segment is set with digits or the arrow keys, in the order the
     * locale writes them, so a reader types a date the way they write one and
     * no format has to be read back. The picker still opens from the trigger
     * and with Alt+Down.
     */
    @property({ type: Boolean })
    segmented = false

    /**
     * The parts set so far in each row, which may be fewer than a whole
     * value: one row, or two for a range.
     */
    @state()
    private parts: Segments[] = [{}]

    /** The digits typed into the segment that has focus, for a number that runs on. */
    private typed = ''

    /** Whether the value is moving because a segment moved it. */
    private own = false

    /**
     * Whether this is an iPhone or an iPad, read once on the client, where a
     * segment is a `textbox` and not a `spinbutton`: VoiceOver on iOS cannot
     * focus a spin button, which React Aria's date segments and Number Input
     * answer the same way. A server has no navigator and draws spin buttons.
     */
    private readonly touchApple = appleTouch(
      typeof navigator === 'undefined' ? undefined : navigator,
    )

    /** The value when focus came into the segments, so leaving them says `change` once. */
    private entered: string | undefined = undefined

    /** The segment Alt+Down opened the picker from, which focus goes back to. */
    private opener: HTMLElement | undefined = undefined

    /**
     * Puts focus back on the segment the picker was opened from, as the
     * trigger takes it back to the field. Measured before this: Escape after
     * Alt+Down on AM/PM put focus on the hour.
     */
    protected override returnFocus(): void {
      const opener = this.opener
      this.opener = undefined
      if (opener?.isConnected && this.segmentsShown) {
        this.returning = true
        opener.focus()
        this.returning = false
        return
      }
      super.returnFocus()
    }

    /** Whether this family can show segments in its current shape. */
    protected get segmentable(): boolean {
      return true
    }

    /** Whether the segments are drawn: `segmented`, where the family can hold them. */
    protected get segmentsShown(): boolean {
      return this.segmented && this.segmentable
    }

    /** How many rows of segments the value takes: two for a range, one otherwise. */
    protected get segmentGroups(): number {
      return 1
    }

    /** The value the rows add up to: each row's, joined by commas, or empty while any row is not whole. */
    private joined(rows: readonly Segments[]): string {
      const values = rows.map((one) =>
        segmentsValue(this.segmentedKind, one, this.layout, this.segmentSystem),
      )
      return values.some((one) => one === '') ? '' : values.join(',')
    }

    /** The rows a value names, one per row, empty where it names none. */
    private rowsOf(value: string): Segments[] {
      const values = this.segmentGroups > 1 ? value.split(',') : [value]
      return Array.from({ length: this.segmentGroups }, (_, row) =>
        segmentsOf(this.segmentedKind, (values[row] ?? '').trim(), this.segmentSystem),
      )
    }

    /** A date or a time. Each family says which. */
    protected get segmentedKind(): SegmentedKind {
      return 'date'
    }

    /** The locale the segments are laid out and named in. */
    protected get segmentLocale(): string {
      return ''
    }

    /** The clock and the seconds a time is laid out with. */
    protected get segmentOptions(): SegmentOptions {
      return {}
    }

    /** The calendar a date's parts are counted in, or `undefined` for the Gregorian calendar. */
    protected get segmentSystem(): MonthSystem | undefined {
      return undefined
    }

    private get layout(): SegmentSlot[] {
      return segmentLayout(this.segmentedKind, this.segmentLocale, this.segmentOptions)
    }

    /** The first segment, which a label and `focus()` land on. */
    protected override get anchor(): HTMLElement | null {
      if (this.segmentsShown) {
        return this.renderRoot?.querySelector<HTMLElement>('[part~="segment"]') ?? null
      }
      return super.anchor
    }

    /** The row of segments, the group a description is carried to, or `null` while none is drawn. */
    protected get segmentGroup(): HTMLElement | null {
      return this.renderRoot?.querySelector<HTMLElement>('[part="segments"]') ?? null
    }

    /** Every segment drawn, in order. */
    private get segmentElements(): HTMLElement[] {
      return [...(this.renderRoot?.querySelectorAll<HTMLElement>('[part~="segment"]') ?? [])]
    }

    /**
     * Takes the parts a key left, and the value they make where it moved.
     *
     * A refused value puts the parts back to what the value still says, the way
     * a refused text field puts its text back.
     */
    private take(row: number, next: Segments): void {
      this.parts = this.parts.map((one, index) => (index === row ? next : one))
      const value = this.joined(this.parts)
      if (value === this.value) {
        this.sync()
        return
      }
      this.own = true
      if (!this.requestValue(value)) {
        this.own = false
        this.parts = this.rowsOf(this.value)
      }
    }

    private moveFocus(from: HTMLElement, by: number): void {
      const all = this.segmentElements
      all[all.indexOf(from) + by]?.focus()
    }

    /**
     * Applies an editing key to the segment, the arrows, Backspace, a digit or
     * a letter, and says whether it edited anything.
     */
    private edit(element: HTMLElement, key: string): boolean {
      if ((this as { readOnly?: boolean }).readOnly || this.isDisabled) {
        return false
      }
      const row = Number(element.dataset.row ?? 0)
      const edit = segmentKey(key, {
        kind: element.dataset.segment as SegmentKind,
        locale: this.segmentLocale,
        segments: this.parts[row] ?? {},
        system: this.segmentSystem,
        twelve: isTwelveHourLayout(this.layout),
        typed: this.typed,
      })
      if (!edit) {
        return false
      }
      this.typed = edit.typed
      this.take(row, edit.segments)
      if (edit.advance) {
        this.moveFocus(element, 1)
      }
      return true
    }

    /** What the segment's text was when a composition started to write into it. */
    private composing: [Node, string | null][] = []

    /**
     * Text a touch keyboard writes into a segment, which arrives as input and
     * not as a key: an on-screen keyboard sends `Unidentified` for its keys,
     * so a digit tapped on a phone is read here, as React Aria's segments read
     * it. Every input is canceled, so the segment holds only what the field
     * draws in it.
     */
    private readonly handleSegmentBeforeInput = (event: InputEvent): void => {
      const element = event.currentTarget as HTMLElement
      if (event.inputType === 'insertCompositionText') {
        /* A composition cannot be canceled, so the text it writes is put
           back once it has been written. */
        this.composing = [...element.childNodes].map((node) => [node, node.nodeValue])
        return
      }
      event.preventDefault()
      if (
        event.inputType === 'deleteContentBackward' ||
        event.inputType === 'deleteContentForward'
      ) {
        this.typed = ''
        this.edit(element, 'Backspace')
        return
      }
      for (const character of latinDigits(event.data ?? '')) {
        this.edit(element, character)
      }
    }

    private readonly handleSegmentInput = (event: Event): void => {
      const element = event.currentTarget as HTMLElement
      const { data, inputType } = event as InputEvent
      if (inputType !== 'insertCompositionText') {
        return
      }
      const kept = new Set(this.composing.map(([node]) => node))
      for (const node of [...element.childNodes]) {
        if (!kept.has(node)) {
          node.remove()
        }
      }
      for (const [node, text] of this.composing) {
        node.nodeValue = text
      }
      this.composing = []
      /* Android sends some letters as a composition, the meridiem's A and P
         among them. */
      if (element.dataset.segment === 'dayPeriod' && data) {
        this.edit(element, data.slice(-1))
      }
    }

    /**
     * Keeps the caret at the start of the segment with focus, where Chromium
     * fires input for a typed key, and where Android's keyboard does not
     * compose over the segment's text. A selection already there, or outside
     * the segment, is left alone.
     */
    private readonly collapseSelection = (): void => {
      const root = this.renderRoot as ShadowRoot | undefined
      const active = this.segmentElements.find((one) => one === root?.activeElement)
      const selection = document.getSelection()
      const at = selection?.anchorNode
      if (
        active &&
        selection &&
        at &&
        active.contains(at) &&
        !(at === active && selection.isCollapsed && selection.anchorOffset === 0)
      ) {
        selection.collapse(active, 0)
      }
    }

    private readonly handleSegmentKeydown = (event: KeyboardEvent): void => {
      const element = event.currentTarget as HTMLElement
      if (event.key === 'ArrowDown' && event.altKey) {
        event.preventDefault()
        this.opener = element
        this.handleTriggerClick()
        return
      }
      const along = inlineStep(this, event.key)
      if (along !== 0) {
        event.preventDefault()
        this.typed = ''
        this.moveFocus(element, along)
        return
      }
      if (event.key === 'Tab') {
        this.typed = ''
        /* A reader moving through the form passes an open panel by, as Tab
           out of the text does. */
        if (this.open) {
          this.requestOpen(false)
        }
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        this.typed = ''
        return
      }
      if (this.edit(element, latinDigits(event.key))) {
        event.preventDefault()
      }
    }

    /**
     * Focus coming into the segments from outside them, and leaving them,
     * which is when a typed value has settled and `change` is said.
     */
    private readonly handleSegmentsFocusIn = (event: FocusEvent): void => {
      this.typed = ''
      document.getSelection()?.collapse(event.target as Node, 0)
      if (!this.segmentElements.includes(event.relatedTarget as HTMLElement)) {
        this.entered = this.value
        document.addEventListener('selectionchange', this.collapseSelection)
      }
    }

    private readonly handleSegmentsFocusOut = (event: FocusEvent): void => {
      if (this.segmentElements.includes(event.relatedTarget as HTMLElement)) {
        return
      }
      document.removeEventListener('selectionchange', this.collapseSelection)
      if (this.entered !== undefined && this.entered !== this.value) {
        this.announceChange()
      }
      this.entered = undefined
    }

    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed)
      /* A value from anywhere else, a pick in the calendar, a script or a
         moved `default-value`, is what the segments show. One a segment made
         is already there, and re-reading it would clear the parts of a
         half-typed date. Compared rather than read off `changed`, because a
         moved `default-value` moves the value without naming it there. */
      const own = this.own
      this.own = false
      if (
        !own &&
        this.segmentsShown &&
        (this.parts.length !== this.segmentGroups || this.joined(this.parts) !== this.value)
      ) {
        this.parts = this.rowsOf(this.value)
      }
    }

    /** A reset empties a half-typed date too, which the value alone does not show. */
    override formResetCallback(): void {
      super.formResetCallback()
      this.parts = this.rowsOf('')
      this.typed = ''
    }

    /**
     * A press on the label puts focus in the first segment, as a press on a
     * label does for the text it names: a `<label for>` reaches only a native
     * control, and the segments are a group of spans.
     */
    private readonly handleLabelPress = (event: MouseEvent): void => {
      if (!this.segmentsShown || this.isDisabled) {
        return
      }
      const label = this.renderRoot?.querySelector?.('[part~="label"]')
      if (label && event.composedPath().includes(label)) {
        this.anchor?.focus()
      }
    }

    override connectedCallback(): void {
      super.connectedCallback()
      this.addEventListener('click', this.handleLabelPress)
    }

    override disconnectedCallback(): void {
      super.disconnectedCallback()
      this.removeEventListener('click', this.handleLabelPress)
      document.removeEventListener('selectionchange', this.collapseSelection)
    }

    /** @internal A row of segments counts against implicit submission, as a date input does. */
    protected override get blocksImplicitSubmission(): boolean {
      return this.segmentsShown || super.blocksImplicitSubmission
    }

    /**
     * Reports what a row of segments holds: the platform has no control here to
     * copy a verdict from, so the field says it, with the first segment as the
     * anchor the browser points its bubble at.
     */
    protected override sync(): void {
      super.sync()
      if (!this.segmentsShown) {
        return
      }
      const anchor = this.anchor ?? undefined
      /* A row half set, or one row whole and the other empty, which is half a
         range. */
      const partial =
        this.parts.some((one) =>
          isPartial(this.segmentedKind, one, this.layout, this.segmentSystem),
        ) ||
        (this.value === '' &&
          this.parts.some((one) => Object.values(one).some((part) => part !== undefined)))
      const fault = verdictFlags(this.validate())
      if (partial) {
        this.internals.setValidity(
          { badInput: true },
          this.badInputMessage ||
            formatWords(this, 'incompleteMessage', { kind: this.segmentedKind }),
          anchor,
        )
      } else if (this.required && this.value === '') {
        this.internals.setValidity(
          { valueMissing: true },
          this.valueMissingMessage ||
            formatWords(this, 'emptyMessage', { kind: this.segmentedKind }),
          anchor,
        )
      } else if (fault !== null) {
        this.internals.setValidity(fault[0], fault[1], anchor)
      } else {
        this.internals.setValidity({})
      }
      this.refreshFeedback()
    }

    /** The row of segments, in the locale's order, with what it writes between them. */
    protected renderSegments(): TemplateResult {
      const layout = this.layout
      const twelve = isTwelveHourLayout(layout)
      const locale = this.segmentLocale
      const system = this.segmentSystem
      const rows = this.segmentGroups
      /* A range is two rows of the same segments with a dash between them, as
         React Aria's DateRangePicker draws its two fields. Each segment in a
         range is named with its row's word as well, "month, Start, Stay". */
      const row = (index: number): TemplateResult => {
        const parts = this.parts[index] ?? {}
        const prefix = index === 0 ? this.controlId : `${this.controlId}-end`
        const rowName = rows > 1 ? `${prefix}-row` : ''
        return html`${
          rows > 1
            ? html`<span id=${rowName} hidden
                >${index === 0 ? this.rangeStartLabel : this.rangeEndLabel}</span
              >`
            : nothing
        }${layout.map((slot) => {
          if ('literal' in slot) {
            return html`<span part="literal" aria-hidden="true">${slot.literal}</span>`
          }
          const kind = slot.kind
          const shown = shownValue(kind, parts, twelve)
          const { max, min } = segmentRange(kind, parts, twelve, system)
          const text = segmentText(kind, parts, twelve, locale)
          const empty = shown === undefined
          const id = `${prefix}-${kind}`
          const editable = !this.isDisabled && !(this as { readOnly?: boolean }).readOnly
          /* Named with the field's label after its own, "month, Starts", as
             React Aria names a segment: VoiceOver on iOS does not read a
             group's name, so a segment named "month" alone left the reader
             unsure which date it was in. **And invalid on each segment**,
             where the reader is: a group's `aria-invalid` is announced by no
             screen reader as focus moves between the parts inside it. */
          const spin = !this.touchApple
          const named = [id, rowName, this.labeled ? this.labelId : ''].filter(Boolean).join(' ')
          return html`<span
            part="segment${empty ? ' segment-placeholder' : ''}"
            id=${id}
            data-row=${rows > 1 ? index : nothing}
            data-segment=${kind}
            role=${spin ? 'spinbutton' : 'textbox'}
            tabindex=${this.isDisabled ? '-1' : '0'}
            contenteditable=${editable ? 'true' : nothing}
            spellcheck=${editable ? 'false' : nothing}
            autocorrect=${editable ? 'off' : nothing}
            inputmode=${kind === 'dayPeriod' || !editable ? nothing : 'numeric'}
            enterkeyhint=${editable ? 'next' : nothing}
            aria-label=${named === id ? segmentName(kind, locale) : `${segmentName(kind, locale)},`}
            aria-labelledby=${named === id ? nothing : named}
            aria-invalid=${this.invalidity ?? nothing}
            aria-valuemin=${spin ? min : nothing}
            aria-valuemax=${spin ? max : nothing}
            aria-valuenow=${spin ? (shown ?? nothing) : nothing}
            aria-valuetext=${spin ? (empty ? this.emptySegmentLabel : segmentValueText(kind, parts, twelve, locale, system)) : nothing}
            aria-disabled=${this.isDisabled ? 'true' : nothing}
            aria-required=${this.required ? 'true' : nothing}
            aria-readonly=${(this as { readOnly?: boolean }).readOnly ? 'true' : nothing}
            @keydown=${this.handleSegmentKeydown}
            @beforeinput=${this.handleSegmentBeforeInput}
            @input=${this.handleSegmentInput}
            >${text}</span
          >`
        })}`
      }
      return html`<div
        part="segments"
        id=${this.controlId}
        role="group"
        aria-labelledby=${this.labeled ? this.labelId : nothing}
        aria-describedby=${this.describedBy ?? nothing}
        aria-invalid=${this.invalidity ?? nothing}
        @focusin=${this.handleSegmentsFocusIn}
        @focusout=${this.handleSegmentsFocusOut}
        @keypress=${this.handleKeypress}
      >
        ${Array.from({ length: rows }, (_, index) =>
          index === 0
            ? row(0)
            : html`<span part="literal range-separator" aria-hidden="true"> – </span>${row(index)}`,
        )}
      </div>`
    }
  }

  /* Through `unknown`, for the reason `MixinField` gives: the protected members
     here and on the declared interface are two declarations of the same names,
     which TypeScript treats as incompatible. */
  return SegmentedFieldElement as unknown as Constructor<MixinSegmentedFieldInterface> & T
}
