import {
  anchorElement,
  customElement,
  DrilldownController,
  HelixElement,
  MixinControllerOpen,
  type Placement,
  PopoverController,
  scrollItemIntoView,
} from '@helix-io/core'
import { caretLeft } from '@helix-io/icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
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

  /**
   * Which page is showing, and what is on it.
   *
   * This was a `page` field, a title getter and an items getter written here.
   * None of them were about menus: a settings panel or a navigation tree wants
   * the same thing, and could not have it without being a menu. The controller
   * holds the same shape, so the port is a rename rather than a rewrite, and it
   * adds a real stack: `back()` returns one level instead of to the root, which
   * this could not do because it only ever went two deep.
   */
  private readonly drilldown = new DrilldownController<HelixBaseMenuItem>(this, {
    isRow: (element: Element): boolean => 'isMenuItem' in element && element.isMenuItem === true,
    root: () => [...this.children].filter((child) => child.slot !== 'trigger'),
    slot: 'submenu',
  })

  /* One controller where there were two and a hand-written sequence between
     them. It is the same three things in the same order; what it is not is a
     third copy of them, and the second copy is how `Select` ended up never
     reaching the top layer at all. */
  private readonly panel = new PopoverController(this, {
    anchor: () => this.trigger,
    // The host is `display: contents`, so it has no box a press can land in.
    // What counts as inside is the surface, plus the trigger, whose own click
    // handler decides what a press there means.
    boundary: () => this,
    offset: () => this.offset,
    onDismiss: () => this.hide(),
    placement: () => this.placement,
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="menu"]'),
  })

  /** The element the surface opens against. */
  private get trigger(): HTMLElement {
    return anchorElement(
      this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]'),
      this,
    )
  }

  /** The items on the page that is showing, which is what the keys move over. */
  private get items(): HelixBaseMenuItem[] {
    return this.drilldown.rows
  }

  /** Opens the menu. */
  show(): void {
    if (this.isOpen || !this.requestOpen(true)) {
      return
    }
    this.updateComplete.then(() => {
      this.panel.show()
      this.items[0]?.focus()
    })
  }

  /** Closes the menu, and forgets which page was showing. */
  hide(): void {
    if (!this.isOpen || !this.requestOpen(false)) {
      return
    }
    this.panel.hide()
    this.drilldown.reset()
    this.trigger.focus()
  }

  /** Shows an item's submenu in place of the current page. */
  private enter(item: HelixBaseMenuItem): void {
    if (!this.drilldown.enter(item)) {
      return
    }
    this.updateComplete.then(() => this.items[0]?.focus())
  }

  /** Returns to the page above, or closes when there is none. */
  private leave(): void {
    if (this.drilldown.atRoot) {
      this.hide()
      return
    }
    /* Held before going back, because focus returns to the row that opened the
       page being left: a reader who drills in and comes straight out should be
       on the row they pressed, not at the top of a list they have already
       read. */
    const leaving = this.drilldown.page
    this.drilldown.back()
    this.updateComplete.then(() => leaving?.focus())
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
      item.onPage = this.drilldown.atRoot
      item.showingSubmenu = this.drilldown.page === child
      for (const nested of child.children) {
        const inner = nested as HelixBaseMenuItem
        if (inner.isMenuItem === true) {
          inner.onPage = this.drilldown.page === child
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
        data-drilled=${this.drilldown.atRoot ? nothing : ''}
        ?hidden=${!this.isOpen}
      >
        ${
          // A header rather than a row in the list. The way back is not one of
          // the things on this page, and putting it in the list means an arrow
          // press lands on it as though it were.
          this.drilldown.atRoot
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
                <span part="title">${this.drilldown.label}</span>
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
