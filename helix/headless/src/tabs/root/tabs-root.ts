import {
  customElement,
  HelixElement,
  IndicatorController,
  KeyboardNavigationController,
  MixinControllerActive,
  whenHydrated,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixHeadlessTabPanel } from '../panel/tab-panel.js'
import { HelixHeadlessTab } from '../tab/tab.js'

/**
 * @summary A row of tabs and the panel each one shows.
 *
 * @description
 * Selection is coordinated by event, the same shape the accordion and the tree
 * use: a tab dispatches `helix-select` and the root pairs it with the panel of
 * the same value. Nothing registers with anything, so tabs added later work
 * without the root being told.
 *
 * The tab list is a single tab stop, moved with the arrow keys through
 * `KeyboardNavigationController`, the same one the radio and toggle groups use.
 * Selection follows focus, which is the right default for a small set where
 * showing a panel is cheap; a set where it is not should use `manual`.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases TabList, Segmented control
 * @documentation https://fusion.dev/helix/components/tabs
 *
 * @slot - The tabs, which are this element's own children.
 * @slot panels - The panels, which are this element's own children. A wrapper around them is assigned to the slot and pairs with nothing, since the pairing walks these children rather than the slot's tree.
 *
 * @event {HelixActivateEvent} helix-activate - Fired once the current one has moved, so the element already holds it.
 * @event {HelixBeforeActivateEvent} helix-before-activate - Fired before the current tab moves, and cancelable. The only way to refuse one.
 * @event {HelixSelectEvent} helix-select - Fired when a tab is chosen. Dispatched by the tab and listened for here, because the root is what a consumer holds. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart indicator - The mark that travels to the selected tab.
 * @csspart panels - The panel container.
 * @csspart tabs - The tab list.
 */
