import {
  customElement,
  HelixFormElement,
  hostAria,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
  PopoverController,
} from '@helix-io/core'
import { caretDown } from '@helix-io/icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html } from 'lit/static-html.js'
import type { HelixHeadlessListbox } from '../../listbox/root/listbox-root.js'
import '../../listbox/index.js'

/**
 * @summary A closed list that opens to be chosen from.
 *
 * @description
 * **A trigger and a `Listbox`, not a listbox reimplemented behind a button.**
 * The list this opens is the same element a consumer can use on its own, with
 * the same keyboard, the same filtering and the same multi-select rules. What
 * Select adds is the closing: a trigger that says what is chosen, a surface
 * that floats, and somewhere for focus to go back to.
 *
 * The options are the consumer's, in the consumer's light DOM, slotted through
 * into the listbox. That is why the listbox walks through slots to find them:
 * from its point of view the options belong to something else.
 *
 * **What it does not do is duplicate the value.** `Select` owns it, hands it
 * down, and takes changes back; the listbox is the thing being operated and not
 * a second place the answer lives.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases Dropdown, Picker
 * @documentation https://helix.fusion.dev/components/select
 *
 * @slot - The options, and any groups of them.
 * @slot start - Before the chosen value, for an icon or a prefix.
 * @slot end - After it, for a count, a unit, or a clear button.
 * @slot indicator - The mark on the trigger saying this opens, usually a caret.
 * @slot label - Richer than a string.
 * @slot hint - Richer than a string.
 *
 * @event {HelixBeforeChangeEvent} helix-before-change - Relayed from the listbox when the answer changes.
 * @event {Event} input - Announced once the value has moved.
 * @event {Event} change - Announced once the value has moved.
 * @event {HelixOpenEvent} helix-open - Fired when the list opens.
 * @event {HelixCloseEvent} helix-close - Fired when it closes.
 *
 * @csspart label - The question, over the trigger.
 * @csspart value - The chosen option's text inside the trigger.
 * @csspart indicator - The caret saying the control opens. Replaced by slotting one.
 * @csspart trigger - The closed control, which says what is chosen.
 * @csspart surface - The floating panel.
 * @csspart listbox - The list inside it.
 * @csspart hint - Help under the trigger.
 * @csspart feedback - What is wrong with it.
 * @csspart listbox-empty - Shown when a filter has hidden everything.
 * @csspart listbox-feedback - What is wrong with it.
 * @csspart listbox-filter-icon - The mark beside that field.
 * @csspart listbox-filter-mark - The glyph beside the filter field, where none is slotted.
 * @csspart listbox-hint - Help under the list.
 * @csspart listbox-items - The list itself.
 * @csspart listbox-label - The question, over the list.
 * @csspart listbox-search - The region holding the field that narrows the list.
 * @csspart listbox-search-field - The field itself.
 * @csspart listbox-loading - Shown while the options are still on their way.
 */
