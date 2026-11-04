import {
  customElement,
  focusableElements,
  HelixElement,
  HelixLoadEvent,
  hostAria,
  internalsOf,
  onUnlessFalse,
} from '@fusion.dev/helix-core'
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
 * The browser's find in page searches an inactive panel, and a match selects
 * its tab, with `helix-before-activate` first, as a match in a closed
 * accordion section opens it. An inactive panel is `hidden="until-found"`,
 * which hides it with no stylesheet loaded and keeps it out of the tab order
 * and the accessibility tree. Set `hidden-until-found="false"` on the panel,
 * or on the tabs for every panel, and an inactive panel is `hidden` instead,
 * and find in page skips it. A `lazy` panel that has not been shown holds only
 * its template, so there is nothing in it to find.
 *
 * The host is the `tabpanel` while its tab is selected, through
 * `ElementInternals`, so the tab's `aria-controls` can reach it from the tab's
 * shadow root. The box inside is a tab stop only while the panel holds nothing
 * focusable, as the ARIA tabs pattern and React Aria's tab panel do: Tab from
 * the tab list lands on the panel's first link or control where there is one,
 * and on the panel itself where there is none.
 *
 * **Set `lazy` for a panel that is expensive to draw.** Its content waits in a
 * `<template>` inside it, and goes into the panel the first time the panel is
 * shown, so it costs nothing until a reader opens that tab. Once in, it stays.
 * The panel sends `helix-load` at the same moment, for content your code
 * renders itself.
 *
 * @since 0.1.0
 * @status stable
 * @aliases TabPanel
 * @documentation https://fusion.dev/helix/components/tabs
 *
 * @slot - The panel's content. Under `lazy`, a `<template>` holding it.
 *
 * @event {HelixLoadEvent} helix-load - Fired the first time a `lazy` panel is shown, once its template's content is in.
 *
 * @csspart panel - The panel container, which takes the focus while it holds nothing focusable.
 *
 * @cssstate loaded - Once a `lazy` panel has been shown and its content is in.
 * @cssstate selected - While its tab is the one selected.
 */
@customElement('helix-headless-tab-panel')
export class HelixHeadlessTabPanel extends HelixElement {
  /**
   * @internal The tabs' `hidden-until-found`, written by the tabs, for the
   * reason `label` is a property.
   */
  @property({ attribute: false })
  groupHiddenUntilFound = true

  /**
   * Whether find in page searches the panel while its tab is not selected, and
   * selects the tab on a match.
   *
   * Unset takes the tabs' `hidden-until-found`, which is on. Write
   * `hidden-until-found="false"` to keep find in page out of this panel: an
   * inactive panel is then `hidden`.
   */
  @property({ attribute: 'hidden-until-found', converter: onUnlessFalse })
  hiddenUntilFound?: boolean

  /**
   * @internal The name of the panel, which is the text of the tab that opens it.
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
   * Whether the panel's content waits in a `<template>` until the panel is
   * first shown.
   */
  @property({ type: Boolean })
  lazy = false

  /** Whether a `lazy` panel has put its content in. */
  private loaded = false

  /**
   * Puts a `lazy` panel's content in the first time the panel is shown: the
   * content of each `<template>` it holds, in place of the template.
   */
  private load(): void {
    if (!this.lazy || !this.selected || this.loaded) {
      return
    }
    this.loaded = true
    for (const template of [...this.children]) {
      if (template instanceof HTMLTemplateElement) {
        template.replaceWith(document.importNode(template.content, true))
      }
    }
    this.toggleState('loaded', true)
    this.dispatchEvent(new HelixLoadEvent())
  }

  /**
   * @internal Asks the tabs to select this panel's tab, and says whether they
   * did. Written by the tabs, which own the choice: a panel cannot select
   * itself without leaving its tab and `active` behind.
   */
  requestShow: (() => boolean) | undefined

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

  /** Whether find in page searches this panel while it is not selected. */
  private get findable(): boolean {
    return this.hiddenUntilFound ?? this.groupHiddenUntilFound
  }

  /**
   * Selects this panel's tab when find in page matches inside it, before the
   * match is shown.
   *
   * A refusal puts `hidden` back, so the tab and the panel still agree. The
   * browser removes the attribute after this event's listeners have returned,
   * and after the microtasks they queued, so a mutation observer is what hears
   * the removal, as on the accordion item.
   */
  private readonly handleBeforeMatch = (event: Event): void => {
    if (this.selected || this.requestShow?.() === true) {
      return
    }
    const panel = event.currentTarget as HTMLElement
    const observer = new MutationObserver(() => {
      observer.disconnect()
      if (!this.selected && !panel.hasAttribute('hidden')) {
        panel.setAttribute('hidden', this.findable ? 'until-found' : '')
      }
    })
    observer.observe(panel, { attributeFilter: ['hidden'] })
  }

  /* After the render that shows the content, since a hidden panel's content
     has no box and so no stop. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('selected') || changed.has('lazy')) {
      this.load()
    }
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
    hostAria(internalsOf(this), { label: this.label, role: this.selected ? 'tabpanel' : '' })
  }

  protected override render(): TemplateResult {
    /* **No tab stop while not selected.** `hidden="until-found"` hides the
       content through `content-visibility` and leaves the panel's own box in
       the tree, so a `tabindex` here would make an inactive panel focusable. */
    return html`<div
      part="panel"
      hidden=${this.selected ? nothing : this.findable ? 'until-found' : ''}
      tabindex=${!this.selected || this.holdsStop ? nothing : '0'}
      @beforematch=${this.handleBeforeMatch}
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
