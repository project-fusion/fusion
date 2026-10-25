import {
  customElement,
  glyphPath,
  HelixElement,
  internalsOf,
  ListedController,
  MixinDismissible,
  MixinSelectableItem,
  plainClick,
  reflectElements,
  words,
} from '@fusion.dev/helix-core'
import { x } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One tab in a tab list.
 *
 * @description
 * A tab is an element, because it manages selection and its own tab stop.
 *
 * With an `href`, the tab is a link that still controls its panel:
 * `role="tab"` on an `<a>`, which a press, Enter and the browser's own link
 * gestures follow. `helix-before-select` is sent first, and canceling it
 * keeps the browser from following, so a client-side router follows it
 * instead and renders the route in the tab's panel. Link-only tabs with no panels belong
 * in Navigation, whose `variant="underlined"` draws the same bar.
 *
 * With `dismissible`, the tab can be closed, as Web Awesome's closable tab
 * can: a press on its `dismiss` mark, or Delete or Backspace while the tab
 * has focus, sends `helix-dismiss`. The tab does not remove itself, because
 * your code owns the set, so remove the tab and its panel in your handler.
 * Focus moves to the tab beside it, and where the tab was selected, the tab
 * set selects that same tab.
 * The tab says the key through `aria-keyshortcuts`, and the mark is for the
 * pointer, hidden from screen readers.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Tab
 * @documentation https://fusion.dev/helix/components/tabs
 *
 * @slot - The tab's label.
 * @slot dismiss-icon - Replaces the glyph on the mark that closes a `dismissible` tab.
 *
 * @event {HelixBeforeSelectEvent} helix-before-select - Fired when the tab is chosen. Cancelable: canceling it stops the change and leaves the decision to you.
 * @event {HelixDismissEvent} helix-dismiss - A `dismissible` tab was asked to close. The tab does not remove itself, so remove it and its panel in response. Cancelable.
 *
 * @csspart dismiss - The mark a pointer presses to close a `dismissible` tab.
 * @csspart dismiss-mark - The glyph on that mark, where none is slotted.
 * @csspart label - The slot the tab's label is in.
 * @csspart tab - The tab itself.
 *
 * @cssstate selected - While it is the tab selected.
 *
 * @interactive button
 */
@customElement('helix-headless-tab')
export class HelixHeadlessTab extends MixinDismissible(MixinSelectableItem(HelixElement)) {
  /** On the page's list of controls, where a command palette and a shortcut overlay find it. */
  protected readonly listed = new ListedController(
    this,
    'press',
    () => internalsOf(this)?.ariaKeyShortcuts,
  )

  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-tab': { dismissLabel: 'Schließen' } })`.
   */
  static words = 'helix-tab'

  /* The control is a `<button role="tab">` and the part is named for what it
     is, so the one thing the shared item has to know is said here. */
  protected override itemPart = 'tab'

  /**
   * @internal The panel this tab shows, written by the tab set. A property,
   * because it is an element, and it reaches the tab's `aria-controls` as an
   * element reference: the panel is in the light DOM, which a reference from
   * inside this shadow root can reach.
   */
  @property({ attribute: false })
  controls: Element | undefined = undefined

  /**
   * The tooltip on the mark that closes a `dismissible` tab. The mark is for
   * the pointer and hidden from screen readers, which hear the Delete key
   * through `aria-keyshortcuts`.
   */
  @words
  @property({ attribute: 'dismiss-label' })
  override dismissLabel = 'Close'

  /**
   * The URL the tab links to, for tabs a router drives. Setting it renders the
   * tab as a link, and the tab still controls its panel.
   *
   * Link-only tabs with no panels belong in Navigation, whose
   * `variant="underlined"` draws the same bar.
   */
  @property()
  href?: string

  /**
   * The link's `rel`, for a tab with an `href`.
   */
  @property()
  rel?: string

  /**
   * Where the link opens, such as `_blank`, for a tab with an `href`.
   */
  @property()
  target?: string

  /**
   * Moves focus to the tab's control, the button or the link inside it, so a
   * script can focus the tab the way it focuses a native one.
   */
  override focus(options?: FocusOptions): void {
    this.partNamed('tab')?.focus(options)
  }

  /**
   * Sends `helix-dismiss` for a `dismissible` tab, and returns `false` where a
   * listener refused it, or where the tab is not dismissible or is disabled.
   * The tab stays where it is either way: removing it is yours. Where the tab
   * had focus, focus moves to the tab beside it once you remove it.
   */
  override dismiss(): boolean {
    if (!this.dismissible || this.disabled) {
      return false
    }
    return super.dismiss()
  }

  /** Where focus goes when a tab beside this one that held it is removed: this tab. */
  protected override get returnFocusTo(): HTMLElement | null {
    return this.partNamed('tab')
  }

