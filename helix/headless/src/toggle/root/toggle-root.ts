import { customElement, HelixElement, HelixSelectionChangeEvent } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One option in a toggle group.
 *
 * @description
 * Renders a `<button role="radio">`, or nothing at all when `link` is set and
 * the consumer supplies their own interactive element.
 *
 * **It never renders an anchor.** A framework's router has to render its own
 * `<a>` to intercept a click, and it cannot render one inside this component's
 * shadow root, so a component that renders the anchor itself forces every
 * navigation to be a full page load. Wrapping the router's link in this one
 * instead nests an anchor inside an anchor. So the component styles the element
 * it is given: `link` says the consumer brings the interactive element, and
 * this renders a bare slot around it.
 *
 * Roving `tabindex` applies only to the radio form. A set of links is not a
 * composite widget, and taking every link but one out of the tab order would be
 * wrong for a navigation landmark; arrow keys still move between them, because
 * the group calls `focusItem`.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Segment, NavItem, Option
 * @documentation https://helix.fusion.dev/components/toggle
 *
 * @slot - The item's label, or the consumer's own link when `link` is set.
 *
 * @csspart item - The radio button. Absent in the `link` form, where the
 * consumer's own element is the item and is styled through `::slotted`.
 *
 * @event {HelixSelectionChangeEvent} SelectionChange - Fired when the item is chosen.
 */
@customElement('helix-base-toggle')
export class HelixBaseToggle extends HelixElement {
  /** Identifies the item to the group. */
  @property()
  value = ''

  /**
   * Whether the consumer supplies the interactive element.
   *
   * Declared rather than detected, because detection would have to read the
   * assigned nodes and the server cannot: it would render the radio, then swap
   * to a slot on upgrade, which is a nested anchor inside a button for as long
   * as that takes.
   */
  @property({ reflect: true, type: Boolean })
  link = false

  /** Whether this item is the current one. */
  @property({ reflect: true, type: Boolean })
  selected = false

  /** Whether the item can be chosen. */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /** The element that takes focus: the radio, or whatever was slotted. */
  private get target(): HTMLElement | undefined {
    if (!this.link) {
      return this.renderRoot.querySelector<HTMLElement>('[part="item"]') ?? undefined
    }
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot')
    return slot?.assignedElements()[0] as HTMLElement | undefined
  }

  /** Moves focus to this item. */
  focusItem(): void {
    this.target?.focus()
  }

  /** Chooses this item and announces it. */
  select(): void {
    if (this.disabled) {
      return
    }
    this.dispatchEvent(new HelixSelectionChangeEvent({ value: this.value }))
  }

  /**
   * Announces a press on the consumer's own element.
   *
   * Only in the `link` form: the radio form has its own listener, and a second
   * one on the host would fire the event twice for one press.
   */
  private readonly handleHostClick = (): void => {
    if (this.link) {
      this.select()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('click', this.handleHostClick)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('click', this.handleHostClick)
  }

  protected override render(): TemplateResult {
    if (this.link) {
      return html`<slot></slot>`
    }

    return html`<button
      part="item"
      type="button"
      role="radio"
      aria-checked=${this.selected ? 'true' : 'false'}
      ?disabled=${this.disabled}
      tabindex=${this.selected ? '0' : '-1'}
      @click=${() => this.select()}
    >
      <slot></slot>
    </button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-toggle': HelixBaseToggle
  }
}
