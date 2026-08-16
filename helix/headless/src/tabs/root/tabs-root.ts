import { customElement, HelixElement, MixinControllerActive } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixBaseTabsPanel } from '../panel/tabs-panel.js'
import { HelixBaseTabsTab } from '../tab/tabs-tab.js'

/** Keys the tab list handles, per the APG tabs pattern. */
const KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End'])

/**
 * @summary A row of tabs and the panel each one shows.
 *
 * @description
 * Selection is coordinated by event, the same shape the accordion and the tree
 * use: a tab dispatches `SelectionChange` and the root pairs it with the panel
 * of the same value. Nothing registers with anything, so tabs added later work
 * without the root being told.
 *
 * The tab list is a single tab stop, moved with the arrow keys. Selection
 * follows focus, which is the right default for a small set where showing a
 * panel is cheap; a set where it is not should use `manual`.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases TabList, Segmented control
 * @documentation https://helix.fusion.dev/components/tabs
 *
 * @slot - The tabs.
 * @slot panels - The panels.
 *
 * @csspart tabs - The tab list.
 * @csspart panels - The panel container.
 *
 * @event {HelixSelectEvent} helix-select - Fired when a tab is chosen. Dispatched by the tab and listened for here, because the root is what a consumer holds.
 */
@customElement('helix-base-tabs')
export class HelixBaseTabs extends MixinControllerActive(HelixElement) {
  /**
   * How the row reads.
   *
   * Unset is a raised pill on the selected tab with nothing behind the row,
   * which is what a set sitting inside other chrome wants. `underline` is a
   * rule under the row and a thicker one under the selected tab, for a set that
   * heads a page. `toggle` puts the pill in a framed, sunken track, which reads
   * as one control rather than as a row.
   *
   * Reflected and left unset by default, so the host carries nothing a
   * consumer's server markup does not already have.
   */
  @property({ reflect: true })
  appearance?: 'toggle' | 'underline'

  /** Accessible name for the tab list. */
  @property()
  label = 'Tabs'

  /**
   * Whether arrowing to a tab also selects it.
   *
   * Automatic is the default because showing a panel is usually cheap. Set this
   * where it is not, so a reader arrowing past four tabs does not load four
   * panels on the way.
   */
  @property({ reflect: true, type: Boolean })
  manual = false

  /** Watches for anything that moves a tab, since none of it is a property. */
  private observer: ResizeObserver | undefined

  private get tabs(): HelixBaseTabsTab[] {
    return [...this.children].filter(
      (child): child is HelixBaseTabsTab => child instanceof HelixBaseTabsTab,
    )
  }

  private get panels(): HelixBaseTabsPanel[] {
    return [...this.children].filter(
      (child): child is HelixBaseTabsPanel => child instanceof HelixBaseTabsPanel,
    )
  }

  /* Through the mixin, so a consumer can refuse the change. It was written
     straight from the event, which meant `helix-change` was an announcement
     nobody could answer, while `Radio.Group` two folders away could be. */
  private readonly handleSelection = (event: Event): void => {
    this.requestActive((event as CustomEvent<{ value: string }>).detail.value)
  }

  /** Pushes the current value down to whichever tab and panel own it. */
  private sync(): void {
    const tabs = this.tabs
    /* Through the mixin, which also skips a disabled first tab. The
       hand-written fallback did not, so a set opening on a disabled tab showed
       it as current and its panel with it. */
    const value = this.resolveActive(tabs)?.value ?? ''
    for (const tab of tabs) {
      tab.selected = tab.value === value
    }
    for (const panel of this.panels) {
      panel.selected = panel.value === value
    }
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (!KEYS.has(event.key)) {
      return
    }
    const tabs = this.tabs.filter((tab) => !tab.disabled)
    const current = tabs.findIndex((tab) => tab.selected)
    if (current === -1) {
      return
    }

    let next = current
    if (event.key === 'ArrowRight') {
      next = (current + 1) % tabs.length
    } else if (event.key === 'ArrowLeft') {
      next = (current - 1 + tabs.length) % tabs.length
    } else if (event.key === 'Home') {
      next = 0
    } else {
      next = tabs.length - 1
    }

    event.preventDefault()
    const target = tabs[next]
    target?.focusTab()
    if (!this.manual) {
      target?.select()
    }
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
    this.observer = undefined
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.sync()
    /* Straight away, and again after a frame. The first call is what places it
       in a document that is already laid out; the second covers a first paint
       that has not happened yet, where every tab measures zero and `place`
       refuses rather than writing a wrong position.

       Not the frame alone: `requestAnimationFrame` does not run in a document
       the browser is not painting, so a tab set rendered in a hidden tab or an
       inactive pane would never place its mark at all and would slide in from
       the origin the moment the page was looked at. */
    this.place()
    requestAnimationFrame(() => this.place())
    this.observer = new ResizeObserver(() => this.place())
    this.observer.observe(this)
    this.watch()
  }

