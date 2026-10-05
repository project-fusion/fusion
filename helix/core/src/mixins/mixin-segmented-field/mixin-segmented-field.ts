import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { HelixFormElement } from '../../helix-form-element/helix-form-element.js'
import {
  isPartial,
  isTwelveHourLayout,
  type SegmentedKind,
  type SegmentKind,
  type SegmentOptions,
  type SegmentSlot,
  type Segments,
  segmentLayout,
  segmentName,
  segmentRange,
  segmentsOf,
  segmentsValue,
  segmentText,
  segmentValueText,
  setSegment,
  shownValue,
  stepSegment,
  typeDigit,
} from '../../utils/date-segments/date-segments.js'
import { inlineStep } from '../../utils/inline-step/inline-step.js'
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
  /** What a screen reader hears for a segment with nothing in it. */
  emptySegmentLabel: string

  /**
   * Whether the field is a row of segments, one for each part of the date or
   * time, in place of a line of text.
   */
  segmented: boolean

  /** Whether the segments are drawn: `segmented`, where the family can hold them. */
  protected get segmentsShown(): boolean

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
 * move on once it cannot take another, Up and Down step it and wrap, Home and
 * End go to its ends, Backspace and Delete empty it, Left and Right move between
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
     * What a screen reader hears for a segment with nothing in it, which a
     * sighted reader sees as dashes.
     */
    @property({ attribute: 'empty-segment-label' })
    emptySegmentLabel = 'Empty'

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

    /** The parts set so far, which may be fewer than a whole value. */
    @state()
    private parts: Segments = {}

    /** The digits typed into the segment that has focus, for a number that runs on. */
    private typed = ''

    /** Whether the value is moving because a segment moved it. */
    private own = false

    /** The value when focus came into the segments, so leaving them says `change` once. */
    private entered: string | undefined = undefined

    /** Whether this family can show segments in its current shape. */
    protected get segmentable(): boolean {
      return true
    }

    /** Whether the segments are drawn: `segmented`, where the family can hold them. */
    protected get segmentsShown(): boolean {
      return this.segmented && this.segmentable
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
    private take(next: Segments): void {
      this.parts = next
      const value = segmentsValue(this.segmentedKind, next, this.layout)
      if (value === this.value) {
        this.sync()
        return
      }
      this.own = true
      if (!this.requestValue(value)) {
        this.own = false
        this.parts = segmentsOf(this.segmentedKind, this.value)
      }
    }

    private moveFocus(from: HTMLElement, by: number): void {
      const all = this.segmentElements
      all[all.indexOf(from) + by]?.focus()
    }

    private readonly handleSegmentKeydown = (event: KeyboardEvent): void => {
      const element = event.currentTarget as HTMLElement
      const kind = element.dataset.segment as SegmentKind
      const twelve = isTwelveHourLayout(this.layout)
      if (event.key === 'ArrowDown' && event.altKey) {
        event.preventDefault()
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
      if ((this as { readOnly?: boolean }).readOnly || this.isDisabled) {
        return
      }
      const { max, min } = segmentRange(kind, this.parts, twelve)
      let next: Segments | undefined
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        next = stepSegment(this.parts, kind, event.key === 'ArrowUp' ? 1 : -1, twelve)
      } else if (event.key === 'Home' || event.key === 'End') {
        next = setSegment(this.parts, kind, event.key === 'Home' ? min : max, twelve)
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        next = setSegment(this.parts, kind, undefined, twelve)
      } else if (/^\d$/.test(event.key) && kind !== 'dayPeriod') {
        const typed = typeDigit(this.parts, kind, this.typed, event.key, twelve)
        event.preventDefault()
        this.typed = typed.typed
        this.take(typed.segments)
        if (typed.advance) {
          this.moveFocus(element, 1)
        }
        return
      } else if (kind === 'dayPeriod' && event.key.length === 1) {
        const letter = event.key.toLowerCase()
        const words = [0, 1].map((half) =>
          segmentText('dayPeriod', { dayPeriod: half }, true, this.segmentLocale).toLowerCase(),
        )
        const half = words.findIndex((word) => word.startsWith(letter))
        if (half >= 0) {
          next = setSegment(this.parts, kind, half, twelve)
        }
      }
      if (next !== undefined) {
        event.preventDefault()
        this.typed = ''
        this.take(next)
      }
    }

    /**
     * Focus coming into the segments from outside them, and leaving them,
     * which is when a typed value has settled and `change` is said.
     */
    private readonly handleSegmentsFocusIn = (event: FocusEvent): void => {
      this.typed = ''
      if (!this.segmentElements.includes(event.relatedTarget as HTMLElement)) {
        this.entered = this.value
      }
    }

    private readonly handleSegmentsFocusOut = (event: FocusEvent): void => {
      if (this.segmentElements.includes(event.relatedTarget as HTMLElement)) {
        return
      }
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
        segmentsValue(this.segmentedKind, this.parts, this.layout) !== this.value
      ) {
        this.parts = segmentsOf(this.segmentedKind, this.value)
      }
    }

    /** A reset empties a half-typed date too, which the value alone does not show. */
    override formResetCallback(): void {
      super.formResetCallback()
      this.parts = {}
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
      const partial = isPartial(this.segmentedKind, this.parts, this.layout)
      const message = this.validate()
      if (partial) {
        this.internals.setValidity(
          { badInput: true },
          this.badInputMessage ||
            (this.segmentedKind === 'date' ? 'Enter a whole date.' : 'Enter a whole time.'),
          anchor,
        )
      } else if (this.required && this.value === '') {
        this.internals.setValidity(
          { valueMissing: true },
          this.valueMissingMessage ||
            (this.segmentedKind === 'date' ? 'Enter a date.' : 'Enter a time.'),
          anchor,
        )
      } else if (message !== '') {
        this.internals.setValidity({ badInput: true }, message, anchor)
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
        ${layout.map((slot) => {
          if ('literal' in slot) {
            return html`<span part="literal" aria-hidden="true">${slot.literal}</span>`
          }
          const kind = slot.kind
          const shown = shownValue(kind, this.parts, twelve)
          const { max, min } = segmentRange(kind, this.parts, twelve)
          const text = segmentText(kind, this.parts, twelve, locale)
          const empty = shown === undefined
          return html`<span
            part="segment${empty ? ' segment-placeholder' : ''}"
            data-segment=${kind}
            role="spinbutton"
            tabindex=${this.isDisabled ? '-1' : '0'}
            inputmode=${kind === 'dayPeriod' ? nothing : 'numeric'}
            aria-label=${segmentName(kind, locale)}
            aria-valuemin=${min}
            aria-valuemax=${max}
            aria-valuenow=${shown ?? nothing}
            aria-valuetext=${empty ? this.emptySegmentLabel : segmentValueText(kind, this.parts, twelve, locale)}
            aria-disabled=${this.isDisabled ? 'true' : nothing}
            aria-readonly=${(this as { readOnly?: boolean }).readOnly ? 'true' : nothing}
            @keydown=${this.handleSegmentKeydown}
            >${text}</span
          >`
        })}
      </div>`
    }
  }

  /* Through `unknown`, for the reason `MixinField` gives: the protected members
     here and on the declared interface are two declarations of the same names,
     which TypeScript treats as incompatible. */
  return SegmentedFieldElement as unknown as Constructor<MixinSegmentedFieldInterface> & T
}
