import {
  AriaForwardController,
  auditName,
  customElement,
  deepActiveElement,
  glyphPath,
  HelixActivateEvent,
  HelixElement,
  IndicatorController,
  isRtl,
  KeyboardNavigationController,
  MIRROR_RULE,
  MixinControllerActive,
  scrollWithin,
  whenHydrated,
} from '@fusion.dev/helix-core'
import { caretDown, caretLeft, caretRight, caretUp } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { HelixHeadlessTabPanel } from '../panel/tab-panel.js'
import { HelixHeadlessTab } from '../tab/tab.js'

/**
 * @summary A row of tabs and the panel each one shows.
 *
 * @description
 * Selection works through an event, the same as in the accordion and the tree.
 * A tab dispatches `helix-before-select`, and the root pairs it with the panel of the
 * same value. Nothing registers with anything, so tabs added later work with no
 * extra setup.
 *
 * The tab list is a single tab stop, and the arrow keys move between tabs
 * through `KeyboardNavigationController`, the same as in the radio and toggle
 * groups. Selection follows focus, which suits a small set where showing a
 * panel is cheap. Set `manual` when showing a panel is expensive, so focus can
 * move without selecting.
 *
 * `orientation="vertical"` sets the tabs in a column beside the panels, and the
 * tab list says `aria-orientation="vertical"`. The arrow keys of both axes move
 * between tabs either way.
 *
 * A tab with an `href` is a link, for tabs that are pages of a site. Pressing
 * it follows the link. Where any tab is a link, the arrow keys move focus
 * without choosing on every tab of the list, as under `manual`, so arrowing
 * past a tab never leaves the page and the list answers the keys one way.
 * Mark the tab of the page you are on with `selected`, or set `active` to its
 * value.
 *
 * Each tab says which panel it controls through `aria-controls`, set as an
 * element reference to the panel's host, where the engine has reflection.
 *
 * Keys, on the tab list: Left and Right Arrow move between tabs, and so do Up
 * and Down; Home and End go to the first and the last. The horizontal arrows
 * follow the reading direction, so on a right-to-left page Left moves on.
 * Disabled tabs are passed over. Tab leaves the list for the selected panel,
 * which is a tab stop only while it holds nothing focusable.
 *
 * **Keyboard.**
 *
 * | Key | What it does |
 * |---|---|
 * | Right, Down | Moves to the next tab, from the last round to the first. Selects it, unless `manual` is set or a tab is a link. |
 * | Left, Up | Moves to the tab before, from the first round to the last. |
 * | Home, End | Moves to the first or the last tab. |
 * | Enter, Space | Selects the tab with focus, or follows its link. |
 * | Tab | Leaves the list for the selected panel. |
 *
 * Removing the selected tab selects the enabled tab beside it, the next one
 * or else the one before, and `active` says so, with `helix-activate`. Where
 * the removed tab had focus, focus moves to the tab now selected.
 *
 * **More tabs than fit.** With `scroll-controls`, a strip that scrolls shows a
 * button at each end it can scroll toward, as Web Awesome's tab group does,
 * and a press scrolls it most of its own length. The buttons are for the
 * pointer, so they are out of the tab order and hidden from screen readers;
 * the arrow keys already reach every tab, and the strip scrolls the selected
 * tab into view. A strip scrolls once a stylesheet gives the `tabs` part an
 * `overflow`, as the styled tier does.
 *
 * A tab with `dismissible` can be closed: see `Tabs.Tab`.
 *
 * **Panels are optional.** A set with none is a strip whose tabs stand for
 * something the page shows elsewhere: the keys, the selection, `active` and
 * `helix-activate` work the same, and no tab names a panel it controls.
 *
 * The `indicator` part moves to the selected tab and carries its place and
 * size, so a mark of your own can be drawn there: style the part, or slot an
 * element into `indicator`, which sits inside the part and reads the same
 * properties.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases TabList, Segmented control
 * @documentation https://fusion.dev/helix/components/tabs
 *
 * @slot - The tabs, as direct children of this element.
 * @slot indicator - A mark of your own, drawn inside the `indicator` part, where `--indicator-x`, `--indicator-y`, `--indicator-inline-size` and `--indicator-block-size` reach it.
 * @slot panels - The panels, as direct children of this element. Panels inside a wrapper are not paired with tabs, because pairing reads only the direct children.
 * @slot scroll-end-icon - Replaces the glyph on the button that scrolls the strip toward its end.
 * @slot scroll-start-icon - Replaces the glyph on the button that scrolls the strip toward its start.
 *
 * @event {HelixActivateEvent} helix-activate - Fired after the active tab changes, so the element already holds the new value.
 * @event {HelixBeforeActivateEvent} helix-before-activate - Fired before the active tab changes, and cancelable. Canceling it is the only way to block a change.
 * @event {HelixBeforeSelectEvent} helix-before-select - Fired when a tab is chosen. The tab sends it and the root handles it, so you can listen on the root. Cancelable: canceling it stops the change and leaves the decision to you.
 *
 * @csspart indicator - The marker that moves to the selected tab. It carries the selected tab's
 *   place and size as `--indicator-x`, `--indicator-y`, `--indicator-inline-size` and
 *   `--indicator-block-size`, and `data-placed` once it has been placed, for a mark you draw
 *   and animate yourself.
 * @csspart panels - The panel container.
 * @csspart scroll-end - The button that scrolls the strip toward its end, shown under `scroll-controls` while there is more that way.
 * @csspart scroll-end-mark - The glyph on that button, where none is slotted.
 * @csspart scroll-start - The button that scrolls the strip toward its start, shown under `scroll-controls` while there is more that way.
 * @csspart scroll-start-mark - The glyph on that button, where none is slotted.
 * @csspart tabs - The tab list.
 */
