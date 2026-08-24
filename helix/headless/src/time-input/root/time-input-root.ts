import {
  customElement,
  type HelixChangeEvent,
  HelixFormElement,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
  PopoverController,
} from '@helix-io/core'
import { clock } from '@helix-io/icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html } from 'lit/static-html.js'
/* Side-effect imports, because this renders these in its own shadow root and a
   custom element registers on import. Base elements here and styled ones in the
   styled file, the arrangement Date Input has with its calendar. */
import '../../icon/index.js'
import '../../tag/index.js'
import '../../time-picker/index.js'
import { isTime, toMinutes, writeTime } from '../../time-picker/root/time-picker-root.js'

/**
 * @summary A time, typed or picked from a list.
 *
 * @description
 * **The list is `helix-time-picker`, not a second one written here.** It is worth
 * having on its own, flat in a settings pane with nothing to open, and this
 * element is the field, the overlay and the form. Exactly the arrangement Input
 * Date has with `helix-date-picker` and Color Input with `helix-color-picker`.
 *
 * **Typed as well as picked, and that is the division the list depends on.** A
 * list at a step offers the times a product actually has, and the field is how a
 * reader says `09:07`. Neither is a worse version of the other: without the
 * field a step is a cage, and without the list every common time is typed out.
 *
 * **The value is `HH:mm` on a twenty-four hour clock, always**, because that is
 * what a form submits, what `min` and `max` compare against, and what sorts as a
 * string. What the field *shows* is the reader's own convention while it is
 * idle, and the value itself once the caret is in it: the same separation Input
 * Date draws, and for the same reason, which is that `2:30 PM` cannot be typed
 * back and `Intl` has no parser to make it so.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases TimeField, InputTime
 * @documentation https://helix.fusion.dev/components/time-input
 *
 * @slot trigger - The mark on the field saying a list opens.
 * @slot hint - Help under the field.
 * @slot feedback - What is wrong with it.
 *
 * @event {HelixChangeEvent} helix-change - Fired when the time changes.
 * @event {HelixOpenEvent} helix-open - Fired when the list opens.
 * @event {HelixCloseEvent} helix-close - Fired when it closes.
 *
 * @csspart field - The box holding the text and the trigger.
 * @csspart control - The text input.
 * @csspart time - One held time, as a tag, in `multiple`.
 * @csspart rest - How many times are held beyond the ones shown.
 * @csspart trigger - The control that opens the list.
 * @csspart trigger-icon - The mark on the button that opens the clock.
 * @csspart surface - The floating panel.
 * @csspart picker - The list inside it.
 * @csspart picker-column - One of them.
 * @csspart picker-columns - The row of columns, in `wheels`.
 * @csspart picker-empty - What it says when nothing matches, forwarded from the listbox.
 * @csspart picker-items - The scrolling column inside it, forwarded from the listbox.
 * @csspart picker-list - The listbox holding the times, in `list`.
 * @csspart picker-option - One time in it. Carries `data-between` inside a range.
 * @csspart time-dismiss - The remove button, when `dismissible`.
 * @csspart time-dismiss-mark - The glyph on the dismiss control, where none is slotted.
 * @csspart time-prefix - The category before the label.
 * @csspart picker-column-empty - Shown when a filter has hidden everything.
 * @csspart picker-column-feedback - What is wrong with it.
 * @csspart picker-column-filter-icon - The mark beside that field.
 * @csspart picker-column-filter-mark - The glyph beside the filter field, where none is slotted.
 * @csspart picker-column-hint - Help under the list.
 * @csspart picker-column-items - The list itself.
 * @csspart picker-column-label - The question, over the list.
 * @csspart picker-column-search - The region holding the field that narrows the list.
 * @csspart picker-column-search-field - The field itself.
 * @csspart picker-list-empty - Shown when a filter has hidden everything.
 * @csspart picker-list-feedback - What is wrong with it.
 * @csspart picker-list-filter-icon - The mark beside that field.
 * @csspart picker-list-filter-mark - The glyph beside the filter field, where none is slotted.
 * @csspart picker-list-hint - Help under the list.
 * @csspart picker-list-items - The list itself.
 * @csspart picker-list-label - The question, over the list.
 * @csspart picker-list-search - The region holding the field that narrows the list.
 * @csspart picker-list-search-field - The field itself.
 * @csspart picker-option-item - The row.
 * @csspart picker-option-label - The words.
 */
