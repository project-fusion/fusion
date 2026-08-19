import {
  customElement,
  type HelixChangeEvent,
  HelixFormElement,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
  PopoverController,
} from '@helix-io/core'
import { caretDown } from '@helix-io/icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import type { HelixBaseListbox } from '../../listbox/root/listbox-root.js'
/* Side-effect import, because this renders `<helix-listbox>` in its own shadow
   root and a custom element registers on import. The public tag rather than the
   base one: a consumer on the styled tier gets the styled listbox, and one on
   the headless tier brings a listbox of their own under that name. */
import '../../listbox/index.js'

/**
 * @summary A field that filters a list as it is typed into.
 *
 * @description
 * **The list is `helix-listbox`, and the filtering is its own.** It already
 * owns narrowing, the empty state, the highlight, `aria-activedescendant` and
 * scrolling an option into view, and every one of those is a decision with a
 * long note attached. Rewriting them here would be a second copy to keep in
 * step; what is left for this element is the field, the panel and the traffic
 * between them.
 *
 * **The text and the value are two things.** What a reader types is a filter,
 * not an answer: it narrows the list and is thrown away. The value is whichever
 * option they then choose, and the field is rewritten to that option's words
 * once they have. A combobox that treated the typing as the value would submit
 * "jav" to a form, which is the mistake a plain input makes and the reason this
 * component exists.
 *
 * That is also why the field is emptied of its filter on close rather than left
 * holding it: a control reopened still narrowed by the last visit's search is a
 * control whose second use starts from the first one's leftovers. Select
 * records the same, having been fixed for it.
 *
 * **Focus stays in the field, which is the whole of what a combobox is.** The
 * arrows move the list without leaving the text, which is why the listbox has a
 * public `navigate`: the moving, the wrapping, the skipping of disabled options
 * and the seeding from the current value all stay in the one place that already
 * does them.
 *
 * `role="combobox"` on the input rather than on a wrapper, because the thing
 * the pattern describes is the text field, and `aria-controls` can name the
 * listbox because both are in this shadow root. The active option cannot be
 * named that way, being the consumer's light DOM, so it is linked by element
 * reference for the reason Listbox records at length.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases Autocomplete, Typeahead, Search select
 * @documentation https://helix.fusion.dev/components/combobox
 *
 * @slot - The options, which are `helix-option` elements.
 * @slot start - Before the text, for an icon.
 * @slot end - After it, for a unit or a clear button.
 * @slot indicator - Replaces the caret saying the field opens.
 *
 * @csspart field - The box around the text and its marks.
 * @csspart control - The text field itself.
 * @csspart indicator - The caret.
 * @csspart surface - The floating panel.
 * @csspart listbox - The list inside it.
 * @csspart items - The scrolling box of options, forwarded from the listbox.
 * @csspart empty - What shows where the filter has hidden everything, forwarded
 * from the listbox.
 *
 * @event {HelixChangeEvent} helix-change - Fired when the chosen option changes.
 * @event {HelixOpenEvent} helix-open - Fired when the panel opens.
 * @event {HelixCloseEvent} helix-close - Fired when it closes.
 */
