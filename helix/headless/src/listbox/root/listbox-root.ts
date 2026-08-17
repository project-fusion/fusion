import {
  customElement,
  DisabledCascadeController,
  HelixFilterEvent,
  HelixFormElement,
  type HelixSelectEvent,
  hostAria,
  MixinControllerValue,
  MixinField,
  requestControlledChange,
  scrollItemIntoView,
} from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { HelixBaseOptionGroup } from '../../option/group/option-group.js'
import { HelixBaseOption } from '../../option/root/option-root.js'

/** The keys that move within a list, which is every key that moves at all. */
const MOVES = new Set(['ArrowDown', 'ArrowUp', 'End', 'Home'])

/**
 * @summary A list of options, one or several of which are the answer.
 *
 * @description
 * **The listbox is the control and the options are its vocabulary.** A Select
 * is this with a trigger in front of it, a Combobox is this with a text input,
 * and a command palette is this again: they differ in what opens the list and
 * what filters it, not in what the list is. Building it as its own family is
 * what stops each of those reimplementing the keyboard and the filtering.
 *
 * **`value` is comma separated when `multiple` is set**, the way
 * `Checkbox.Group`'s is. It stays a string because that is what a form submits
 * and what `MixinControllerValue` holds; an array property would be a second
 * shape for the same fact, and the two would disagree the first time one was
 * set without the other.
 *
 * **Chosen and active are two different things.** Chosen is the answer; active
 * is where the keyboard is. In a single-select list they move together, which
 * is the radio group pattern and is what a reader expects from arrow keys. With
 * `multiple` they come apart: the arrows move without choosing and Space
 * chooses, because a reader passing over four options on the way to the fifth
 * did not mean to pick all five.
 *
 * That is also why this does not use `KeyboardNavigationController`, which
 * moves and chooses in one act by design. Half of this component needs that and
 * half needs the opposite, and a flag on the controller would be this paragraph
 * written twice.
 *
 * **Filtering hides rather than removes.** An option the filter has hidden is
 * still the consumer's element in the consumer's order, so a filter that clears
 * puts the list back exactly as it was with nothing re-rendered. What counts as
 * a match is a plain case-insensitive substring, and a consumer wanting more
 * hides options itself: `filter` is a convenience over the same `hidden` the
 * component uses.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Options, Select list
 * @documentation https://helix.fusion.dev/components/listbox
 *
 * @slot - The options, and any groups of them.
 * @slot label - Richer than a string.
 * @slot hint - Richer than a string.
 *
 * @event {HelixChangeEvent} helix-change - Fired when the answer changes, and cancelable.
 * @event {HelixFilterEvent} helix-filter - Fired before the list narrows, and cancelable.
 *
 * @csspart label - The question, over the list.
 * @csspart items - The list itself.
 * @csspart empty - Shown when a filter has hidden everything.
 * @csspart search - The region holding the field that narrows the list.
 * @csspart search-field - The field itself.
 * @csspart hint - Help under the list.
 * @csspart feedback - What is wrong with it.
 */
@customElement('helix-base-listbox')
export class HelixBaseListbox extends MixinControllerValue(MixinField(HelixFormElement)) {
  /**
   * What the list is narrowed to, if anything.
   *
   * Filtering hides rather than removes, so nothing about the value changes and
   * the list is still the consumer's own elements in their own order. Reading
   * gives what is being filtered on; writing declares it theirs, and
   * `default-filter` seeds one the list owns.
   */
  @property()
  get filter(): string {
    return this.filterState ?? this.defaultFilter
  }

  set filter(next: string) {
    const previous = this.filter
    this.filterState = next
    this.requestUpdate('filter', previous)
  }

  /** What to start narrowed to, where nothing declared it. */
  @property({ attribute: 'default-filter' })
  defaultFilter = ''

  /** What the list is narrowed to, whoever set it. */
  private filterState: string | undefined = undefined

  /** Whether the consumer owns the narrowing, decided once and then fixed. */
  private filterMode: boolean | undefined = undefined

  private get filterIsControlled(): boolean {
    return this.filterMode === true
  }

  /**
   * Whether the list renders a field for narrowing itself.
   *
   * The field lives here rather than in whatever frames the list, because the
   * filtering already does: `filter`, the empty state and the keyboard are all
   * this component's. A select that drew its own search box above a listbox
   * would be writing the same field again, and so would a combobox, and so
   * would a command palette, which is the fault the three-family split exists
   * to prevent.
   */
  @property({ attribute: 'filterable', reflect: true, type: Boolean })
  filterable = false