@customElement('helix-headless-tabs')
export class HelixHeadlessTabs extends MixinControllerActive(HelixElement) {
  protected static override markRules = [MIRROR_RULE]

  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-tabs': { label: 'Reiter' } })`.
   */
  static words = 'helix-tabs'

  /* Arrow keys, Home and End. Same controller as the radio group and the toggle
     group: `origin: 'focus'` because `manual` lets focus and selection diverge,
     and `selects` because `manual` is what decides whether arriving chooses. */
  protected readonly keys = new KeyboardNavigationController(this, {
    items: () => this.tabs,
    origin: 'focus',
    selects: () => !this.manual && !this.linked,
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

  /** Carries a host `aria-label` and `aria-labelledby` to the tab list. */
  protected readonly aria = new AriaForwardController(this, {
    label: true,
    target: () => this.partNamed('tabs'),
  })

  /**
   * The tab list's name, read by screen readers.
   *
   * An `aria-label` or `aria-labelledby` on the host names the tab list too,
   * and wins over this.
   *
   * Empty by default, so a page that leaves it empty gives the element no
   * name, and a development build warns.
   */
  @property()
  label = ''

  /**
   * Stops the arrow keys from selecting each tab they move to. By default,
   * arrowing to a tab also selects it.
   *
   * Automatic is the default because showing a panel is usually cheap. Set this
   * where it is not, so a reader arrowing past four tabs does not load four
   * panels on the way.
   */
  @property({ reflect: true, type: Boolean })
  manual = false

  /**
   * The direction the tabs run. `vertical` sets them in a column beside the
   * panels and tells a screen reader the list is vertical.
   *
   * Optional, so the resting row writes no attribute onto the host.
   */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  /**
   * Whether a strip with more tabs than fit shows a button at each end it can
   * scroll toward.
   */
  @property({ attribute: 'scroll-controls', reflect: true, type: Boolean })
  scrollControls = false

  /**
   * How the row of tabs is drawn.
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

  /** Whether any tab is a link, so arriving on one chooses nothing. */
  private get linked(): boolean {
    return this.tabs.some((tab) => (tab.href ?? '') !== '')
  }

  private get panels(): HelixHeadlessTabPanel[] {
    return [...this.children].filter(
      (child): child is HelixHeadlessTabPanel => child instanceof HelixHeadlessTabPanel,
    )
  }

  /* Through the mixin, so a consumer can refuse the change. Moving `active`
     straight from the event leaves `helix-before-activate` an announcement
     nobody can answer.

     **And only if the tab's own choice stood, read a microtask later.**
     `helix-before-select` is cancelable, and the docblock tells you to listen for it
     on this element. This listener is on this element too, added when it
     connected, so it runs ahead of a listener you add afterwards, and read
     inline the flag was not set yet: a refusal on the root changed nothing.
     The dispatch is synchronous, so a microtask is after every listener, the
     tab's and the root's. `Radio.Group` holds the same pair for the same
     event. */
  private readonly handleSelection = (event: Event): void => {
    /* Only a choice made by one of this set's own tabs. `helix-before-select` bubbles
       and is composed, and a tree, a menu or another tab set inside a panel
       sends it too: acted on, it set `active` to a value no tab has, and the
       set fell back to its first tab under the reader. */
    if (!this.tabs.includes(event.target as HelixHeadlessTab)) {
      return
    }
    queueMicrotask(() => {
      if (!event.defaultPrevented) {
        this.requestActive((event as CustomEvent<{ value: string }>).detail.value)
      }
    })
  }

  /** Which ends the strip can scroll toward, under `scroll-controls`. */
  @state()
  private more: { end: boolean; start: boolean } = { end: false, start: false }

  /** Watches the strip's size for `scroll-controls`. */
  private resizing: ResizeObserver | undefined

  /** Reads which ends of the strip have more tabs past them. */
  private readonly measure = (): void => {
    const strip = this.partNamed('tabs')
    if (!strip || !this.scrollControls) {
      if (this.more.start || this.more.end) {
        this.more = { end: false, start: false }
      }
      return
    }
    const down = this.orientation === 'vertical'
    const along = Math.abs(down ? strip.scrollTop : strip.scrollLeft)
    const length = down ? strip.clientHeight : strip.clientWidth
    const whole = down ? strip.scrollHeight : strip.scrollWidth
    const start = along > 1
    const end = along + length < whole - 1
    if (start !== this.more.start || end !== this.more.end) {
      this.more = { end, start }
    }
  }

  /**
   * Scrolls the strip most of its own length toward one end, smoothly unless
   * the reader asked for less motion.
   */
  private scrollStrip(toward: 1 | -1): void {
    const strip = this.partNamed('tabs')
    if (!strip) {
      return
    }
    const down = this.orientation === 'vertical'
    const by = (down ? strip.clientHeight : strip.clientWidth) * 0.75 * toward
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    strip.scrollBy(down ? { behavior, top: by } : { behavior, left: isRtl(this) ? -by : by })
  }

  /** The values of the tabs the last pairing read, to tell a removed tab from one not yet here. */
  private held: string[] = []

  /**
   * The enabled tab nearest to where a removed one stood: the next ones
   * nearest first, then the ones before it nearest first. The same order a
   * dismissed tab hands focus in.
   */
  private beside(gone: string, tabs: HelixHeadlessTab[]): HelixHeadlessTab | undefined {
    const at = this.held.indexOf(gone)
    const by = new Map(tabs.map((tab) => [tab.value, tab]))
    const order = [...this.held.slice(at + 1), ...this.held.slice(0, at).reverse()]
    return order.map((value) => by.get(value)).find((tab) => tab !== undefined && !tab.disabled)
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
    /* **A removed tab takes its name out of `active` with it.** Left alone,
       `active` named a tab that no longer existed while another was shown as
       selected, and the next `requestActive` of that value was a change to
       nothing. Only where `active` names a tab this set held and holds no
       more, so a value naming a tab that has not arrived yet is left alone. */
    const previous = this.active
    const gone = this.held.includes(previous) && !tabs.some((tab) => tab.value === previous)
    /* Through the mixin, which also skips a disabled first tab. A hand-written
       fallback to the first child shows a disabled tab as current and opens its
       panel with it. A removed selected tab hands the selection to the tab
       beside it, which is where a dismissed tab hands focus, so focus and
       selection stay on one tab. */
    const value =
      (declared ?? (gone ? this.beside(previous, tabs) : undefined) ?? this.resolveActive(tabs))
        ?.value ?? ''
    this.held = tabs.map((tab) => tab.value)
    if (gone && value !== '') {
      this.active = value
      this.dispatchEvent(new HelixActivateEvent({ previous, value }))
    }
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
    const panels = new Map(this.panels.map((panel) => [panel.value, panel]))
    for (const tab of tabs) {
      const panel = panels.get(tab.value)
      whenHydrated(tab, () => {
        tab.controls = panel
      })
    }
    for (const panel of this.panels) {
      const selected = panel.value === value
      const label = names.get(panel.value) ?? ''
      whenHydrated(panel, () => {
        panel.selected = selected
        panel.label = label
      })
    }
  }

  /** The tab that last had focus, so its removal can hand focus on. */
  private focused: HelixHeadlessTab | undefined

  private readonly handleFocusIn = (event: FocusEvent): void => {
    const path = event.composedPath()
    this.focused = this.tabs.find((tab) => path.includes(tab))
  }

  /**
   * Puts focus on the selected tab where the tab that had it was removed and
   * focus fell to the page, which is where removing a focused element leaves
   * it.
   */
  private refocus(): void {
    const gone = this.focused
    if (!gone || this.tabs.includes(gone)) {
      return
    }
    this.focused = undefined
    const active = deepActiveElement()
    if (active !== null && active !== document.body) {
      return
    }
    void this.updateComplete.then(() => this.tabs.find((tab) => tab.selected)?.focus())
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-before-select', this.handleSelection)
    this.addEventListener('focusin', this.handleFocusIn)
    /* Watched again on reconnection, since disconnection let the strip go. */
    if (this.hasUpdated) {
      this.watchStrip()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-before-select', this.handleSelection)
    this.removeEventListener('focusin', this.handleFocusIn)
    this.resizing?.disconnect()
    this.resizing = undefined
  }

  /* The tab shown where nothing named one is the one `active` reports, as
     Video Playlist reports the entry it opens on. Written as the state and not
     as a move: nothing was asked for, so `helix-activate` is not sent.
     Measured before this: the first tab drew selected and `active` read `''`
     until the reader moved. In `willUpdate`, so the write joins this update. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (this.active === '' && this.childrenKnown) {
      const tabs = this.tabs
      const shown = tabs.find((tab) => tab.selected) ?? this.resolveActive(tabs)
      if (shown) {
        this.active = shown.value
      }
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    /* Development builds only. */
    auditName(
      this,
      () => null,
      'tabs',
      () => this.label !== '',
    )
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

  /** Watches the strip's size while `scroll-controls` asks, and reads it. */
  private watchStrip(): void {
    const strip = this.partNamed('tabs')
    if (this.scrollControls && strip && !this.resizing) {
      this.resizing = new ResizeObserver(this.measure)
      this.resizing.observe(strip)
    }
    if (!this.scrollControls && this.resizing) {
      this.resizing.disconnect()
      this.resizing = undefined
    }
    this.measure()
  }

  /** Brings the selected tab into the strip's view, and moves nothing else. */
  private reveal(): void {
    const strip = this.partNamed('tabs')
    const tab = this.tabs.find((one) => one.selected)
    if (strip && tab) {
      /* Clear of a scroll button holding to the edge it comes in at. */
      scrollWithin(tab, strip, { padding: this.scrollControls ? 40 : 0 })
    }
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
    /* Tabs that arrived after the first render name the one shown. */
    if (this.active === '') {
      this.requestUpdate()
    }
    this.indicator.place()
    this.refocus()
    this.measure()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('active')) {
      this.sync()
      if (changed.get('active') !== undefined) {
        void this.updateComplete.then(() => this.reveal())
      }
    }
    if (changed.has('scrollControls') || changed.has('orientation')) {
      this.watchStrip()
    }
    this.indicator.place()
  }

  /**
   * One of the two scroll buttons, with the glyph pointing the way it scrolls.
   */
  private renderScroll(toward: 1 | -1): TemplateResult | typeof nothing {
    if (!this.scrollControls) {
      return nothing
    }
    const shown = toward > 0 ? this.more.end : this.more.start
    /* A press scrolls and leaves focus on the tab it was on. */
    const keepFocus = (event: Event): void => event.preventDefault()
    return toward > 0
      ? html`<button part="scroll-end" type="button" tabindex="-1" aria-hidden="true" ?hidden=${!shown} @mousedown=${keepFocus} @click=${() => this.scrollStrip(1)}>${this.renderScrollIcon(1)}</button>`
      : html`<button part="scroll-start" type="button" tabindex="-1" aria-hidden="true" ?hidden=${!shown} @mousedown=${keepFocus} @click=${() => this.scrollStrip(-1)}>${this.renderScrollIcon(-1)}</button>`
  }

  /**
   * The glyph on a scroll button, behind a seam: slot fallback, so a consumer
   * replaces it by slotting, and a method, so a tier above replaces it by
   * overriding. A caret along the line is mirrored on a right-to-left page, and
   * one down a column is not.
   */
  protected renderScrollIcon(toward: 1 | -1): TemplateResult {
    const down = this.orientation === 'vertical'
    const icon = down ? (toward > 0 ? caretDown : caretUp) : toward > 0 ? caretRight : caretLeft
    const mirror = down ? nothing : ''
    return toward > 0
      ? html`<slot name="scroll-end-icon"><svg part="scroll-end-mark" data-mirror=${mirror} aria-hidden="true" fill="currentColor" viewBox=${icon.viewBox}><path d=${glyphPath(icon)}></path></svg></slot>`
      : html`<slot name="scroll-start-icon"><svg part="scroll-start-mark" data-mirror=${mirror} aria-hidden="true" fill="currentColor" viewBox=${icon.viewBox}><path d=${glyphPath(icon)}></path></svg></slot>`
  }

  protected override render(): TemplateResult {
    return html`<div
        part="tabs"
        role="tablist"
        aria-label=${this.label || nothing}
        aria-orientation=${this.orientation === 'vertical' ? 'vertical' : nothing}
        @scroll=${this.scrollControls ? this.measure : nothing}
      >
        ${this.renderScroll(-1)}
        <slot @slotchange=${this.handleSlotChange}></slot>
        <span part="indicator" aria-hidden="true"><slot name="indicator"></slot></span>
        ${this.renderScroll(1)}
      </div>
      <div part="panels"><slot name="panels" @slotchange=${this.handleSlotChange}></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-tabs': HelixHeadlessTabs
  }
}