@customElement('helix-headless-tabs')
export class HelixHeadlessTabs extends MixinControllerActive(HelixElement) {
  /* Arrow keys, Home and End. Same controller as the radio group and the toggle
     group: `origin: 'focus'` because `manual` lets focus and selection diverge,
     and `selects` because `manual` is what decides whether arriving chooses. */
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () => this.tabs,
    origin: 'focus',
    selects: () => !this.manual,
  })

  /* The mark. Same controller as the nav bar, the toggle group and the page nav.
     The tabs are watched as well as the host, since a tab can change width
     inside a strip that keeps its size; read again on every placement, because
     they have not upgraded by the first one. */
  private readonly indicator = new IndicatorController(this, {
    active: () => this.tabs.find((tab) => tab.selected),
    indicator: () => this.partNamed('indicator'),
    observe: () => this.tabs,
    surface: () => this.partNamed('tabs'),
  })

  /**
   * Accessible name for the tab list.
   */
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

  /**
   * How the row reads.
   *
   * Unset is a raised pill on the selected tab with nothing behind the row,
   * which is what a set sitting inside other chrome wants. `underlined` is a
   * rule under the row and a thicker one under the selected tab, for a set that
   * heads a page. `segmented` puts the pill in a framed, sunken track, which
   * reads as one control rather than as a row.
   *
   * A value describes itself rather than naming another component: `segmented`
   * and `underlined` are participles reading as a pair, the way `outlined` on
   * Accordion does.
   *
   * **`segmented` is `ToggleGroup`'s track, opted into.** The two draw the same
   * groove, token for token, and the sheets already say so where the height is
   * fixed. What differs is polarity, and both are right: a group of toggles is
   * one control, so its track is the resting state and its `separation` decides
   * only the frame around it, while a row of tabs is a row until something says
   * otherwise, so the track is a value here rather than the thing a value takes
   * away.
   *
   * Reflected and left unset by default, so the host carries nothing a
   * consumer's server markup does not already have.
   */
  @property({ reflect: true })
  variant?: 'segmented' | 'underlined'

  private get tabs(): HelixHeadlessTab[] {
    return [...this.children].filter(
      (child): child is HelixHeadlessTab => child instanceof HelixHeadlessTab,
    )
  }

  private get panels(): HelixHeadlessTabPanel[] {
    return [...this.children].filter(
      (child): child is HelixHeadlessTabPanel => child instanceof HelixHeadlessTabPanel,
    )
  }

  /* Through the mixin, so a consumer can refuse the change. Moving `active`
     straight from the event leaves `helix-before-activate` an announcement
     nobody can answer.

     **And only if the tab's own choice stood.** `helix-select` is cancelable
     and the tab documents it as refusable; this element is the only thing that
     acts on it, so a refusal nothing read was a veto that did nothing. Read
     here rather than a microtask later, which is the difference from `Menu`:
     that listener runs in capture, ahead of a consumer's on the same host, and
     this one is a bubble listener for an event from a child, so every listener
     on the tab has already run by the time it arrives. A consumer on this
     element refuses with `helix-before-activate` instead, which the mixin
     dispatches below. */
  private readonly handleSelection = (event: Event): void => {
    if (event.defaultPrevented) {
      return
    }
    this.requestActive((event as CustomEvent<{ value: string }>).detail.value)
  }

  /** Pushes the current value down to whichever tab and panel own it. */
  private sync(): void {
    const tabs = this.tabs
    /* **The markup's own answer wins where nothing has set `active`, and that
       is the case a server renders.** This element cannot choose a tab on the
       server, having no children to count, so a consumer whose first paint is
       right wrote `selected` on the tab and the panel themselves. Resolving
       unconditionally then overruled them one frame later: `active` is `''`,
       nothing matches it, and the fallback moved a set served on its third tab
       onto its first. `Steps` answers the same question by returning early, and
       returning early is not available here, the panels also taking their name
       from the tab that opens them.

       A written `active` still wins, a declared property being a seed and a
       correction, and a set with neither still opens on the first enabled tab. */
    const declared = this.active === '' ? tabs.find((tab) => tab.selected) : undefined
    /* Through the mixin, which also skips a disabled first tab. A hand-written
       fallback to the first child shows a disabled tab as current and opens its
       panel with it. */
    const value = (declared ?? this.resolveActive(tabs))?.value ?? ''
    /* Not into a tab or a panel still hydrating what a server sent: see
       `whenHydrated`. `Steps` writes into its children the same way. Both sides
       read `childrenKnown` now, so a hydrating child renders a strip every tab
       can be tabbed to and a panel that is open, which is what the server sent;
       writing into that render is the mark the markup never showed. */
    for (const tab of tabs) {
      const selected = tab.value === value
      whenHydrated(tab, () => {
        tab.selected = selected
      })
    }
    /* The panel's name comes from its tab, and only this element sees both.
       Read from the tab's light DOM, which is where the consumer wrote the
       words, so it is whatever the reader sees on the tab. */
    const names = new Map(tabs.map((tab) => [tab.value, (tab.textContent ?? '').trim()]))
    for (const panel of this.panels) {
      const selected = panel.value === value
      const label = names.get(panel.value) ?? ''
      whenHydrated(panel, () => {
        panel.selected = selected
        panel.label = label
      })
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleSelection)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelection)
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
  }

  /**
   * The set changed: pair it up and measure it.
   *
   * Both, and dropping `place()` leaves an indicator unplaced for the life
   * of the page. The order of events is what does it: the host renders and
   * measures before its tabs have upgraded, so there is no selected tab to
   * measure and `place` refuses; the ResizeObserver's one initial callback
   * lands in that same gap; and then the tabs upgrade, `slotchange` pairs them,
   * nothing measures, and nothing ever will again, because the host's size
   * never changes.
   *
   * Invisible in every example, because a tab strip that is only tabs is
   * exactly as tall as its tabs, so a mark at the top of the strip is a mark on
   * the tab. It shows only where something gives the strip a height of its own.
   */
  private readonly handleSlotChange = (): void => {
    this.sync()
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
    'helix-headless-tabs': HelixHeadlessTabs
  }
}
