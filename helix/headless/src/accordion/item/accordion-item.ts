import {
  closestInstance,
  customElement,
  HelixElement,
  MixinControllerOpen,
} from '@fusion.dev/helix-core'
import { caretDown } from '@fusion.dev/helix-icons'
import { html, nothing, type TemplateResult } from 'lit'
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
 * Carries its own open state, which is why it is an element rather than a slot.
 * Used alone, outside an accordion, it is a disclosure.
 *
 * Content stays mounted when closed, so it can animate and so the text is
 * present in server-rendered HTML. Closed content carries both `hidden` and
 * `inert`: the first collapses it with no stylesheet in play, the second keeps
 * it out of the tab order and the accessibility tree once the styled tier's
 * `display` has overridden the first.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Collapsible, Expander, Disclosure
 * @documentation https://helix.fusion.dev/components/accordion
 *
 * @slot - The content revealed when open.
 * @slot summary - The always-visible trigger content.
 *
 * @event {HelixBeforeCloseEvent} helix-before-close - Fired before the section closes, and cancelable.
 * @event {HelixBeforeOpenEvent} helix-before-open - Fired before the section opens. Cancelable: refusing it takes the decision and nothing moves.
 * @event {Event} toggle - Says the state moved, carrying `newState` and `oldState`.
 *
 * @csspart chevron - The open and close indicator.
 * @csspart container - The outer wrapper.
 * @csspart content - The revealed region.
 * @csspart content-inner - The clipping box inside the animated region.
 * @csspart trigger - The clickable summary row.
 *
 * @cssstate open - While the item is open.
 */
@customElement('helix-headless-accordion-item')
export class HelixHeadlessAccordionItem extends MixinControllerOpen(HelixElement) {
  /**
   * Where the open indicator sits, or whether there is one.
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

  /** The chevron, or nothing when suppressed. */
  private renderChevron(): TemplateResult | typeof nothing {
    if (this.chevronPlacement === 'none') {
      return nothing
    }
    return html`<svg part="chevron" fill="currentColor" viewBox=${caretDown.viewBox} aria-hidden="true">
      ${unsafeSVG(caretDown.content)}
    </svg>`
  }

  /**
   * A group name, which is how `<details>` says a set is exclusive.
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

    if (next && (mode !== undefined || (this.name !== undefined && this.name !== ''))) {
      for (const peer of this.peers) {
        if (peer !== this && peer.open) {
          // A peer whose consumer refuses the request stays open, which can
          // legitimately leave two open.
          peer.requestOpen(false)
        }
      }
    }
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
   * the collapse to the styled tier's `grid-template-rows: 0fr` puts the state
   * in a stylesheet, where only one of the two tiers has it.
   *
   * **`hidden` costs the styled tier nothing**, which is what makes this the
   * cheap fix rather than a trade. The UA sheet hides `[hidden]` from the UA
   * origin, and `accordion-item.css` already sets `display: grid` on this part
   * unconditionally, so the author rule wins and the 0fr transition runs
   * exactly as before. Measured on both tiers.
   *
   * **Not `hidden="until-found"`**, which would be the better accordion and is
   * a different piece of work. It hides through `content-visibility` rather
   * than `display`, so the styled tier's `display: grid` would no longer
   * override it and a collapsed section would animate open to nothing. It also
   * needs a `beforematch` handler to set `open`, or find-in-page reveals text
   * while the trigger still reports collapsed.
   *
   * `inert` stays. `hidden` answers the reader who can see and `inert` answers
   * the one tabbing through, and in the styled tier, where `display` is
   * overridden, `inert` is the only one of the two still in force.
   */
  protected override render(): TemplateResult {
    const open = this.open
    return html`
      <div part="container">
        <button
          id=${TRIGGER_ID}
          aria-controls=${CONTENT_ID}
          aria-expanded=${open ? 'true' : 'false'}
          part="trigger"
          type="button"
          @click=${this.handleToggle}
        >
          ${this.chevronPlacement === 'start' ? this.renderChevron() : nothing}
          <slot name="summary"></slot>
          ${this.chevronPlacement === 'start' ? nothing : this.renderChevron()}
        </button>
        <div
          id=${CONTENT_ID}
          aria-labelledby=${TRIGGER_ID}
          part="content"
          ?hidden=${!open}
          ?inert=${!open}
          role="region"
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