@customElement('helix-base-combobox')
export class HelixBaseCombobox extends MixinControllerOpen(
  MixinControllerValue(MixinField(HelixFormElement)),
) {
  /** Text shown while nothing has been chosen. */
  @property()
  placeholder = ''

  /** Accessible name for the list, which has no visible one of its own. */
  @property({ attribute: 'list-label' })
  listLabel = 'Options'

  /** Words shown where the filter has hidden everything. */
  @property({ attribute: 'empty-text' })
  emptyText = 'No matches'

  /**
   * What the reader has typed, which narrows the list and is not the value.
   *
   * State rather than a property, because it is a keystroke rather than API: a
   * consumer sets `value` to say what is chosen, and nothing outside needs to
   * say what is half-typed.
   */
  @state()
  private typed = ''

  private get listbox(): HelixBaseListbox | null {
    return this.renderRoot?.querySelector<HelixBaseListbox>('[part="listbox"]') ?? null
  }

  protected readonly panel = new PopoverController(this, {
    anchor: () => this.renderRoot?.querySelector<HTMLElement>('[part="field"]'),
    /* The surface *and* the field, for the reason four components here were
       fixed for: scoped to the surface alone, a press on the field counts as
       outside, so `pointerdown` closes the panel and the field's own handler
       reopens it on the `click` that follows. */
    boundary: (): readonly (Element | null | undefined)[] => [
      this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
      this.renderRoot?.querySelector<HTMLElement>('[part="field"]'),
    ],
    offset: () => 4,
    onDismiss: () => this.close(),
    placement: 'bottom-start',
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
  })

  /** The words of the chosen option, which is what the field shows at rest. */
  private get chosen(): string {
    const option = (this.listbox?.options ?? []).find((one) => one.value === this.value)
    return option?.text ?? ''
  }

  private close(): void {
    if (!this.open) {
      return
    }
    this.requestOpen(false)
    this.renderRoot.querySelector<HTMLElement>('[part="control"]')?.focus()
  }

  private readonly handleInput = (event: Event): void => {
    this.typed = (event.target as HTMLInputElement).value
    this.listbox?.requestFilter(this.typed)
    if (!this.open) {
      this.requestOpen(true)
    }
  }

  /**
   * The keys the field answers, and the ones it hands on.
   *
   * Everything that moves within the list goes to the list, which is what
   * `navigate` is for. Escape and Tab are the field's, because they are about
   * the panel rather than about the options in it.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    /* The input carries `disabled` too, so a reader never gets this far: the
       platform suppresses the event before any listener sees it. Said here
       anyway, because then the element's own state is what refuses rather than
       a detail of the node it happens to render, and a consumer dispatching a
       key at it gets the same answer a reader would. */
    if (this.isDisabled) {
      return
    }
    if (event.key === 'Escape') {
      if (this.open) {
        event.preventDefault()
        this.close()
      }
      return
    }
    if (event.key === 'Tab') {
      if (this.open) {
        this.requestOpen(false)
      }
      return
    }
    /* Opening on the first arrow, before the list is asked to move: a closed
       combobox pressed Down should show its options and land on the first,
       which is one gesture to the reader and two steps here. */
    if (!this.open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      this.requestOpen(true)
    }
    this.listbox?.navigate(event)
  }

  /**
   * Takes what the list announced and stops it there.
   *
   * The listbox says `helix-change` under its own name, and a consumer
   * listening on this element would otherwise hear two changes for one choice,
   * one of them naming a control they did not put on the page.
   */
  private readonly handleChange = (event: Event): void => {
    event.stopPropagation()
    const { value } = (event as HelixChangeEvent).detail
    this.requestValue(value)
    this.typed = ''
    this.close()
  }

  /**
   * Reports the answer and the verdict on it.
   *
   * The value rather than the typed text, which is the whole point of the
   * component: a form that received "jav" got the filter, not an option.
   */
  private sync(): void {
    this.internals.setFormValue(this.value === '' ? null : this.value)
    this.reportRequired(this.value === '', 'Choose one to continue.', 'control')
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.internals.ariaExpanded = this.open ? 'true' : 'false'
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    this.sync()
    if (this.open) {
      this.panel.show()
    } else {
      this.panel.hide()
      /* And the filter goes with it, for the reason the class note records: a
         control reopened still narrowed is one whose second use starts from the
         first one's leftovers. */
      this.listbox?.requestFilter('')
    }
  }

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
      <div part="field">
        <slot name="start"></slot>
        <input
          part="control"
          id="control"
          type="text"
          role="combobox"
          autocomplete="off"
          spellcheck="false"
          aria-controls="listbox"
          aria-autocomplete="list"
          aria-expanded=${this.open ? 'true' : 'false'}
          aria-describedby=${this.describedBy ?? nothing}
          placeholder=${this.placeholder || nothing}
          ?disabled=${this.isDisabled}
          .value=${this.open ? this.typed : this.chosen}
          @input=${this.handleInput}
          @keydown=${this.handleKeydown}
          @click=${() => !this.isDisabled && !this.open && this.requestOpen(true)}
        />
        <slot name="end"></slot>
        <slot name="indicator">
          <svg part="indicator" fill="currentColor" viewBox=${caretDown.viewBox} aria-hidden="true">
            ${unsafeSVG(caretDown.content)}
          </svg>
        </slot>
      </div>
      <div part="surface" popover="manual" ?hidden=${!this.open}>
        <helix-listbox
          part="listbox"
          id="listbox"
          exportparts="items, empty"
          aria-label=${this.listLabel}
          empty-text=${this.emptyText}
          .value=${this.value}
          @helix-change=${this.handleChange}
        >
          <!-- The field's words are read off the options, and on the first
               render there are none: the slot has not been assigned yet, so a
               combobox with a value came up empty. Assignment changes no
               property, so nothing else would schedule the update that fixes
               it. Select was fixed for exactly this. -->
          <slot @slotchange=${() => this.requestUpdate()}></slot>
        </helix-listbox>
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-combobox': HelixBaseCombobox
  }
}
