import {
  customElement,
  HelixElement,
  MixinSelectableItem,
  reflectElements,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One tab in a tab list.
 *
 * @description
 * A tab is an element, because it manages selection and its own tab stop.
 *
 * With an `href`, the tab is a link: `role="tab"` on an `<a>`, which a press,
 * Enter and the browser's own link gestures follow. `helix-select` is sent
 * first, and canceling it keeps the browser from following, so a client-side
 * router follows it instead.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Tab
 * @documentation https://fusion.dev/helix/components/tabs
 *
 * @slot - The tab's label.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the tab is chosen. Cancelable: canceling it stops the change and leaves the decision to you.
 *
 * @csspart tab - The tab itself.
 *
 * @cssstate selected - While it is the tab selected.
 */
@customElement('helix-headless-tab')
export class HelixHeadlessTab extends MixinSelectableItem(HelixElement) {
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
   * The URL the tab links to. Setting it renders the tab as a link, for a set
   * of tabs that are pages of a site.
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
   * Chooses the tab before the browser follows its link, and keeps the browser
   * from following where the choice was refused. A press with a modifier, or
   * with a button other than the main one, opens the link where the browser
   * opens it and chooses nothing here.
   */
  private readonly handleLinkClick = (event: MouseEvent): void => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
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
        tabindex=${this.disabled ? nothing : tabindex}
        @click=${this.handleLinkClick}
      >
        <slot></slot>
      </a>`
    }
    return html`<button
      part="tab"
      role="tab"
      type="button"
      aria-selected=${this.selected ? 'true' : 'false'}
      ?disabled=${this.disabled}
      tabindex=${tabindex}
      @click=${() => this.select()}
    >
      <slot></slot>
    </button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-tab': HelixHeadlessTab
  }
}
