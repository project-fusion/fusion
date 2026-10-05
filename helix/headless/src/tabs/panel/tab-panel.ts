import { customElement, focusableElements, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * @summary The content shown for one tab.
 *
 * @description
 * An inactive panel is hidden and stays mounted. Anything typed into it is
 * still there when the person comes back, and the content of every panel is in
 * the server-rendered markup for crawlers, whichever tab is open.
 *
 * The host is the `tabpanel` while its tab is selected, through
 * `ElementInternals`, so the tab's `aria-controls` can reach it from the tab's
 * shadow root. The box inside is a tab stop only while the panel holds nothing
 * focusable, as the ARIA tabs pattern and React Aria's tab panel do: Tab from
 * the tab list lands on the panel's first link or control where there is one,
 * and on the panel itself where there is none.
 *
 * @since 0.1.0
 * @status stable
 * @aliases TabPanel
 * @documentation https://fusion.dev/helix/components/tabs
 *
 * @slot - The panel's content.
 *
 * @csspart panel - The panel container, which takes the focus while it holds nothing focusable.
 *
 * @cssstate selected - While its tab is the one selected.
 */
@customElement('helix-headless-tab-panel')
export class HelixHeadlessTabPanel extends HelixElement {
  /**
   * The name of the panel, which is the text of the tab that opens it.
   *
   * Set by the root, which is the only thing that sees both. No attribute,
   * because it is coordination between elements rather than anything a consumer
   * writes: the tab already says it.
   *
   * A string and not a reference: an IDREF resolves only in the tree it is
   * written in, and the tab's control is inside the tab's shadow root, which no
   * reference from the light DOM can reach. `aria-label` on a `tabpanel` is how
   * the pattern names one anyway.
   */
  @property({ attribute: false })
  label = ''

  /**
   * Whether this panel is the visible one.
   */
  @property({ type: Boolean })
  selected = false

  /**
   * Pairs the panel with the tab of the same value.
   */
  @property()
  value = ''

  /**
   * Whether the content holds a tab stop of its own, so the panel needs none.
   * False on a server, which serves the panel as a stop: it cannot look.
   */
  @state()
  private holdsStop = false

  /** Re-reads the content when it changes in a way that adds or removes a stop. */
  private readonly watcher =
    typeof MutationObserver === 'undefined'
      ? undefined
      : new MutationObserver(() => this.readStops())

  private readonly readStops = (): void => {
    this.holdsStop = this.selected && focusableElements(this).length > 0
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.watcher?.observe(this, {
      attributeFilter: ['contenteditable', 'disabled', 'hidden', 'href', 'tabindex'],
      attributes: true,
      childList: true,
      subtree: true,
    })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.watcher?.disconnect()
  }

  /* After the render that shows the content, since a hidden panel's content
     has no box and so no stop. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('selected')) {
      this.readStops()
    }
  }

  /**
   * Mirrors the chosen state where a stylesheet can select on it.
   *
   * **A custom state, never a reflected `selected` attribute.** The parent
   * writes this, so reflecting it would put the element's own bookkeeping onto
   * markup a consumer wrote and their server never sent, which React reports as
   * a hydration mismatch and which a serialized element pasted back declares as
   * a choice nobody made. `ElementInternals` holds it instead.
   *
   * The attribute still seeds the property, which is what
   * `<helix-headless-tab-panel selected>` in a consumer's markup means. Only
   * the write back is gone.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('selected', this.selected)
    /* The role only while showing: a hidden panel's host is not hidden itself,
       and an empty `tabpanel` would be one more stop in a reader's list. */
    hostAria(this.internals, { label: this.label, role: this.selected ? 'tabpanel' : '' })
  }

  protected override render(): TemplateResult {
    return html`<div
      part="panel"
      ?hidden=${!this.selected}
      tabindex=${this.holdsStop ? nothing : '0'}
    >
      <slot @slotchange=${this.readStops}></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-tab-panel': HelixHeadlessTabPanel
  }
}
