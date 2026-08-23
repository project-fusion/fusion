import {
  customElement,
  HelixElement,
  IndicatorController,
  KeyboardNavigationController,
  MixinControllerActive,
} from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixBaseTabsPanel } from '../panel/tabs-panel.js'
import { HelixBaseTabsTab } from '../tab/tabs-tab.js'

/**
 * @summary A row of tabs and the panel each one shows.
 *
 * @description
 * Selection is coordinated by event, the same shape the accordion and the tree
 * use: a tab dispatches `SelectionChange` and the root pairs it with the panel
 * of the same value. Nothing registers with anything, so tabs added later work
 * without the root being told.
 *
 * The tab list is a single tab stop, moved with the arrow keys through
 * `KeyboardNavigationController`, the same one the radio and toggle groups use.
 * Selection follows focus, which is the right default for a small set where
 * showing a panel is cheap; a set where it is not should use `manual`.
 *
 * @since 0.1.0
 * @status experimental
 * @category navigation
 * @aliases TabList, Segmented control
 * @documentation https://helix.fusion.dev/components/tabs
 *
 * @slot - The tabs.
 * @slot panels - The panels.
 *
 * @csspart indicator - The mark that travels to the selected tab.
 * @csspart tabs - The tab list.
 * @csspart panels - The panel container.
 *
 * @event {HelixChangeEvent} helix-change - Fired before the current tab moves, and cancelable. The only way to refuse one.
 * @event {HelixSelectEvent} helix-select - Fired when a tab is chosen. Dispatched by the tab and listened for here, because the root is what a consumer holds.
 */
@customElement('helix-base-tabs')
export class HelixBaseTabs extends MixinControllerActive(HelixElement) {
  /* Arrow keys, Home and End. Same controller as the radio group and the toggle
     group, which is what the audit asked for once the indicator controller had
     landed, and this is the traversal that had to grow it: `origin: 'focus'`
     because `manual` lets focus and selection diverge, and `selects` because
     `manual` is what decides whether arriving chooses.

     Roughly thirty lines of index arithmetic went, and with them the last copy
     of a wrap that had to be right in four places. */
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () => this.tabs,
    origin: 'focus',
    selects: () => !this.manual,
  })

  /* The mark. Same controller as the nav bar, the toggle group and the page nav. */
  private readonly indicator = new IndicatorController(this, {
    active: () => this.tabs.find((tab) => tab.selected),
    indicator: () => this.renderRoot?.querySelector<HTMLElement>('[part="indicator"]'),
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="tabs"]'),
  })

  /**
   * How the row reads.
   *
   * Unset is a raised pill on the selected tab with nothing behind the row,
   * which is what a set sitting inside other chrome wants. `underlined` is a
   * rule under the row and a thicker one under the selected tab, for a set that
   * heads a page. `segmented` puts the pill in a framed, sunken track, which
   * reads as one control rather than as a row.
   *
   * `segmented` and not `toggle`, which is what this was called. An appearance
   * value that is another component's name says "it looks like that one", which
   * a reader can only act on if they already know what that one looks like, and
   * every other appearance in the library describes itself: `outlined`,
   * `spaced`, `plain`. This component's own comments called it segmented in
   * both places it explained itself, which is the name that was doing the work.
   *
   * `underlined` and not `underline` for the shape of the word rather than the
   * sense: the two values sit in one list and read as a pair, and `segmented`
   * is a participle. `outlined` on Accordion is the same word doing the same
   * job. The example file was already `underlined.html`, which is what a reader
   * meets first.
   *
   * Reflected and left unset by default, so the host carries nothing a
   * consumer's server markup does not already have.
   */
  @property({ reflect: true })
  variant?: 'segmented' | 'underlined'

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
    /* The panel's name comes from its tab, and only this element sees both.
       Read from the tab's light DOM, which is where the consumer wrote the
       words, so it is whatever the reader sees on the tab. */
    const names = new Map(tabs.map((tab) => [tab.value, (tab.textContent ?? '').trim()]))
    for (const panel of this.panels) {
      panel.selected = panel.value === value
      panel.label = names.get(panel.value) ?? ''
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleSelection)
    /* The observer is rebuilt here, because nothing else does it.
     *
     * `firstUpdated` runs once for the life of the element and
     * `disconnectedCallback` runs every time it moves, so a framework
     * reordering a list left this permanently dead: the observer gone, nothing
     * to rebuild it, and the component still rendering as though it were
     * watching. Guarded on `hasUpdated`, because the first connection happens
     * before the first render and there is nothing to watch yet.
     * `check:observers` holds it. */
    if (this.hasUpdated) {
      this.measure()
      this.watch()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelection)
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
    this.indicator.place()
    requestAnimationFrame(() => this.indicator.place())
    this.measure()
    this.watch()
  }

  /** The host's own size, which moves every tab and therefore the mark. */
  private measure(): void {
    this.observer?.disconnect()
    this.observer = new ResizeObserver(() => this.indicator.place())
    this.observer.observe(this)
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
    this.indicator.place()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('active')) {
      this.sync()
    }
    this.indicator.place()
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