  /** Placeholder for the field that narrows the list. */
  @property({ attribute: 'filter-label' })
  filterLabel = 'Filter'

  /** Whether more than one option can be the answer. */
  @property({ reflect: true, type: Boolean })
  multiple = false

  /** What is shown when a filter has hidden every option. */
  @property({ attribute: 'empty-text' })
  emptyText = 'No matches'

  /** Which option the keyboard is on, which is not what is chosen. */
  @state()
  private activeValue = ''

  /**
   * Whether anything survived the filter, kept as state rather than counted at
   * render time.
   *
   * Counting during render reads the hiding from the *previous* pass, because
   * hiding happens in `updated` against options that are the consumer's
   * elements rather than this component's markup. So a filter matching nothing
   * rendered the full list, hid every option, and left an empty box with no
   * message in it: the count was right one pass too late. Written to state
   * instead, which schedules the one further render that shows it.
   */
  @state()
  private hasMatches = true

  /* Stated once, and the group never thinks about it again. See the
     controller: the cascade was four hand calls from four different
     methods, so which paths reached it differed by component and a fifth
     group would have got none at all. */
  protected readonly cascade = new DisabledCascadeController(this, {
    items: () => this.options,
  })

  /**
   * Every option, in the order a reader meets them.
   *
   * Descendants rather than children, because a group puts a level between the
   * list and its options and the keyboard has to move through a grouped list
   * exactly as it moves through a flat one.
   */
  get options(): HelixBaseOption[] {
    return this.collect(this.children)
  }

  /**
   * Walks the tree, and walks *through* a slot when it meets one.
   *
   * Descendants rather than children, because a group puts a level between the
   * list and its options and the keyboard has to move through a grouped list
   * exactly as it moves through a flat one.
   *
   * Through a slot because that is how this gets composed. `Select` renders a
   * listbox in its own shadow root with a slot inside it, so the options are
   * the *select's* light DOM and the listbox's only child is the slot: a plain
   * `querySelectorAll` finds the slot and no options at all, and the whole
   * component comes up empty. Found the first time the two were put together,
   * which is the argument for building the pieces separately rather than
   * discovering it inside a finished Select.
   */
  private collect(nodes: Iterable<Element>): HelixBaseOption[] {
    const found: HelixBaseOption[] = []
    for (const node of nodes) {
      if (node instanceof HelixBaseOption) {
        found.push(node)
      } else if (node instanceof HTMLSlotElement) {
        found.push(...this.collect(node.assignedElements({ flatten: true })))
      } else {
        found.push(...this.collect(node.children))
      }
    }
    return found
  }

  /** The groups, found the same way and for the same reason. */
  private get groups(): HelixBaseOptionGroup[] {
    const found: HelixBaseOptionGroup[] = []
    const walk = (nodes: Iterable<Element>): void => {
      for (const node of nodes) {
        if (node instanceof HelixBaseOptionGroup) {
          found.push(node)
        }
        if (node instanceof HTMLSlotElement) {
          walk(node.assignedElements({ flatten: true }))
        } else {
          walk(node.children)
        }
      }
    }
    walk(this.children)
    return found
  }

  /** The options a filter has left showing. */
  private get shown(): HelixBaseOption[] {
    return this.options.filter((option) => !option.hidden)
  }

  /** The chosen values, which is a list whether or not `multiple` is set. */
  get values(): string[] {
    return this.value === '' ? [] : this.value.split(',')
  }

  /**
   * Applies a choice, announcing first so a listener can refuse it.
   *
   * With `multiple` a choice is a toggle, because the same press has to be able
   * to take an answer back; without it a choice replaces whatever was there.
   */
  private choose(value: string): void {
    const chosen = this.values
    const next = this.multiple
      ? chosen.includes(value)
        ? chosen.filter((each) => each !== value)
        : [...chosen, value]
      : [value]
    const joined = next.join(',')
    if (joined === this.value) {
      return
    }
    /* Through the mixin rather than hand-rolled. It did the same two steps in
       the same order, and doing them here meant the control could not be
       owned: writing `value` is how a consumer says it is theirs, so a listbox
       writing its own would take ownership away from them on every change. */
    this.requestValue(joined)
  }

  private readonly handleSelection = (event: HelixSelectEvent): void => {
    event.stopPropagation()
    this.activeValue = event.detail.value
    this.choose(event.detail.value)
  }

