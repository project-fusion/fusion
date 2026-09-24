import {
  AriaForwardController,
  customElement,
  HelixFormElement,
  hostAria,
  MixinControllerOpen,
  MixinControllerValue,
  MixinField,
  PopoverController,
} from '@fusion.dev/helix-core'
import { caretDown } from '@fusion.dev/helix-icons'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { html } from 'lit/static-html.js'
import type { HelixHeadlessListbox } from '../../listbox/root/listbox-root.js'
import { optionsAmong } from '../../option/root/option-root.js'
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
 * @status stable
 * @category forms
 * @aliases Dropdown, Picker
 * @documentation https://fusion.dev/helix/components/select
 *
 * @slot - The options, and any groups of them.
 * @slot end - After it, for a count, a unit, or a clear button.
 * @slot hint - Richer than a string.
 * @slot indicator - The mark on the trigger saying this opens, usually a caret.
 * @slot label - Richer than a string.
 * @slot start - Before the chosen value, for an icon or a prefix.
 *
 * @event {Event} change - Announced once the value has moved.
 * @event {HelixBeforeChangeEvent} helix-before-change - Relayed from the listbox when the answer changes. Cancelable: refusing it takes the decision and nothing moves.
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before it closes. Cancelable: refusing it takes the decision and nothing moves.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the list opens. Cancelable: refusing it takes the decision and nothing moves.
 * @event {Event} input - Announced once the value has moved.
 * @event {Event} toggle - Says the state moved, carrying `newState` and `oldState`.
 *
 * @csspart feedback - What is wrong with it.
 * @csspart hint - Help under the trigger.
 * @csspart indicator - The caret saying the control opens. Replaced by slotting one.
 * @csspart label - The question, over the trigger.
 * @csspart listbox - The list inside it.
 * @csspart listbox-empty - Shown when a filter has hidden everything.
 * @csspart listbox-feedback - What is wrong with it.
 * @csspart listbox-filter-icon - The mark beside that field.
 * @csspart listbox-filter-mark - The glyph beside the filter field, where none is slotted.
 * @csspart listbox-hint - Help under the list.
 * @csspart listbox-items - The list itself.
 * @csspart listbox-label - The question, over the list.
 * @csspart listbox-live - The inner list's `live`, the region a screen reader hears its empty and loading lines from.
 * @csspart listbox-loading - Shown while the options are still on their way.
 * @csspart listbox-search - The region holding the field that narrows the list.
 * @csspart listbox-search-field - The field itself.
 * @csspart surface - The floating panel.
 * @csspart trigger - The closed control, which says what is chosen.
 * @csspart value - The chosen option's text inside the trigger.
 *
 * @cssstate invalid - While there is feedback to show: the platform's verdict, or the consumer's `feedback`.
 * @cssstate open - While the list is open.
 */
