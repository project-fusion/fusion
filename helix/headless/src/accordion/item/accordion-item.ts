import {
  closestInstance,
  customElement,
  HelixElement,
  MixinControllerOpen,
} from '@fusion.dev/helix-core'
import { caretDown } from '@fusion.dev/helix-icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'
import { HelixHeadlessAccordion } from '../root/accordion-root.js'

/** Shadow-DOM id linking the trigger's aria-controls to the content region. */
const CONTENT_ID = 'content'

/**
 * Shadow-DOM id of the trigger, used to name the content region.
 *
 * A `role="region"` with no accessible name is not exposed as a landmark by
 * screen readers and is flagged by every automated audit, so the region borrows
 * the trigger's text. Both ids live in the same shadow root, so the reference
 * resolves; an IDREF pointing at the light DOM never would.
 */
const TRIGGER_ID = 'trigger'

/**
 * @summary One collapsible section of an accordion.
 *
 * @description
 * Holds its own open state. Used alone, outside an accordion, it works as a
 * disclosure.
 *
 * The trigger sits inside a heading, so a screen reader lists the section with
 * the page's headings. The level is the item's `heading-level`, then the
 * accordion's, then 3.
 *
 * Content stays mounted when the item is closed, so it can animate and its text
 * is present in server-rendered HTML. Closed content has both `hidden` and
 * `inert`. `hidden` collapses it when no stylesheet is loaded. `inert` keeps it
 * out of the tab order and the accessibility tree after the styled tier's
 * `display` overrides `hidden`.
 *
 * Set `hidden-until-found` and the browser's find in page searches a closed
 * section too: a match opens it, with `helix-before-open` first, as React
 * Aria's disclosure does. The content is then `hidden="until-found"` while
 * closed, and not `inert`, since an inert region is never searched.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Collapsible, Expander, Disclosure
 * @documentation https://fusion.dev/helix/components/accordion
 *
 * @slot - The content shown when the section is open.
 * @slot chevron - Replaces the open and close indicator, such as with your own icon.
 * @slot summary - The text of the button that opens and closes the section. Always shown.
 *
 * @event {HelixBeforeCloseEvent} helix-before-close - The section is about to close. Cancelable: cancel it to keep it open.
 * @event {HelixBeforeOpenEvent} helix-before-open - The section is about to open. Cancelable: cancel it to keep it closed.
 * @event {ToggleEvent} toggle - The section opened or closed. The event carries `newState` and `oldState`.
 *
 * @csspart chevron - The open and close indicator.
 * @csspart container - The outer wrapper.
 * @csspart content - The region that holds the content.
 * @csspart content-inner - The clipping box inside the animated region.
 * @csspart heading - The heading that holds the trigger.
 * @csspart trigger - The button that opens and closes the section, holding the summary.
 *
 * @cssstate open - While the item is open.
 */
@customElement('helix-headless-accordion-item')
export class HelixHeadlessAccordionItem extends MixinControllerOpen(HelixElement) {
  /**
   * Where the chevron sits, or `none` for no chevron.
   *
   * `auto` resolves to `end`, which is where a reader scanning a list of
   * summaries expects it: the label starts at the same x on every row, and the
   * indicator is found once at the edge rather than shifting with the text.
   * `start` is for a tree-like reading, where the indicator leads the label.
   * `none` is for a row that carries its own affordance and would otherwise
   * have two.
   */
  @property({ attribute: 'chevron-placement', reflect: true })
  chevronPlacement?: 'auto' | 'start' | 'end' | 'none'

  /**
   * The chevron, or nothing when suppressed.
   *
   * The drawn chevron is the `chevron` slot's fallback, so an icon of your own
   * replaces it by being slotted, and a tier drawing its own overrides this.
   */
  protected renderChevron(): TemplateResult | typeof nothing {
    if (this.chevronPlacement === 'none') {
      return nothing
    }
    return html`<slot name="chevron"
      ><svg part="chevron" fill="currentColor" viewBox=${caretDown.viewBox} aria-hidden="true">
        ${unsafeSVG(caretDown.content)}
      </svg></slot
    >`
  }

  /**
   * Whether the section is disabled, so its trigger cannot be pressed or
   * reached with the arrow keys. A script can still open and close it.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * @internal The accordion's `heading-level`, written by the accordion. A
   * property, because an attribute written onto your element after it upgrades
   * causes a hydration mismatch.
   */
  @property({ attribute: false })
  groupHeadingLevel: number | undefined = undefined