  /**
   * Moves the keyboard, and chooses with it only where that is the pattern.
   *
   * Space and Enter are how a multi-select list chooses, and they are also how
   * a single-select one confirms what the arrows already did, so they act
   * either way rather than being guarded on `multiple`.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const shown = this.shown.filter((option) => !option.disabled)
    if (shown.length === 0) {
      return
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      if (this.activeValue !== '') {
        this.choose(this.activeValue)
      }
      return
    }
    /* The list's own movement keys, plus Enter, which is choosing rather than
       moving and is still the list's: a reader who has narrowed to one option
       expects Enter to take it without leaving the field first. */
    if (!MOVES.has(event.key) && event.key !== 'Enter') {
      return
    }
    event.preventDefault()

    const at = shown.findIndex((option) => option.value === this.activeValue)
    let next = at
    if (event.key === 'ArrowDown') {
      next = at < 0 ? 0 : (at + 1) % shown.length
    } else if (event.key === 'ArrowUp') {
      next = at < 0 ? shown.length - 1 : (at - 1 + shown.length) % shown.length
    } else if (event.key === 'Home') {
      next = 0
    } else {
      next = shown.length - 1
    }

    const target = shown[next]
    if (!target) {
      return
    }
    this.activeValue = target.value
    /* Chosen on the way past only where moving is choosing. With `multiple` a
       reader passing over four options on the way to the fifth did not mean to
       pick all five. */
    if (!this.multiple) {
      this.choose(target.value)
    }
  }

  /** Hides what the filter excludes, and writes the rest onto the options. */
  private place(): void {
    const needle = this.filter.trim().toLowerCase()
    const chosen = new Set(this.values)
    for (const option of this.options) {
      option.hidden = needle !== '' && !option.text.toLowerCase().includes(needle)
      option.selected = chosen.has(option.value)
    }

    /* A group whose options the filter has all hidden goes with them. CSS
       cannot do this: a heading and its options are siblings under the group,
       so the rule would be `:host(:has(...))`, which is dropped at parse time.
       The listbox can, because it is the thing that did the hiding and already
       knows which. Left showing, the picture was a heading over nothing, which
       reads as a group whose contents failed to render. */
    for (const group of this.groups) {
      const inside = this.collect(group.children)
      group.hidden = inside.length > 0 && inside.every((option) => option.hidden)
    }

    /* The keyboard cannot sit on something the filter has hidden, so it moves
       to the first thing still showing rather than nowhere: a list whose active
       option has just been filtered away is a list the next arrow press would
       start from the top of anyway. */
    const shown = this.shown
    if (!shown.some((option) => option.value === this.activeValue)) {
      this.activeValue = shown.find((option) => !option.disabled)?.value ?? ''
    }
    for (const option of this.options) {
      option.active = option.value === this.activeValue
    }

    const matched = shown.length > 0
    if (matched !== this.hasMatches) {
      this.hasMatches = matched
    }

    const active = shown.find((option) => option.value === this.activeValue)
    if (active) {
      const items = this.renderRoot.querySelector<HTMLElement>('[part="items"]')
      scrollItemIntoView(active, { padding: 4, ...(items ? { scroller: items } : {}) })
    }
  }

  /** Reports the answer and the verdict on it. */
  private sync(): void {
    this.internals.setFormValue(this.value === '' ? null : this.value)
    if (this.required && this.value === '') {
      this.internals.setValidity(
        { valueMissing: true },
        'Choose one to continue.',
        this.renderRoot.querySelector<HTMLElement>('[part="items"]') ?? undefined,
      )
    } else {
      this.internals.setValidity({})
    }
    this.refreshFeedback()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleSelection as EventListener)
    this.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelection as EventListener)
    this.removeEventListener('keydown', this.handleKeydown)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // Only the first time, before anything reads it. See `MixinControllerOpen`.
    if (this.filterMode === undefined) {
      this.filterMode = this.filterState !== undefined
    }
    hostAria(this.internals, { label: this.label, role: 'listbox' })
    this.internals.ariaMultiSelectable = this.multiple ? 'true' : null
  }

  /**
   * Points the focused list at the option the keyboard is on.
   *
   * **The gap this closes.** Focus stays on `[part="items"]` while a highlight
   * moves between options, which is the half of the ARIA listbox pattern we
   * had. The other half is saying *which* option, and nothing did: a screen
   * reader heard the list and its selection and never heard the item being
   * moved over. Neither `aria-activedescendant` nor a roving `tabindex` was
   * wired, and the pattern requires one of the two.
   *
   * **An element reference and not an id, because an IDREF cannot do this.**
   * The options are the consumer's light DOM and the element that takes focus
   * is in this shadow root, so `aria-activedescendant="whatever"` resolves
   * against the shadow tree, finds nothing, and is dropped in silence. Element
   * references are the platform's answer to exactly that, and they resolve
   * outward: a shadow-tree element may point at a light-DOM one, which is the
   * direction this needs.
   *
   * Feature-tested rather than assumed, for the reason `hostAria` gives:
   * assigning to a property an engine does not implement is a no-op rather than
   * an error, so the guard is what makes the absence visible to anyone reading
   * this. Where it is missing the list still works and still announces its
   * selection; what is lost is the running commentary as the keys move.
   */
  private linkActive(): void {
    const list = this.renderRoot.querySelector('[part="items"]')
    if (!list || !('ariaActiveDescendantElement' in list)) {
      return
    }
    const active = this.options.find((option) => option.value === this.activeValue)
    ;(
      list as Element & { ariaActiveDescendantElement: Element | null }
    ).ariaActiveDescendantElement = active ?? null
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.place()
    this.sync()
    this.linkHost()
    this.linkActive()
  }

  /**
   * Narrows the list as the reader types, announcing it first.
   *
   * `helix-filter` and not `helix-change`, because nothing about the value
   * changes: the options are hidden rather than removed, and telling a consumer
   * their answer moved when it did not is worse than telling them nothing. It
   * told them nothing before this.
   */
  private readonly handleFilter = (event: Event): void => {
    const control = event.target as HTMLInputElement
    this.requestFilter(control.value)
    if (control.value !== this.filter) {
      control.value = this.filter
    }
  }

  /** Requests a narrowing, and reports whether the request stood. */
  requestFilter(next: string): boolean {
    if (next === this.filter) {
      return true
    }
    return requestControlledChange({
      apply: (value) => {
        if (this.filterIsControlled) {
          return
        }
        const previous = this.filter
        this.filterState = value
        this.requestUpdate('filter', previous)
      },
      controlled: this.filterIsControlled,
      event: (value) => new HelixFilterEvent({ value }),
      host: this,
      label: 'filter',
      next,
      read: () => this.filter,
    })
  }

  /**
   * Sends the keys that belong to the list to the list.
   *
   * A reader filtering is still choosing: they type two letters and press Down
   * to reach what is left, and the field would otherwise swallow it because the
   * arrows move a caret. Typing keys stay with the field, which is what makes
   * this different from forwarding everything.
   *
   * Escape clears rather than closing. What frames the list may close on Escape
   * too, so this stops the event when there is something to clear: one press
   * empties the filter, a second reaches whatever is above and closes it. A
   * filter that closed the panel would lose the reader's place for a keystroke
   * they meant as an undo.
   */
  private readonly handleFilterKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.filter !== '') {
      /* Stopped and prevented whether or not the clearing stands. The reader
         pressed Escape at a filtered list, so the key was for this list either
         way, and letting it through to close the surface around it would be a
         second thing happening from one press. */
      event.stopPropagation()
      event.preventDefault()
      this.requestFilter('')
      return
    }
    if (!MOVES.has(event.key)) {
      return
    }
    event.preventDefault()
    this.renderRoot.querySelector<HTMLElement>('[part="items"]')?.focus()
    this.renderRoot
      .querySelector<HTMLElement>('[part="items"]')
      ?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: event.key }))
  }

  /**
   * Focusing the host focuses the list inside it.
   *
   * The focusable node is `[part="items"]`, a div in this shadow root, and a
   * caller outside has no way to reach it: `select` opened its panel and called
   * `.focus()` on this element, which is not focusable, so focus stayed on the
   * trigger and the arrow keys never reached the options at all. Delegation is
   * the platform answering that, and it keeps `document.activeElement` on the
   * host, which is what a caller reasons about.
   */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixFormElement.shadowRootOptions,
    delegatesFocus: true,
  }

  protected override render(): TemplateResult {
    /* One tab stop for the whole list, which is what a listbox is in the tab
       order: the arrows move within it. `tabindex` on the wrapper rather than
       the host so the host stays as the consumer wrote it. */
    return html`${this.renderGroupLabel()}
      ${
        this.filterable
          ? html`<div part="search">
              <input
                part="search-field"
                type="text"
                autocomplete="off"
                spellcheck="false"
                .value=${this.filter}
                placeholder=${this.filterLabel}
                aria-label=${this.filterLabel}
                aria-controls="items"
                ?disabled=${this.isDisabled}
                @input=${this.handleFilter}
                @keydown=${this.handleFilterKeydown}
              />
            </div>`
          : ''
      }
      <div part="items" id="items" tabindex=${this.disabled ? -1 : 0}>
        <slot @slotchange=${() => this.place()}></slot>
        ${this.filter !== '' && !this.hasMatches ? html`<p part="empty">${this.emptyText}</p>` : ''}
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-listbox': HelixBaseListbox
  }
}