@customElement('helix-headless-time-input')
export class HelixHeadlessTimeInput extends MixinControllerOpen(
  MixinControllerValue(MixinField(HelixFormElement)),
) {
  /**
   * Whether the panel is one list of times or a column each.
   *
   * `list` offers whole times, which is what a product with slots or opening
   * hours has. `wheels` splits them into an hour, a minute and a meridiem where
   * the locale uses one, which is the only way to reach `23:45` without
   * scrolling most of a day. `helix-time-picker` carries the longer note on the trade.
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
   * How many times can be held at once.
   *
   * Absent is one. `range` holds a start and an end, `multiple` holds any
   * number, and both are carried as one comma-separated value, which is what a
   * form submits. `helix-time-picker` carries the longer note on the interaction and on
   * why a wheel cannot do either.
   */
  @property({ reflect: true })
  mode?: 'multiple' | 'range'

  /**
   * How many times are shown as tags before the rest are counted, in `multiple`.
   *
   * `0` is all of them, and is the default, for the reason Date Input gives: how
   * many fit depends on the width of the field and the length of what is in it,
   * and this element knows neither.
   */
  @property({ attribute: 'max-tags', type: Number })
  maxTags = 0

  /** How far apart the offered times are, in minutes. */
  @property({ type: Number })
  step = 15

  /** Earliest time that can be chosen, as `HH:mm`. */
  @property()
  min = '00:00'

  /** Latest time that can be chosen, as `HH:mm`. */
  @property()
  max = '23:59'

  /**
   * Whether the field writes the time out, or holds the value as it is.
   *
   * `local` is the reader's own convention from `Intl`, which is what a time is
   * for reading; `iso` is `HH:mm`, which is what it is for typing. The field
   * swaps to the value while the caret is in it either way, so the rendering is
   * never something this element would refuse to read back.
   */
  @property({ attribute: 'time-style' })
  timeStyle: 'iso' | 'local' = 'local'

  /** Language tag the times are written in. Absent uses the runtime's own. */
  @property()
  locale = ''

  /** What the field says before a time is in it. */
  @property()
  placeholder = 'HH:mm'

  /** Accessible name for the control that opens the list. */
  @property({ attribute: 'trigger-label' })
  triggerLabel = 'Choose a time'

  /** Whether the caret is in the field, which is when it holds the value. */
  @state()
  private editing = false

  /** The overlay, placed against the field for the reason Date Input gives. */
  protected readonly panel = new PopoverController(this, {
    anchor: () => this.renderRoot?.querySelector<HTMLElement>('[part="field"]'),
    /* The surface *and* the trigger.
     *
     * A control is not always one element: the button that opens this panel is
     * part of it, and a press on it is not a press outside. Scoped to the
     * surface alone, `pointerdown` on the trigger closed the panel and the
     * trigger's own `toggleOpen` reopened it on the `click` that followed, so
     * the panel could never be closed by the button that opened it. Measured
     * across all five popover-bearing components: Menu, Popover and Tooltip
     * already named their invoker; this one and its three siblings did not, and
     * all four stayed open on a second press where Menu closed.
     *
     * `DismissController` documents this exact failure and takes a list for it.
     * The list was the fix; using it was the part that did not happen here. */
    boundary: (): readonly (Element | null | undefined)[] => [
      this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
      this.renderRoot?.querySelector<HTMLElement>('[part="trigger"]'),
    ],
    offset: () => 8,
    onDismiss: () => this.requestOpen(false),
    placement: 'bottom-start',
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
  })

  private get control(): HTMLInputElement | null {
    if (typeof this.renderRoot?.querySelector !== 'function') {
      return null
    }
    return this.renderRoot.querySelector<HTMLInputElement>('[part="control"]')
  }

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
    return this.timeStyle === 'iso' || !isTime(at) ? at : writeTime(at, this.locale)
  }

  /** What the field shows: the value while it is being edited, a reading when not. */
  private get display(): string {
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

  /** The times that get a tag, which is all of them until `maxTags` says not. */
  private get shownTimes(): string[] {
    const held = this.held
    return this.maxTags > 0 ? held.slice(0, this.maxTags) : held
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
    if (event.key === 'Enter' && isTime(this.draft)) {
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
    return held.length > 0 && held.every(isTime) ? held.join(',') : ''
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
    const whole = held.length > 0 && held.every(isTime)
    this.requestValue(whole ? held.join(',') : typed)
    this.restore()
  }

  private readonly handlePicked = (event: Event): void => {
    event.stopPropagation()
    this.requestValue((event as HelixChangeEvent).detail.value)
    this.restore()
    /* One time has nothing more to say, so the list gets out of the way. A range
       or a multiple has: the reader is still choosing, and shutting the list
       under them after the first pick is taking the control away mid-answer. */
    if (this.mode === undefined) {
      this.requestOpen(false)
      this.updateComplete.then(() => this.returnFocus())
    }
  }

  /**
   * Puts the caret back in the field without the field reopening the list.
   *
   * Focus opens the list, so handing focus back after a pick would reopen the
   * thing that was just answered, and a reader could not get out of it. Input
   * Date guards the same case by asking where focus came from, which is enough
   * there and is not enough here: the option that had focus is gone by the time
   * this runs, so `relatedTarget` is whatever the document fell back to, which
   * is outside this element and reads as a genuine arrival.
   *
   * A flag rather than a better guess, because this element is the one moving
   * the focus and it is the only thing that can know so. Cleared synchronously,
   * since `focus()` dispatches before it returns.
   *
   * Reasoned rather than measured, and Date Input carries the long version of
   * why: `focus()` dispatches no event in an unfocused document, which is what
   * both the test runtime and the browser pane here are, so the path cannot be
   * exercised from either.
   */
  private returning = false

  private returnFocus(): void {
    this.returning = true
    this.control?.focus()
    this.returning = false
  }

  private readonly handleBlur = (): void => {
    this.editing = false
  }

  /**
   * Focusing the field opens the list, and only from outside the element.
   *
   * The guard is the one Date Input needed: picking a time shuts the panel and
   * puts the caret back in the field, and without it the list came straight
   * back and a reader could not get out of it.
   */
  private readonly handleFocus = (event: FocusEvent): void => {
    /* Not while the caret is being handed back. Picking a time returns focus
       to the field, and treating that as editing put the field into the shape it
       takes for typing: a reader chose "10:00 PM" from a list and the field
       answered "22:00". Focus is a good enough signal for editing everywhere
       except the one moment this element moved the focus itself, and it already
       knows when that is. */
    this.editing = !this.returning
    const from = event.relatedTarget
    if (this.open || this.isDisabled || this.returning) {
      return
    }
    if (from instanceof Node && this.renderRoot?.contains?.(from)) {
      return
    }
    this.requestOpen(true)
  }

  /** Puts the field back where the answer differs from what was typed. */
  private restore(): void {
    const control = this.control
    if (control && control.value !== this.display) {
      control.value = this.display
    }
    this.sync()
  }

  /** Reports the value and the validity the host stands behind. */
  private sync(): void {
    this.internals.setFormValue(this.value)
    const control = this.control
    if (!control) {
      return
    }
    /* Checked here rather than left to the input, which is `text` and has no
       idea what a time is. String comparison is enough because a 24 hour `HH:mm`
       sorts lexically, which is the whole reason the value is that shape. */
    const value = this.value
    let message = ''
    if (value !== '' && !isTime(value)) {
      message = 'Enter a time as HH:mm.'
      // biome-ignore lint/style/noNonNullAssertion: guarded by the `value !== ''` beside it, and an optional chain here would compare `undefined` and take the branch.
    } else if (value !== '' && toMinutes(value)! < (toMinutes(this.min) ?? 0)) {
      message = `Choose a time at or after ${writeTime(this.min, this.locale)}.`
      // biome-ignore lint/style/noNonNullAssertion: guarded by the `value !== ''` beside it, and an optional chain here would compare `undefined` and take the branch.
    } else if (value !== '' && toMinutes(value)! > (toMinutes(this.max) ?? 1439)) {
      message = `Choose a time at or before ${writeTime(this.max, this.locale)}.`
    }
    if (message === '') {
      this.internals.setValidity(control.validity, control.validationMessage, control)
    } else {
      this.internals.setValidity({ badInput: true }, message, control)
    }
    this.refreshFeedback()
  }

  /** Escape shuts the list without moving the time. */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.open) {
      event.stopPropagation()
      this.requestOpen(false)
      this.returnFocus()
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    // Whatever the markup arrived with, so a form knows before anything is typed.
    this.sync()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('value')) {
      this.sync()
    }
    /* Driven from here rather than from the toggle, because `open` is a property
       a consumer may set directly and the panel has to follow either way. The
       controller is idempotent, so arriving twice for one open costs nothing.
       Without this the surface stays `display: none`, a `popover` element being
       hidden until something shows it, and the list inside measures zero, which
       is what a scroll into view cannot work without. */
    if (this.open) {
      this.panel.show()
      /* After the panel is shown, not before. A set of wheels centers each on
         its own answer and cannot do it against a box of zero height, which is
         what everything in a `popover` measures until something shows it. The
         picker calls this on its own updates too; that one lands too early and
         is harmless, and this one is the call that works. */
      this.renderRoot
        ?.querySelector<HTMLElement & { reveal?: () => void }>('[part="picker"]')
        ?.reveal?.()
    } else {
      this.panel.hide()
    }
  }

  /** Puts the caret in the field, the way a label pointing at one would. */
  override focus(options?: FocusOptions): void {
    this.control?.focus(options)
  }

  /**
   * The clock the field opens, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own,
   * wrap this one, pass it a property the base does not know about, or leave it
   * out, without reimplementing the whole template to do any of them. The tag is
   * interpolated rather than written, so `tier` resolves it: this renders the
   * headless element, and a styled subclass that sets `tier` renders the styled one
   * from the same template.
   */
  protected renderPicker(): TemplateResult {
    return html`<${this.tag('time-picker')}
      part="picker"
      exportparts="column: picker-column, column-empty: picker-column-empty,
        column-feedback: picker-column-feedback, column-filter-icon: picker-column-filter-icon,
        column-filter-mark: picker-column-filter-mark, column-hint: picker-column-hint,
        column-items: picker-column-items, column-label: picker-column-label,
        column-search: picker-column-search, column-search-field: picker-column-search-field,
        columns: picker-columns, empty: picker-empty, items: picker-items, list: picker-list,
        list-empty: picker-list-empty, list-feedback: picker-list-feedback,
        list-filter-icon: picker-list-filter-icon, list-filter-mark: picker-list-filter-mark,
        list-hint: picker-list-hint, list-items: picker-list-items, list-label: picker-list-label,
        list-search: picker-list-search, list-search-field: picker-list-search-field,
        option: picker-option, option-item: picker-option-item, option-label: picker-option-label"
      ?invalid=${this.resolvedFeedback !== ''}
      mode=${this.mode ?? nothing}
      appearance=${this.variant ?? nothing}
      label=${this.label || 'Time'}
      locale=${this.locale || nothing}
      max=${this.max}
      min=${this.min}
      step=${this.step}
      .value=${this.picked}
      @helix-change=${this.handlePicked}
    ></${this.tag('time-picker')}>`
  }

  /**
   * One chosen time, as a tag, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own,
   * wrap this one, pass it a property the base does not know about, or leave it
   * out, without reimplementing the whole template to do any of them. The tag is
   * interpolated rather than written, so `tier` resolves it: this renders the
   * headless element, and a styled subclass that sets `tier` renders the styled one
   * from the same template.
   */
  protected renderTag(at: string): TemplateResult {
    return html`<${this.tag('tag')}
                  part="time"
      exportparts="dismiss: time-dismiss, dismiss-mark: time-dismiss-mark, prefix: time-prefix"
                  dismissible
                  dismiss-label=${`Remove ${this.written(at)}`}
                  ?disabled=${this.isDisabled}
                  @helix-dismiss=${(event: Event) => {
                    event.stopPropagation()
                    this.removeTime(at)
                  }}
                  >${this.written(at)}</${this.tag('tag')}
                >`
  }

  /**
   * The mark on the button that opens the clock, behind a seam.
   *
   * Slot fallback, so a consumer replaces it by slotting; and a method, so the
   * tier above replaces it by overriding.
   *
   * **A named import rather than `<helix-icon>`, and that is a reversal.** The
   * element looked like the tidier of the two and loses on three counts.
   * `helix-icon` indexes the whole icon map at runtime, `icons[this.name]`, and
   * no bundler can shake a runtime lookup, so every consumer of any component
   * that renders one ships all 50kB of path data; a named import ships one
   * path. The import is checked when the package compiles, where a `name`
   * string is checked only when `check:icons` runs. And `helix-icon` is not
   * registered on the headless tier at all, which registers `helix-headless-icon`,
   * so a headless consumer got an inert unknown element and no mark whatsoever.
   */
  protected renderTrigger(): TemplateResult {
    return html`<slot name="trigger"><svg aria-hidden="true" fill="currentColor" part="trigger-icon" viewBox=${clock.viewBox}>
        ${unsafeSVG(clock.content)}
      </svg></slot>`
  }

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
      <div part="field" @keydown=${this.handleKeydown}>
        ${this.mode === 'multiple' ? this.shownTimes.map((at) => this.renderTag(at)) : nothing}
        ${this.restCount > 0 ? html`<span part="rest">${`+${this.restCount}`}</span>` : nothing}
        <input
          part="control"
          id="control"
          type="text"
          .value=${this.display}
          name=${this.name || nothing}
          placeholder=${
            this.mode === 'multiple' && this.held.length > 0 ? nothing : this.placeholder || nothing
          }
          autocomplete="off"
          aria-describedby=${this.describedBy ?? nothing}
          ?disabled=${this.isDisabled}
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
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-time-input': HelixHeadlessTimeInput
  }
}
