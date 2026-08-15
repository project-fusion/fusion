import { customElement, HelixFormElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixBaseToggle } from '../root/toggle-root.js'

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
 * Its whole box is measured from the selected item and written onto
 * the indicator as custom properties, because labels are different lengths and
 * no proportion of the group is the right answer. Measurement is client-side by
 * necessity, so the server renders the indicator hidden and it fades in once it
 * has somewhere to be, which is the harmless direction: it appears rather than
 * jumping from a wrong place.
 *
 * A radio group, and only that. Navigation is links marked with `aria-current`
 * and styled by the `data-nav-item` recipe: radio semantics would announce a
 * set of destinations as a set of choices. A tab controls a panel.
 *
 * Being a radio group, it is a form control, and it says so through
 * `HelixFormElement`: it reports its value under a `name`, comes back to the
 * markup's choice on reset, and restores the one a reader made when the browser
 * brings a form back.
 *
 * The semantics were already right: the host has carried `role="radiogroup"`
 * and the items `role="radio"` from the start. What none of it did was reach a
 * form. A button in a shadow root submits nothing whatever its role, so the
 * value has to be reported by the host, which is the only thing a form can
 * see.
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
 * @event {HelixSelectEvent} helix-select - Fired when an item is chosen. Dispatched by the item and listened for here.
 */
@customElement('helix-base-toggle-group')
export class HelixBaseToggleGroup extends HelixFormElement {
  /**
   * The value the markup declared, which is the one a reset returns to.
   *
   * Separate from `value` for the reason `defaultChecked` is separate from
   * `checked`: `value` is where the control is now, and a reset needs to know
   * where it started, which is gone the moment anything is chosen.
   */
  @property({ attribute: 'default-value' })
  defaultValue = ''

  /** Accessible name for the group. */
  @property()
  label = 'Options'

  /** Name the group reports under when its form is submitted. */
  @property()
  name = ''

  /** Value of the selected item. */
  @property()
  value = ''

  private observer: ResizeObserver | undefined

  private get items(): HelixBaseToggle[] {
    return [...this.children].filter(
      (child): child is HelixBaseToggle => child instanceof HelixBaseToggle,
    )
  }

  /**
   * Watches the group and every item it currently holds.
   *
   * Called again on `slotchange`, because the set was read once at first paint:
   * an item added later was measured by nothing, so a group whose options
   * arrive with the data had a thumb that stopped following the moment one of
   * them changed width. Observing the same element twice is a no-op, so there
   * is nothing to unwind first.
   */
  private watch(): void {
    this.observer?.observe(this)
    for (const item of this.items) {
      this.observer?.observe(item)
    }
  }

  private readonly handleSelection = (event: Event): void => {
    this.value = (event as CustomEvent<{ value: string }>).detail.value
  }

  /** Returns the group to the choice its markup declared. */
  formResetCallback(): void {
    this.value = this.defaultValue
  }

  /** Restores the choice when the browser brings a form back. */
  formStateRestoreCallback(state: string | null): void {
    this.value = state ?? this.defaultValue
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
    /* Less the border, because the two boxes are not the same box.
     *
     * `getBoundingClientRect` gives the border box, and an absolutely
     * positioned element is placed against its containing block's *padding*
     * box, which starts one border in. So an offset measured from the outside
     * and applied from the inside lands a border-width late on both axes: the
     * thumb sat a pixel below and a pixel right of the segment it marks, and in
     * a forty pixel control holding a thirty pixel thumb that is six above and
     * four below. Even gaps are the whole job of a thing that sits in a groove,
     * and a two pixel difference is small enough to read as "the spacing is
     * off" without being obviously a misplacement.
     *
     * `clientTop` and `clientLeft` are the border widths, which is exactly the
     * difference between the two origins.
     */
    /* Measured along the inline axis, not along the page's left.
     *
     * The indicator is pinned with `inset-inline-start`, which is the right
     * edge in a right-to-left group, and moved with `translate`, which is
     * always physical. A distance taken from the left and applied from the
     * right sends the thumb the wrong way and doubles its own offset getting
     * there. So the distance is taken from whichever edge the inset resolves
     * to, and the translate is signed to point inwards from it. */
    const style = getComputedStyle(this)
    const rtl = style.direction === 'rtl'
    const borderStart = Number.parseFloat(rtl ? style.borderRightWidth : style.borderLeftWidth)
    const inline = rtl ? own.right - box.right - borderStart : box.left - own.left - borderStart

    indicator.style.setProperty('--_indicator-x', `${rtl ? -inline : inline}px`)
    indicator.style.setProperty('--_indicator-y', `${box.top - own.top - this.clientTop}px`)
    indicator.style.setProperty('--_indicator-w', `${box.width}px`)
    indicator.style.setProperty('--_indicator-h', `${box.height}px`)
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
    this.addEventListener('helix-select', this.handleSelection)
    this.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelection)
    this.removeEventListener('keydown', this.handleKeydown)
    this.observer?.disconnect()
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.place()
    // The indicator has to follow a label that rewrapped or a font that loaded
    // late, neither of which fires an event of its own.
    this.observer = new ResizeObserver(() => this.place())
    this.watch()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('value')) {
      this.place()
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // Through internals, so nothing lands on the host as an attribute. A nav
    // renders a real `<nav>` in the shadow root and takes its semantics from
    // that, so the host stays neutral.
    this.internals.role = 'radiogroup'
    this.internals.ariaLabel = this.label
    // Once, before anything has been chosen. `default-value` is what the markup
    // asked for, so it is the starting selection as well as the one a reset
    // comes back to; after that it is history and `value` is the answer.
    if (!this.hasUpdated && this.value === '' && this.defaultValue !== '') {
      this.value = this.defaultValue
    }
    // `null` rather than an empty string when nothing is chosen, which is the
    // difference between a control that submits nothing and one that submits a
    // blank.
    this.internals.setFormValue(this.value === '' ? null : this.value)
  }

  protected override render(): TemplateResult {
    return html`<div part="indicator" aria-hidden="true"></div>
      <slot
        @slotchange=${() => {
          this.watch()
          this.place()
        }}
      ></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-toggle-group': HelixBaseToggleGroup
  }
}