@customElement('helix-headless-select')
export class HelixHeadlessSelect extends MixinControllerOpen(
  MixinControllerValue(MixinField(HelixFormElement)),
) {
  /* A consumer's `aria-describedby` names ids in their own tree and the control
     is in this shadow root, so the reference has to be carried down as an
     element rather than copied as an id. See `AriaForwardController`: measured
     in Chrome's own tree, the host held the description and the control the
     reader is actually on was exposed without it. */
  protected readonly aria = new AriaForwardController(this, {
    target: () => this.partNamed('trigger'),
  })

  /**
   * What it says where there are none.
   */
  @property({ attribute: 'empty-text' })
  emptyText = 'No matches'

  /**
   * Whether the list can be narrowed by typing.
   *
   * Passed to the listbox rather than acted on here, because the listbox owns
   * the filtering, the empty state and the keyboard.
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

  /**
   * What the list says while they are on their way.
   */
  @property({ attribute: 'loading-text' })
  loadingText = 'Loading'

  /**
   * Whether more than one option can be the answer.
   */
  @property({ reflect: true, type: Boolean })
  multiple = false

  /**
   * Shown on the trigger while nothing is chosen.
   */
  @property()
  placeholder = 'Choose'

  /**
   * Which option is chosen, as an index, or `-1` where none is.
   *
   * Read off the listbox this renders, which owns the options and is where the
   * same two properties are implemented. Delegating rather than recomputing is
   * what keeps a composed control and the control inside it from answering
   * differently: they are one chooser to a consumer.
   */
  get selectedIndex(): number {
    return this.listbox?.selectedIndex ?? -1
  }

  set selectedIndex(at: number) {
    const listbox = this.listbox
    if (listbox) {
      listbox.selectedIndex = at
    }
  }

  /** Which kind of chooser this is, in the platform's two words. */
  get type(): string {
    return this.multiple ? 'select-multiple' : 'select-one'
  }

  /**
   * The list inside the surface, or nothing where there is no DOM to hold one.
   *
   * The optional chain is the server. `renderRoot` is a property Lit's element
   * shim does not carry, and this getter is reached from `display`, which is
   * read during `render`: without it the select throws on every server render
   * and cannot be served at all.
   *
   * The other reads of `renderRoot` here are inside callbacks the controllers
   * invoke, and a controller only runs on a connected element, so they cannot
   * be reached from the server and are left plain.
   */
  private get listbox(): HelixHeadlessListbox | null {
    return this.partNamed<HelixHeadlessListbox>('listbox')
  }

  /* The surface floats *and is in the top layer*.
   *
   * Without `showPopover` the panel is an ordinary positioned element and the
   * first ancestor with `overflow: hidden` clips it, so a select inside a
   * scrolling card is cut off where a menu in the same place is not. The two
   * are the same shape (floating panel, trigger, dismissal), which is what
   * `PopoverController` is, and having one of them is what stops the third copy
   * being subtly different.
   *
   * Held off the trigger by the controller rather than by a margin on the
   * panel. A margin is inside the box the controller measures, so it would be
   * counted once in the placement and again in the layout, and the gap would
   * change as the panel flipped above the trigger for want of room.
   *
   * Not `MixinPickerField`, which floats a picker off a text field and hands
   * the caret back to it: there is no text here, the panel hangs off the
   * trigger, and dismissal puts focus back on that. */
  protected readonly panel = new PopoverController(this, {
    anchor: () => this.partNamed('trigger'),
    /* The surface *and* the trigger.
     *
     * A control is not always one element: the button that opens this panel is
     * part of it, and a press on it is not a press outside. Scoped to the
     * surface alone, `pointerdown` on the trigger closes the panel and the
     * trigger's own `toggleOpen` reopens it on the `click` that follows, so
     * the panel can never be closed by the button that opened it.
     *
     * `DismissController` documents this exact failure and takes a list for
     * it. */
    boundary: (): readonly (Element | null | undefined)[] => [
      this.partNamed('surface'),
      this.partNamed('trigger'),
    ],
    offset: () => 4,
    onDismiss: () => this.close(),
    open: () => this.open,
    placement: 'bottom-start',
    surface: () => this.partNamed('surface'),
  })

  /**
   * What the trigger says: the chosen options' words, or the placeholder.
   *
   * Read off the options rather than stored, because the words are the
   * consumer's content and storing a copy is storing something that goes stale
   * the moment they change it.
   *
   * **Off this element's own children, not the listbox's**, which reach the
   * listbox through a slot and so only after a render has made it: read there,
   * the first render showed the placeholder over a chosen value and waited on a
   * `slotchange`, which a declarative shadow root fires before anything listens,
   * so a hydrated select kept "Choose" for good. Nothing on a server or while
   * hydrating what one sent, which drew the placeholder too.
   *
   * **And the placeholder is a statement, so a render that cannot read the
   * words does not make it.** "Choose" means nothing is chosen. `value` is an
   * attribute and a server has it, the words are the children's and a server
   * has none, so a `<helix-select default-value="two">` served "Choose" over an
   * answer the consumer had already given: false to a reader, and false to a
   * crawler, on every select in the library's own examples. Where a value is
   * declared and the word for it cannot be read, the trigger says nothing and
   * keeps its box, which is the answer this library reaches for everywhere it
   * cannot tell empty from unknown. `firstUpdated` asks for the render that
   * fills it in.
   *
   * The placeholder still stands where there is genuinely no value, which is
   * what it is for and the one case a server can be sure of.
   *
   * **`nothing` and never `''`, which is the difference between a word that
   * arrives and one that never does.** Lit's hydration primes a child part with
   * whatever the render computed, and `''` is a primitive, so `_commitText`
   * takes the branch that assumes the server left a text node to overwrite.
   * There is none, the write lands on the closing part marker's comment data,
   * and the trigger stays empty for the life of the page: measured by
   * `check:spec:dsd`, which caught all nine of these and showed a blank select
   * beside a client's "Option Two". `nothing` primes the sentinel instead, so
   * the commit creates the text node it needs.
   */
  private get display(): string | typeof nothing {
    const chosen = new Set(this.value === '' ? [] : this.value.split(','))
    const words = optionsAmong(this.knownChildren)
      .filter((option) => chosen.has(option.value))
      .map((option) => option.text)
    if (words.length > 0) {
      return words.join(', ')
    }
    return chosen.size > 0 && !this.childrenKnown ? nothing : this.placeholder
  }

  /** Closes the list and puts focus back where it came from. */
  private close(): void {
    if (!this.open) {
      return
    }
    this.requestOpen(false)
    // Back to the trigger, because focus is inside a panel that is going away
    // and a reader who loses it lands at the top of the document.
    this.partNamed('trigger')?.focus()
  }

  private readonly handleChange = (event: Event): void => {
    /* From the event, not from the listbox.
     *
     * The event carries the value being *proposed*, and it is dispatched before
     * it is applied, which is what makes it refusable. Reading the listbox here
     * reads the value it still holds: one choice behind, and on the first
     * choice nothing at all.
     *
     * `.value` going down to the listbox does not change that. It is a seed and
     * a correction rather than a claim of ownership, and the listbox applies its
     * own changes unless somebody refuses them, so its value catches up after
     * this handler and never before it. */
    const next = (event as CustomEvent<{ value: string }>).detail.value
    /* Nothing happens on a refusal.
     *
     * Without this return the panel closes and a native `change` goes out
     * whether or not the change was taken, so a consumer calling
     * `preventDefault()` on `helix-change` keeps the old value, watches the
     * select shut as though it had been chosen, and tells the form it moved. */
    if (!this.requestValue(next)) {
      event.stopPropagation()
      return
    }
    /* Closed on a choice, unless more than one can be made: a multi-select that
       shut after each pick would be a control the reader has to reopen to use
       again. */
    if (!this.multiple) {
      this.close()
    }
    /* The listbox's request is stopped and this element's own has already gone
       out, from `requestValue` above: two elements announcing one choice is
       what a consumer would have to deduplicate.

       And no `change` is dispatched here. `requestValue` announces `input` and
       `change` through the mixin, the way every other discrete control does, so
       a second one from this line is a second `change` per choice: measured on
       the styled tier at three, one from the mixin, one from here, and one from
       the listbox before it was stopped. */
    event.stopPropagation()
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

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.sync()
    this.linkHost()
    /* The panel follows `open` through the controller, which reads it after
       every update. What is left here is what only this element knows. */
    if (this.open) {
      /* Into the list, which is where the keyboard has to be for the arrows to
         mean anything. The listbox delegates focus, so this lands on the list
         inside it rather than stopping at the listbox element, which is not
         itself focusable.
       *
       * Only on the update that opened it. `updated` runs for any change while
       * the panel is up, a filter keystroke or a value arriving, and moving
       * focus on each of those is a focus thief. */
      if (changed.has('open')) {
        this.listbox?.focus()
      }
    } else {
      /* The filter goes with a close. Without this a filterable select reopens
         still narrowed by the old needle, with `hidden` still written on the
         options it ruled out, so the second use of the control starts from the
         first one's leftovers. Closing is where a search ends. */
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
        label: listbox-label, live: listbox-live, loading: listbox-loading, search: listbox-search,
        search-field: listbox-search-field"
      .value=${this.value}
      ?multiple=${this.multiple}
      ?filterable=${this.filterable}
      aria-label=${this.label || nothing}
      @helix-before-change=${this.handleChange}
      @change=${this.stopInner}
      @input=${this.stopInner}
    >
      <!-- An option arriving or leaving changes no property, so this is what
           schedules the update that rereads the trigger's words. -->
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
        id=${this.controlId}
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
          /* The slot has a fallback: without one a select written without a
             hand-slotted icon draws no mark at all saying it opens. A caret is
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