  /**
   * Watches every tab for a change of size.
   *
   * Called again whenever the set changes, because `tabs` reads `this.children`
   * and filters on `instanceof`, so it is empty until the tab elements upgrade.
   * At `firstUpdated` it frequently is empty, and observing nothing is silent.
   *
   * `observe` is idempotent per element, so re-running this costs nothing and
   * needs no bookkeeping about which tabs are already watched.
   */
  private watch(): void {
    for (const tab of this.tabs) {
      this.observer?.observe(tab)
    }
  }

  /**
   * The set changed: pair it up, watch it, and measure it.
   *
   * All three, where this used to be `sync()` alone, and the missing `place()`
   * is why an indicator could stay unplaced for the life of the page. The order
   * of events is what does it: the host renders and measures before its tabs
   * have upgraded, so there is no selected tab to measure and `place` refuses;
   * the ResizeObserver's one initial callback lands in that same gap; and then
   * the tabs upgrade, `slotchange` pairs them, nothing measures, and nothing
   * ever will again, because the host's size never changes.
   *
   * Invisible in every example, because a tab strip that is only tabs is
   * exactly as tall as its tabs, so a mark at the top of the strip is a mark on
   * the tab. It showed up where something gives the strip a height of its own.
   */
  private readonly handleSlotChange = (): void => {
    this.sync()
    this.watch()
    this.place()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('value')) {
      this.sync()
    }
    this.place()
  }

  /**
   * Measures the selected tab and writes the geometry onto the indicator.
   *
   * One element that travels, rather than a border on each tab. A border can
   * only appear and disappear; a single mark can move, and moving is what says
   * the two tabs are places in one set rather than two separate states.
   *
   * Written onto the indicator rather than the host, for the reason the toggle
   * group gives: geometry is only readable after layout, and anything written
   * to the host then is an attribute a server's markup never had.
   */
  private place(): void {
    const strip = this.renderRoot?.querySelector<HTMLElement>('[part="tabs"]')
    const indicator = this.renderRoot?.querySelector<HTMLElement>('[part="indicator"]')
    const active = this.tabs.find((tab) => tab.selected)
    if (!strip || !indicator || !active) {
      return
    }
    const box = active.getBoundingClientRect()
    const own = strip.getBoundingClientRect()
    if (box.width === 0) {
      return
    }
    /* Along the inline axis rather than the page's left, and offset by the
       strip's own scroll: the tabs scroll inside it, so a distance taken from
       the viewport drifts by however far it has been scrolled. */
    /* Less the border, because the two boxes are not the same box: an
       absolutely positioned element is placed against its containing block's
       *padding* box, which starts one border in, while `getBoundingClientRect`
       gives the border box. The segmented set has a bordered track, so its mark
       sat a pixel inside the tab it marks. The same arithmetic the toggle
       group's indicator does, and the third time this repo has met it. */
    const style = getComputedStyle(strip)
    const rtl = style.direction === 'rtl'
    const borderStart = Number.parseFloat(rtl ? style.borderRightWidth : style.borderLeftWidth)
    const inline = rtl ? own.right - box.right - borderStart : box.left - own.left - borderStart
    indicator.style.setProperty('--_indicator-x', `${rtl ? -inline : inline}px`)
    indicator.style.setProperty('--_indicator-w', `${box.width}px`)
    /* The height too, because the same mark serves both shapes: a bar along the
       bottom for the underline set, and a pill filling the tab for the
       segmented one. Two appearances, one thing that moves. */
    indicator.style.setProperty('--_indicator-h', `${box.height}px`)
    indicator.style.setProperty('--_indicator-y', `${box.top - own.top - strip.clientTop}px`)
    indicator.toggleAttribute('data-placed', true)
  }

  protected override render(): TemplateResult {
    return html`<div part="tabs" role="tablist" aria-label=${this.label}>
        <slot @slotchange=${this.handleSlotChange}></slot>
        <span part="indicator" aria-hidden="true"></span>
      </div>
      <div part="panels"><slot name="panels" @slotchange=${this.handleSlotChange}></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-tabs': HelixBaseTabs
  }
}