  /**
   * @internal The accordion's `hidden-until-found`, written by the accordion,
   * for the reason `groupHeadingLevel` is a property.
   */
  @property({ attribute: false })
  groupHiddenUntilFound = false

  /**
   * The level of the heading around the trigger, from 1 to 6.
   *
   * Unset takes the accordion's `heading-level`, and 3 where that is unset
   * too.
   */
  @property({ attribute: 'heading-level', type: Number })
  headingLevel?: number

  /**
   * Whether find in page searches the section while it is closed, and opens it
   * on a match.
   *
   * Off by default. A closed section is then `hidden="until-found"`, which
   * hides through `content-visibility`, so a stylesheet that animates the
   * section closed shows an empty box for the length of that animation. The
   * accordion's own `hidden-until-found` turns it on for every section.
   */
  @property({ attribute: 'hidden-until-found', type: Boolean })
  hiddenUntilFound = false

  /**
   * A group name. Opening an item closes the other items with the same name,
   * as `<details name>` does.
   *
   * **Two ways of saying the same thing, and the platform's one does not need a
   * parent.** An accordion's `mode` makes its own children exclusive, which
   * covers the ordinary case and cannot express a set spread across a page: a
   * `<details name="faq">` anywhere in a document closes every other one that
   * shares the name, and this does the same. Items in the same root with the
   * same name are peers whether or not an accordion contains them.
   *
   * Where both are set the name wins, because it is the narrower statement: a
   * consumer who named a group meant that group rather than whatever happens to
   * be nested where.
   *
   * Optional rather than `''`, because a reflected string defaulting to the
   * empty string writes `name=""` onto every item ever rendered: Lit reflects
   * it, and the resting state of a reflected property is the attribute's
   * absence. Caught by `hydration.dom.spec.ts`.
   */
  @property({ reflect: true })
  name?: string

  /** Whether find in page searches this section while it is closed. */
  private get findable(): boolean {
    return this.hiddenUntilFound || this.groupHiddenUntilFound
  }

  /**
   * Opens the section find in page has matched in, before the match is shown.
   *
   * The browser removes `hidden` itself. A refusal puts it back, so the trigger
   * and the region still agree.
   */
  private readonly handleBeforeMatch = (event: Event): void => {
    if (this.open || this.requestOpen(true)) {
      return
    }
    ;(event.currentTarget as HTMLElement).setAttribute('hidden', 'until-found')
  }

  /** Whether the item was open at the last update, and `undefined` before one. */
  private wasOpen: boolean | undefined = undefined

  /**
   * The nearest accordion above this item, if there is one.
   *
   * Resolved on demand rather than held, so an item moved between accordions
   * coordinates with the one it is in now. `closest` crosses no shadow
   * boundary, which is correct: an item inside another item's content is in
   * that item's light DOM and finds the same accordion, so the check below is
   * what keeps it independent.
   */
  private get accordion(): HelixHeadlessAccordion | null {
    return closestInstance(this, HelixHeadlessAccordion)
  }

  /**
   * The items this one coordinates with: its own siblings, and only those.
   *
   * Direct children only. An accordion nested inside an item's content is a
   * separate set, and opening a section in it must not close anything outside.
   */
  private get peers(): HelixHeadlessAccordionItem[] {
    if (this.name !== undefined && this.name !== '') {
      /* By name, across the whole root rather than one accordion, which is what
         `<details name>` means. `getRootNode()` so an item inside a shadow tree
         finds its group there rather than reaching into the document, which is
         the same boundary every IDREF in this library respects. */
      const root = this.getRootNode() as Document | ShadowRoot
      return [
        ...root.querySelectorAll<HelixHeadlessAccordionItem>(
          `${this.localName}[name="${CSS.escape(this.name)}"]`,
        ),
      ]
    }
    const accordion = this.accordion
    if (!accordion || accordion.items.indexOf(this) === -1) {
      return []
    }
    return accordion.items
  }