@customElement('helix-headless-select')
export class HelixHeadlessSelect extends MixinControllerOpen(
  MixinControllerValue(MixinField(HelixFormElement)),
) {
  /**
   * Whether the list can be narrowed by typing.
   *
   * Passed to the listbox rather than acted on here, because the listbox owns
   * the filtering, the empty state and the keyboard. This property existed and
   * was never read: it reflected, it type-checked, and nothing anywhere
   * rendered a field. API that does nothing is worse than API that is missing,
   * because a consumer sets it and believes it.
   */
  @property({ reflect: true, type: Boolean })
  filterable = false

  /**
   * Whether the options are still on their way.
   *
   * Passed straight to the list, which is where the rows are and so where the
   * message belongs. Two components saying "Loading" about one request is a
   * consumer wiring the same flag twice.
   */
  @property({ reflect: true, type: Boolean })
  loading = false

  /** What the list says while they are on their way. */
  @property({ attribute: 'loading-text' })
  loadingText = 'Loading'

  /** What it says where there are none. */
  @property({ attribute: 'empty-text' })
  emptyText = 'No matches'

  /** Whether more than one option can be the answer. */
  @property({ reflect: true, type: Boolean })
  multiple = false

  /** Shown on the trigger while nothing is chosen. */
  @property()
  placeholder = 'Choose'

  /**
   * The list inside the surface, or nothing where there is no DOM to hold one.
   *
   * The optional chain is the server. `renderRoot` is a property Lit's element
   * shim does not carry, and this getter is reached from `display`, which is
   * read during `render`: without it the select threw on every server render
   * and could not be served at all. Found by writing its SSR spec, which is
   * the only thing that would have found it, because the client is where every
   * other path runs and the client always has a root.
   *
   * The other reads of `renderRoot` here are inside callbacks the controllers
   * invoke, and a controller only runs on a connected element, so they cannot
   * be reached from the server and are left plain.
   */
  private get listbox(): HelixHeadlessListbox | null {
    return this.renderRoot?.querySelector<HelixHeadlessListbox>('[part="listbox"]') ?? null
  }

  /* The surface floats *and is in the top layer*, which it was not.
   *
   * It had a `FloatingController` and a `DismissController` and never called
   * `showPopover`, so the panel was an ordinary positioned element and the
   * first ancestor with `overflow: hidden` clipped it. A select inside a
   * scrolling card was cut off where a menu in the same place was not, and the
   * two are the same shape: floating panel, trigger, dismissal. That is what
   * `PopoverController` is, and having one of them is what stops the third copy
   * being subtly different again.
   *
   * Held off the trigger by the controller rather than by a margin on the
   * panel. A margin is inside the box the controller measures, so it would be
   * counted once in the placement and again in the layout, and the gap would
   * change as the panel flipped above the trigger for want of room. */
  protected readonly panel = new PopoverController(this, {
    anchor: () => this.renderRoot?.querySelector<HTMLElement>('[part="trigger"]'),
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
    offset: () => 4,
    onDismiss: () => this.close(),
    placement: 'bottom-start',
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="surface"]'),
  })

  /**
   * What the trigger says: the chosen options' words, or the placeholder.
   *
   * Read off the options rather than stored, because the words are the
   * consumer's content and storing a copy is storing something that goes stale
   * the moment they change it.
   */
  private get display(): string {
    const chosen = new Set(this.value === '' ? [] : this.value.split(','))
    const words = (this.listbox?.options ?? [])
      .filter((option) => chosen.has(option.value))
      .map((option) => option.text)
    return words.length > 0 ? words.join(', ') : this.placeholder
  }

  /** Closes the list and puts focus back where it came from. */
  private close(): void {
    if (!this.open) {
      return
    }
    this.requestOpen(false)
    // Back to the trigger, because focus is inside a panel that is going away
    // and a reader who loses it lands at the top of the document.
    this.renderRoot.querySelector<HTMLElement>('[part="trigger"]')?.focus()
  }

  private readonly handleChange = (event: Event): void => {
    /* From the event, not from the listbox.
     *
     * The event carries the value being *proposed*, and it is dispatched before
     * it is applied, which is what makes it refusable. Reading the listbox here
     * therefore read the value it still held: one choice behind, and on the
     * first choice nothing at all.
     *
     * And the listbox never applies it anyway. The select passes `.value` down,
     * which is a consumer declaring ownership, so the listbox inside the panel
     * is controlled by the select and correctly waits to be told. That is the
     * right arrangement, and it makes reading the listbox's own value the one
     * thing that can never work. */
    const next = (event as CustomEvent<{ value: string }>).detail.value
    /* Nothing happens on a refusal, and everything did.
     *
     * The panel closed and a native `change` went out whether or not the change
     * was taken, so a consumer calling `preventDefault()` on `helix-change`
     * kept the old value, watched the select shut as though it had been chosen,
     * and told the form it had moved. Refusing a change should leave the
     * control exactly where it was. */
    if (!this.requestValue(next)) {
      event.stopPropagation()
      return
    }
    /* Closed on a choice, unless more than one can be made: a multi-select that
       shut after each pick would be a control the reader has to reopen to use
       again. `helix-change` is left to travel, since it came from the listbox
       and says the same thing this would. */
    if (!this.multiple) {
      this.close()
    }
    event.stopPropagation()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private readonly handleTriggerKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      this.requestOpen(true)
    }
  }

  /** Reports the answer and the verdict on it. */
  private sync(): void {
    this.internals.setFormValue(this.value === '' ? null : this.value)
    this.reportRequired(this.value === '', 'Choose one to continue.', 'trigger')
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
    this.linkHost()
    if (this.open) {
      /* Driven from `updated` rather than from a `show()` method, because the
         open state is the property and a consumer may set it directly. The
         controller is idempotent, so arriving here twice for the same open
         costs nothing. */
      this.panel.show()
      /* Into the list, which is where the keyboard has to be for the arrows to
         mean anything. It reached the listbox element and stopped there, that
         element not being focusable, so focus stayed on the trigger and every
         arrow press went to the page. The listbox delegates focus now, so this
         lands on the list inside it.
       *
       * Only on the update that opened it. `updated` runs for any change while
       * the panel is up, a filter keystroke or a value arriving, and moving
       * focus on each of those is a focus thief: harmless while the listbox was
       * unfocusable, and a real one the moment it was made to work. */
      if (changed.has('open')) {
        this.listbox?.focus()
      }
    } else {
      this.panel.hide()
      /* And the filter goes with it. A filterable select reopened still narrowed
         with the old needle in its search box, and `hidden` still written on the
         options it had ruled out, so the second use of the control started from
         the first one's leftovers. Closing is where a search ends. */
      this.listbox?.requestFilter('')
    }
  }

  /**
   * The list the trigger opens, behind a seam the styled tier can move.
   *
   * A method rather than a fragment inline, so a tier above can render its own
   * list, wrap this one, or pass it a property the base does not know about,
   * without reimplementing the whole template. The tag is interpolated rather
   * than written, so `tier` resolves it: this renders the base listbox, and a
   * styled subclass that sets `tier` renders the styled one from the same
   * template.
   */
  protected renderListbox(): TemplateResult {
    return html`<${this.tag('listbox')}
      empty-text=${this.emptyText}
      loading-text=${this.loadingText}
      ?loading=${this.loading}
      part="listbox"
      exportparts="empty: listbox-empty, feedback: listbox-feedback, filter-icon: listbox-filter-icon,
        filter-mark: listbox-filter-mark, hint: listbox-hint, items: listbox-items,
        label: listbox-label, loading: listbox-loading, search: listbox-search,
        search-field: listbox-search-field"
      .value=${this.value}
      ?multiple=${this.multiple}
      ?filterable=${this.filterable}
      aria-label=${this.label || nothing}
      @helix-before-change=${this.handleChange}
    >
      <!-- The trigger's words are read off the options, and on the first
           render there are none: the slot has not been assigned yet, so a
           select with a value came up showing its placeholder. Assignment
           changes no property, so nothing else would schedule the update
           that fixes it. -->
      <slot @slotchange=${() => this.requestUpdate()}></slot>
    </${this.tag('listbox')}>`
  }

  /**
   * The caret saying the control opens, behind a seam.
   *
   * Slot fallback, so a consumer replaces it by slotting; and a method, so the
   * tier above replaces it by overriding. Those answer different people: the
   * slot is for the page and the method is for whoever is building the styled
   * layer, and a fallback with only the first is one a tier can restyle and
   * cannot change.
   */
  protected renderIndicator(): TemplateResult {
    return html`<slot name="indicator">
      <svg part="indicator" fill="currentColor" viewBox=${caretDown.viewBox} aria-hidden="true">
        ${unsafeSVG(caretDown.content)}
      </svg>
    </slot>`
  }

  protected override render(): TemplateResult {
    return html`${this.renderLabel()}
      <button
        part="trigger"
        id="control"
        type="button"
        aria-haspopup="listbox"
        aria-expanded=${this.open ? 'true' : 'false'}
        aria-describedby=${this.describedBy ?? nothing}
        ?disabled=${this.isDisabled}
        @click=${() => this.toggleOpen()}
        @keydown=${this.handleTriggerKeydown}
      >
        <slot name="start"></slot>
        <span part="value">${this.display}</span>
        ${
          /* Before the indicator, not after it. The caret is the affordance
             saying the control opens, so it stays the last thing in the trigger
             whatever else is put in front of it. */
          ''
        }
        <slot name="end"></slot>
        ${
          /* The slot has a fallback, and had none: a select written without a
             hand-slotted icon drew no mark at all saying it opens, and every
             example in the family passes one, which is what hid it. A caret is
             the mark, and slotting anything replaces it, which is this
             library's rule for a content property. */
          ''
        }
        ${this.renderIndicator()}
      </button>

      <div part="surface" popover="manual" ?hidden=${!this.open}>
        ${this.renderListbox()}
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-select': HelixHeadlessSelect
  }
}
