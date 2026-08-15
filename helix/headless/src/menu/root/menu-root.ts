import {
  customElement,
  DismissController,
  FloatingController,
  HelixElement,
  MixinControllerOpen,
  type Placement,
  scrollItemIntoView,
} from '@helix-io/core'
import { caretLeft } from '@helix-io/icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
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
 * @csspart header - The bar above a submenu, holding the way back and its name.
 * @csspart back - The control that returns from a submenu.
 * @csspart title - The name of the submenu that is showing.
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

  /**
   * The element the surface opens against.
   *
   * Past a wrapper that draws no box of its own. `display: contents` puts an
   * element's children in the layout and leaves the element without one, so its
   * `getBoundingClientRect()` is `0 0 0 0`: measured, a tooltip host reports
   * exactly that while the button inside it reports 32 by 32. Anchoring to it
   * would open the menu against the top left of the window, and focusing it on
   * close would put focus nowhere.
   *
   * That matters because wrapping is how a tooltip attaches to what it
   * describes, so without this an icon button used as a trigger is the one
   * button on a toolbar that cannot have one. Descending is the whole fix: the
   * wrapper is transparent by construction, so the thing with the box is the
   * thing the reader is pointing at.
   */
  private get trigger(): HTMLElement {
    const slot = this.renderRoot.querySelector('slot[name="trigger"]') as HTMLSlotElement | null
    const assigned = slot?.assignedElements({ flatten: true })[0] as HTMLElement | undefined
    if (!assigned) {
      return this
    }
    let element = assigned
    // A guard rather than a `while (true)`: a chain of box-less wrappers is
    // already unusual and an unbounded walk over a tree we do not own is worse
    // than stopping.
    for (let depth = 0; depth < 4; depth += 1) {
      const child = element.firstElementChild as HTMLElement | null
      if (!child || element.getClientRects().length > 0) {
        return element
      }
      element = child
    }
    return element
  }

  private get surface(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part="menu"]')
  }

  /**
   * What the page showing is called.
   *
   * The item's own text and not its subtree: a row that opens a page contains
   * that page's rows, so `textContent` would read back the whole submenu.
   */
  private get pageLabel(): string {
    return [...(this.page?.childNodes ?? [])]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ')
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
  /**
   * Focuses an item and brings it into the surface, which is not the same act.
   *
   * A menu long enough to scroll had the tree's problem: the arrow keys moved
   * focus past the bottom of the panel and the panel stayed where it was.
   * Scrolled here rather than by the browser, because `scrollIntoView` would
   * take the page behind the menu with it.
   */
  private reveal(item: HelixBaseMenuItem | undefined): void {
    if (!item) {
      return
    }
    item.focus()
    const surface = this.renderRoot.querySelector<HTMLElement>('[part="surface"]')
    scrollItemIntoView(item, { padding: 4, ...(surface ? { scroller: surface } : {}) })
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const items = this.items
    const at = items.indexOf(document.activeElement as HelixBaseMenuItem)

    if (event.key === 'Escape') {
      event.stopPropagation()
      this.leave()
    } else if (event.key === 'ArrowDown') {
      this.reveal(items[(at + 1) % items.length])
    } else if (event.key === 'ArrowUp') {
      this.reveal(items[(at - 1 + items.length) % items.length])
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
      item.showingSubmenu = this.page === child
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
        data-drilled=${this.page === null ? nothing : ''}
        ?hidden=${!this.isOpen}
      >
        ${
          // A header rather than a row in the list. The way back is not one of
          // the things on this page, and putting it in the list means an arrow
          // press lands on it as though it were.
          this.page === null
            ? nothing
            : html`<div part="header">
                <button
                  part="back"
                  type="button"
                  aria-label=${this.backLabel}
                  @click=${() => this.leave()}
                >
                  <svg fill="currentColor" viewBox=${caretLeft.viewBox} aria-hidden="true">
                    ${unsafeSVG(caretLeft.content)}
                  </svg>
                </button>
                <span part="title">${this.pageLabel}</span>
              </div>`
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