  /**
   * Opens or closes this item, and enforces the accordion's mode.
   *
   * The item that was clicked is the coordinator. It refuses first, then
   * announces, then applies, then closes its peers, in that order: closing a
   * peer before knowing whether this change was even allowed would leave the
   * set collapsed after a listener refused it.
   */
  protected handleToggle = (): void => {
    if (this.disabled) {
      return
    }
    const next = !this.open
    const mode = this.accordion?.mode

    // `single` keeps one open at all times, so the last one cannot be closed.
    // `single-collapsible` is the same rule without that floor.
    if (!next && mode === 'single') {
      return
    }

    if (!this.requestOpen(next)) {
      return
    }

    if (next) {
      this.closePeers()
    }
  }

  /** Closes the other open items in this item's set, where it has one. */
  private closePeers(): void {
    if (this.accordion?.mode === undefined && (this.name === undefined || this.name === '')) {
      return
    }
    for (const peer of this.peers) {
      if (peer !== this && peer.open) {
        // A peer whose consumer refuses the request stays open, which can
        // legitimately leave two open.
        peer.requestOpen(false)
      }
    }
  }

  /**
   * Closes the peers of an item opened any other way than its trigger: `open`
   * set from a script, `requestOpen` or `toggleOpen`. The trigger already
   * closed them, so for a press this finds nothing open.
   *
   * Not on the first update. What the markup opens is the accordion's to
   * settle, once every item is there to compare.
   */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (this.wasOpen === false && this.open) {
      this.closePeers()
    }
    this.wasOpen = this.open
  }

  /**
   * Moves focus to this item's trigger.
   *
   * The parent accordion drives arrow-key navigation and cannot reach the
   * trigger itself, because it is inside this item's shadow root. Exposing the
   * intent as a method keeps the parent out of the child's internals.
   */
  focusTrigger(): void {
    this.renderRoot.querySelector<HTMLButtonElement>(`#${TRIGGER_ID}`)?.focus()
  }

  /**
   * The item, with `hidden` doing the collapsing.
   *
   * **A closed section has to be closed with no stylesheet at all**, which is
   * the whole claim `headless` makes. `inert` alone is not that: it takes the
   * region out of the accessibility tree and off the tab order and leaves every
   * pixel of it on the screen, so a consumer taking this tier gets sections of
   * text permanently open under a trigger saying `aria-expanded="false"`, and a
   * sighted reader sees content a screen reader is told is not there. Leaving
   * the collapse to a `grid-template-rows: 0fr` puts the state in a stylesheet,
   * where only the consumers who load that sheet have it.
   *
   * **`hidden` costs a sheet that animates this region nothing**, which is what
   * makes this the cheap fix rather than a trade. The UA sheet hides `[hidden]`
   * from the UA origin, so any author rule already setting `display` on this
   * part outranks it and the transition runs exactly as before. Measured on
   * both tiers.
   *
   * **`hidden="until-found"` only where it was asked for.** It hides through
   * `content-visibility` rather than `display`, which an author `display` does
   * not override, so a section a sheet animates closed shows an empty box while
   * it shrinks. `beforematch` sets `open`, so find in page never reveals text
   * under a trigger that still reports collapsed.
   *
   * `inert` stays, except under `until-found`. `hidden` answers the reader who
   * can see and `inert` answers the one tabbing through, and wherever a sheet
   * overrides `display`, `inert` is the only one of the two still in force.
   * `content-visibility: hidden` keeps skipped content out of the tab order and
   * the accessibility tree by itself, and an inert region is never searched.
   */
  protected override render(): TemplateResult {
    const open = this.open
    const level = Math.min(6, Math.max(1, this.headingLevel ?? this.groupHeadingLevel ?? 3))
    return html`
      <div part="container">
        <div part="heading" role="heading" aria-level=${level}>
        <button
          id=${TRIGGER_ID}
          aria-controls=${CONTENT_ID}
          aria-expanded=${open ? 'true' : 'false'}
          part="trigger"
          type="button"
          ?disabled=${this.disabled}
          @click=${this.handleToggle}
        >
          ${this.chevronPlacement === 'start' ? this.renderChevron() : nothing}
          <slot name="summary"></slot>
          ${this.chevronPlacement === 'start' ? nothing : this.renderChevron()}
        </button>
        </div>
        <div
          id=${CONTENT_ID}
          aria-labelledby=${TRIGGER_ID}
          part="content"
          hidden=${open ? nothing : this.findable ? 'until-found' : ''}
          ?inert=${!open && !this.findable}
          role="region"
          @beforematch=${this.handleBeforeMatch}
        >
          <div part="content-inner">
            <slot></slot>
          </div>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-accordion-item': HelixHeadlessAccordionItem
  }
}
