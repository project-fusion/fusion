import {
  customElement,
  HelixChangeEvent,
  HelixFormElement,
  type HelixSelectEvent,
  hostAria,
  inheritDisabled,
  MixinControllerValue,
  MixinField,
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
 *
 * @csspart label - The question, over the list.
 * @csspart items - The list itself.
 * @csspart empty - Shown when a filter has hidden everything.
 * @csspart hint - Help under the list.
 * @csspart feedback - What is wrong with it.
 */
@customElement('helix-base-listbox')
export class HelixBaseListbox extends MixinControllerValue(MixinField(HelixFormElement)) {
  /** Text the options are matched against. Empty shows them all. */
  @property()
  filter = ''

  /** Whether more than one option can be the answer. */
  @property({ reflect: true, type: Boolean })
  multiple = false

  /** Name the list reports under when its form is submitted. */
  @property()
  name = ''

  /** What is shown when a filter has hidden every option. */
  @property({ attribute: 'empty-text' })
  emptyText = 'No matches'

  /** Which option the keyboard is on, which is not what is chosen. */
  @state()
  private activeValue = ''

  /**
   * Every option, in the order a reader meets them.
   *
   * Descendants rather than children, because a group puts a level between the
   * list and its options and the keyboard has to move through a grouped list
   * exactly as it moves through a flat one.
   */
  get options(): HelixBaseOption[] {
    return [...this.querySelectorAll('*')].filter(
      (node): node is HelixBaseOption => node instanceof HelixBaseOption,
    )
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
    if (!this.dispatchEvent(new HelixChangeEvent({ name: this.name, value: joined }))) {
      return
    }
    this.value = joined
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
    if (!MOVES.has(event.key)) {
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
    inheritDisabled(this.disabled, this.options)

    /* A group whose options the filter has all hidden goes with them. CSS
       cannot do this: a heading and its options are siblings under the group,
       so the rule would be `:host(:has(...))`, which is dropped at parse time.
       The listbox can, because it is the thing that did the hiding and already
       knows which. Left showing, the picture was a heading over nothing, which
       reads as a group whose contents failed to render. */
    for (const group of this.querySelectorAll('*')) {
      if (group instanceof HelixBaseOptionGroup) {
        const inside = [...group.querySelectorAll('*')].filter(
          (node): node is HelixBaseOption => node instanceof HelixBaseOption,
        )
        group.hidden = inside.length > 0 && inside.every((option) => option.hidden)
      }
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
    hostAria(this.internals, { label: this.label, role: 'listbox' })
    this.internals.ariaMultiSelectable = this.multiple ? 'true' : null
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.place()
    this.sync()
    this.linkHost()
  }

  protected override render(): TemplateResult {
    /* One tab stop for the whole list, which is what a listbox is in the tab
       order: the arrows move within it. `tabindex` on the wrapper rather than
       the host so the host stays as the consumer wrote it. */
    return html`${this.renderGroupLabel()}
      <div part="items" tabindex=${this.disabled ? -1 : 0}>
        <slot @slotchange=${() => this.place()}></slot>
        ${
          this.filter !== '' && this.shown.length === 0
            ? html`<p part="empty">${this.emptyText}</p>`
            : ''
        }
      </div>
      ${this.renderHint()}${this.renderFeedback()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-listbox': HelixBaseListbox
  }
}
