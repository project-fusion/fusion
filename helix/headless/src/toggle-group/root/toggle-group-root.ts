import { customElement, HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixBaseToggleGroupItem } from '../item/toggle-group-item.js'

/** Keys the group handles, per the APG radio-group pattern. */
const KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'])

/**
 * @summary A row of options with the selection marked by a moving indicator.
 *
 * @description
 * The indicator is one element that travels, not a background that appears on
 * whichever item is current. That difference is the whole point: a fill that
 * swaps is two things changing at once and reads as a flicker, while one that
 * moves is a single object the eye follows, and it says where the selection
 * came from as well as where it went.
 *
 * Its position and width are measured from the selected item and written onto
 * the indicator as custom properties, because labels are different lengths and
 * no proportion of the group is the right answer. Measurement is client-side by
 * necessity, so the server renders the indicator hidden and it fades in once it
 * has somewhere to be, which is the harmless direction: it appears rather than
 * jumping from a wrong place.
 *
 * `nav` makes the group a navigation landmark whose items are links, rather
 * than a radio group. A set of page links that announces itself as a radio
 * group is a lie, and it is the reason this exists rather than tabs being bent
 * to the purpose: a tab controls a panel.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases SegmentedControl, Segmented, NavBar, Switcher
 * @documentation https://helix.fusion.dev/components/toggle-group
 *
 * @slot - The group's items.
 *
 * @csspart indicator - The moving marker behind the selected item.
 *
 * @event {HelixSelectionChangeEvent} SelectionChange - Fired when an item is chosen. Dispatched by the item and listened for here.
 */
@customElement('helix-base-toggle-group')
export class HelixBaseToggleGroup extends HelixElement {
  /** Accessible name for the group. */
  @property()
  label = 'Options'

  /** Value of the selected item. */
  @property()
  value = ''

  /** Renders items as links in a navigation landmark rather than as radios. */
  @property({ reflect: true, type: Boolean })
  nav = false

  private observer: ResizeObserver | undefined

  private get items(): HelixBaseToggleGroupItem[] {
    return [...this.children].filter(
      (child): child is HelixBaseToggleGroupItem => child instanceof HelixBaseToggleGroupItem,
    )
  }

  private readonly handleSelection = (event: Event): void => {
    this.value = (event as CustomEvent<{ value: string }>).detail.value
  }

  /**
   * Measures the selected item and writes the geometry onto the indicator.
   *
   * Offsets rather than a proportion of the group: labels have different
   * lengths, so no fraction is the right answer for all of them.
   */
  private place(): void {
    const items = this.items
    const active = items.find((item) => item.value === this.value) ?? items[0]
    for (const item of items) {
      item.selected = item === active
    }
    if (!active) {
      return
    }
    const box = active.getBoundingClientRect()
    const own = this.getBoundingClientRect()
    if (box.width === 0) {
      return
    }

    // On the indicator rather than the host. The geometry is only readable
    // after layout, so it is written after the element upgrades, and anything
    // written to the host at that point is an attribute a React consumer's
    // server markup never had. The shadow root is invisible to hydration.
    const indicator = this.renderRoot.querySelector<HTMLElement>('[part="indicator"]')
    if (!indicator) {
      return
    }
    indicator.style.setProperty('--_indicator-x', `${box.left - own.left}px`)
    indicator.style.setProperty('--_indicator-w', `${box.width}px`)
    indicator.toggleAttribute('data-placed', true)
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (!KEYS.has(event.key)) {
      return
    }
    const items = this.items.filter((item) => !item.disabled)
    const current = items.findIndex((item) => item.selected)
    if (current === -1) {
      return
    }

    let next = current
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = (current + 1) % items.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = (current - 1 + items.length) % items.length
    } else if (event.key === 'Home') {
      next = 0
    } else {
      next = items.length - 1
    }

    event.preventDefault()
    const target = items[next]
    target?.focusItem()
    target?.select()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('SelectionChange', this.handleSelection)
    this.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('SelectionChange', this.handleSelection)
    this.removeEventListener('keydown', this.handleKeydown)
    this.observer?.disconnect()
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.place()
    // The indicator has to follow a label that rewrapped or a font that loaded
    // late, neither of which fires an event of its own.
    this.observer = new ResizeObserver(() => this.place())
    this.observer.observe(this)
    for (const item of this.items) {
      this.observer.observe(item)
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    // `nav` swaps the template branch, which builds a fresh indicator with no
    // geometry on it, so it has to be measured again.
    if (changed.has('value') || changed.has('nav')) {
      this.place()
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // Through internals, so nothing lands on the host as an attribute. A nav
    // renders a real `<nav>` in the shadow root and takes its semantics from
    // that, so the host stays neutral.
    this.internals.role = this.nav ? null : 'radiogroup'
    this.internals.ariaLabel = this.nav ? null : this.label
  }

  protected override render(): TemplateResult {
    const items = html`<div part="indicator" aria-hidden="true"></div>
      <slot @slotchange=${() => this.place()}></slot>`
    return this.nav ? html`<nav aria-label=${this.label}>${items}</nav>` : items
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-toggle-group': HelixBaseToggleGroup
  }
}