  /** A press on the mark closes the tab, and neither selects it nor follows its link. */
  private readonly handleDismissPress = (event: Event): void => {
    event.preventDefault()
    event.stopPropagation()
    this.dismiss()
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (this.dismissible && (event.key === 'Delete' || event.key === 'Backspace')) {
      event.preventDefault()
      this.dismiss()
    }
  }

  /** The mark that closes a `dismissible` tab, inside the control so it shares its box. */
  protected renderDismiss(): TemplateResult | typeof nothing {
    if (!this.dismissible) {
      return nothing
    }
    return html`<span part="dismiss" aria-hidden="true" title=${this.dismissLabel} @click=${this.handleDismissPress}
      ><slot name="dismiss-icon"
        ><svg part="dismiss-mark" fill="currentColor" viewBox=${x.viewBox} aria-hidden="true"><path d=${glyphPath(x)}></path></svg></slot
      ></span
    >`
  }

  /**
   * Chooses the tab before the browser follows its link, and keeps the browser
   * from following where the choice was refused. A press with a modifier, or
   * with a button other than the main one, opens the link where the browser
   * opens it and chooses nothing here.
   */
  private readonly handleLinkClick = (event: MouseEvent): void => {
    if (!plainClick(event)) {
      return
    }
    if (!this.select()) {
      event.preventDefault()
    }
  }

  /**
   * Points the control's `aria-controls` at the panel, where the engine can.
   * The control is this tab's own, so the reference is always its to clear.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const control = this.renderRoot.querySelector('[part="tab"]')
    reflectElements(control, 'ariaControlsElements', this.controls ? [this.controls] : [], true)
  }

  /**
   * Asks for the render that follows a hydration, so the stop stops being every
   * tab's.
   *
   * `tabindex` reads `childrenKnown` and a hydrating render is one where that is
   * false, which is what keeps the hydrating render the server's. Nothing else
   * would ask: the root writes an already-false `selected` onto an unchosen tab,
   * which changes nothing and so re-renders nothing.
   */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  /**
   * Presses the tab, as `click()` presses a native button: passed to the
   * control inside, which is what answers a click, so a script's `click()`
   * selects the tab, or follows its link, once.
   */
  override click(): void {
    const control = this.partNamed('tab')
    if (control) {
      control.click()
    } else {
      super.click()
    }
  }

  protected override render(): TemplateResult {
    /* `aria-controls` is an element reference, written in `updated`, and
     * never an IDREF. An IDREF resolves only within the tree it is written in,
     * and the panel's region is inside the panel's own shadow root. A reference
     * is valid into the same tree or a shadow-including ancestor of it, so it
     * reaches the panel's host in the light DOM, which holds the region.
     *
     * **The roving stop rides on `selected`, and a render nothing has answered
     * for holds it open.** `selected` is the root's word and the root reads its
     * children to say it, so on a server every tab is unselected and a bare
     * `'-1'` served a strip the keyboard could not enter at all. Untold, every
     * tab is a stop, which is what a document with no script does anyway: there
     * are no arrow keys to move a single stop with until one arrives. Told, one
     * is, which is the pattern. `childrenKnown` is the test `FilterInput.Chip`
     * uses in the same words, a server and the render that has to be its, so a
     * browser draws what it drew before. */
    const tabindex = this.selected || !this.childrenKnown ? '0' : '-1'
    const shortcut = this.dismissible && !this.disabled ? 'Delete' : nothing
    /* A link with no `href` while it is disabled, so it goes nowhere, and
       `aria-disabled` in place of the `disabled` an anchor does not have. */
    if ((this.href ?? '') !== '') {
      return html`<a
        part="tab"
        role="tab"
        href=${this.disabled ? nothing : (this.href ?? nothing)}
        target=${this.target || nothing}
        rel=${this.rel || nothing}
        aria-selected=${this.selected ? 'true' : 'false'}
        aria-disabled=${this.disabled ? 'true' : nothing}
        aria-keyshortcuts=${shortcut}
        tabindex=${this.disabled ? nothing : tabindex}
        @click=${this.handleLinkClick}
        @keydown=${this.handleKeydown}
      >
        <slot part="label"></slot>${this.renderDismiss()}
      </a>`
    }
    return html`<button
      part="tab"
      role="tab"
      type="button"
      aria-selected=${this.selected ? 'true' : 'false'}
      aria-keyshortcuts=${shortcut}
      ?disabled=${this.disabled}
      tabindex=${tabindex}
      @click=${() => this.select()}
      @keydown=${this.handleKeydown}
    >
      <slot part="label"></slot>${this.renderDismiss()}
    </button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-tab': HelixHeadlessTab
  }
}
