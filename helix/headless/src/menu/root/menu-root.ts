import {
  customElement,
  DismissController,
  FloatingController,
  HelixElement,
  MixinControllerOpen,
  type Placement,
} from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { HelixBaseMenuItem } from '../item/menu-item.js'

/**
 * @summary A menu of commands, opened from a trigger.
 *
 * @description
 * The trigger is slotted and stays the consumer's own element, the same way the
 * tooltip takes one. The surface is rendered here, in the top layer through the
 * popover API, so it clears any ancestor with `overflow: hidden` without a
 * `z-index` anywhere.
 *
 * **It drills down rather than flying out.** A submenu replaces what is on
 * screen and a back row returns, instead of opening a second panel beside the
 * first. Panels beside panels need a diagonal path a pointer has to travel
 * without straying, they run off the edge of a narrow window, and on a touch
 * screen there is no hover to open them with at all. One panel that changes
 * what it holds has none of those problems and reads the same on a phone.
 *
 * The open page is held here rather than in each item, because only one page
 * shows at a time and something has to know which. Items are told by property,
 * not by attribute: an attribute written onto a consumer's element after it
 * upgrades is a hydration mismatch waiting to happen.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Dropdown, Action menu
 * @documentation https://helix.fusion.dev/components/menu
 *
 * @slot - The items.
 * @slot trigger - What opens it.
 *
 * @event {HelixOpenEvent} helix-open - Fired before it opens, and cancelable.
 * @event {HelixCloseEvent} helix-close - Fired before it closes, and cancelable.
 * @event {HelixSelectEvent} helix-select - Fired when an item is chosen.
 *
 * @csspart menu - The surface.
 * @csspart back - The row that returns from a submenu.
 */
@customElement('helix-base-menu')
export class HelixBaseMenu extends MixinControllerOpen(HelixElement) {
  /** Preferred side. It moves if that side does not fit. */
  @property()
  placement: Placement = 'bottom-end'

  /** Space between the trigger and the surface, in pixels. */
  @property({ type: Number })
  offset = 4

  /** Accessible name for the surface. */
  @property()
  label = 'Menu'

  /** What the row returning from a submenu reads. */
  @property({ attribute: 'back-label' })
  backLabel = 'Back'

  /** The item whose submenu is showing, if any. */
  @state()
  private page: HelixBaseMenuItem | null = null

  private readonly dismiss = new DismissController(this, {
    // The host is `display: contents`, so it has no box a press can land in.
    // What counts as inside is the surface, plus the trigger, whose own click
    // handler decides what a press there means.
    boundary: () => this,
    onDismiss: () => this.hide(),
  })

  private readonly floating = new FloatingController(this, {
    anchor: () => this.trigger,
    floating: () => this.renderRoot.querySelector<HTMLElement>('[part="menu"]'),
    offset: () => this.offset,
    placement: () => this.placement,
  })

  /** The element the surface opens against. */
  private get trigger(): HTMLElement {
    const slot = this.renderRoot.querySelector('slot[name="trigger"]') as HTMLSlotElement | null
    return (slot?.assignedElements({ flatten: true })[0] as HTMLElement | undefined) ?? this
  }

  private get surface(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part="menu"]')
  }

  /** The items on the page that is showing, which is what the keys move over. */
  private get items(): HelixBaseMenuItem[] {
    const source = this.page
      ? [...this.page.children].filter((child) => child.slot === 'submenu')
      : [...this.children].filter((child) => child.slot !== 'trigger')
    return source.filter(
      (child): child is HelixBaseMenuItem => 'isMenuItem' in child && child.isMenuItem === true,
    )
  }

  /** Opens the menu. */
  show(): void {
    if (this.isOpen || !this.requestOpen(true)) {
      return
    }
    this.updateComplete.then(() => {
      this.surface?.showPopover?.()
      this.floating.start()
      this.dismiss.activate()
      this.items[0]?.focus()
    })
  }

  /** Closes the menu, and forgets which page was showing. */
  hide(): void {
    if (!this.isOpen || !this.requestOpen(false)) {
      return
    }
    this.surface?.hidePopover?.()
    this.floating.stop()
    this.dismiss.deactivate()
    this.page = null
    this.trigger.focus()
  }

  /** Shows an item's submenu in place of the current page. */
  private enter(item: HelixBaseMenuItem): void {
    this.page = item
    this.updateComplete.then(() => this.items[0]?.focus())
  }

  /** Returns to the page above, or closes when there is none. */
  private leave(): void {
    if (this.page === null) {
      this.hide()
      return
    }
    const leaving = this.page
    this.page = null
    this.updateComplete.then(() => leaving.focus())
  }

  private readonly handleSelect = (event: Event): void => {
    const item = event.target
    if (!this.items.includes(item as HelixBaseMenuItem)) {
      return
    }
    const chosen = item as HelixBaseMenuItem
    if (chosen.hasSubmenu) {
      // A row that opens a page has not chosen anything, so its select does not
      // leave this element: a consumer listening for a choice would otherwise
      // hear one every time a reader looked in a submenu.
      event.stopPropagation()
      this.enter(chosen)
      return
    }
    this.hide()
  }

  /**
   * Moves over the page, in the direction the key points.
   *
   * The arrows wrap, because a menu is a ring rather than a list with ends:
   * pressing down on the last item to reach the first is what every menu on
   * every platform does.
   */
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const items = this.items
    const at = items.indexOf(document.activeElement as HelixBaseMenuItem)

    if (event.key === 'Escape') {
      event.stopPropagation()
      this.leave()
    } else if (event.key === 'ArrowDown') {
      items[(at + 1) % items.length]?.focus()
    } else if (event.key === 'ArrowUp') {
      items[(at - 1 + items.length) % items.length]?.focus()
    } else if (event.key === 'Home') {
      items[0]?.focus()
    } else if (event.key === 'End') {
      items.at(-1)?.focus()
    } else if (event.key === 'ArrowRight' && items[at]?.hasSubmenu) {
      this.enter(items[at] as HelixBaseMenuItem)
    } else if (event.key === 'ArrowLeft') {
      this.leave()
    } else {
      return
    }
    event.preventDefault()
  }

  private readonly handleTriggerClick = (): void => {
    if (this.isOpen) {
      this.hide()
    } else {
      this.show()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleSelect)
    this.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelect)
    this.removeEventListener('keydown', this.handleKeydown)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    // Every item shows or hides itself: which page is open is this element's
    // business, and where an item belongs is the item's. Set as a property, so
    // nothing is written onto a consumer's element.
    for (const child of this.children) {
      const item = child as HelixBaseMenuItem
      if (item.isMenuItem !== true) {
        continue
      }
      item.onPage = this.page === null
      for (const nested of child.children) {
        const inner = nested as HelixBaseMenuItem
        if (inner.isMenuItem === true) {
          inner.onPage = this.page === child
        }
      }
    }
  }

  protected override render(): TemplateResult {
    return html`<slot name="trigger" @click=${this.handleTriggerClick}></slot>
      <div
        part="menu"
        popover="manual"
        role="menu"
        aria-label=${this.label}
        ?hidden=${!this.isOpen}
      >
        ${
          this.page === null
            ? ''
            : html`<button part="back" type="button" @click=${() => this.leave()}>
                ${this.backLabel}
              </button>`
        }
        <slot></slot>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-menu': HelixBaseMenu
  }
}
