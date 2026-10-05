import {
  ArrivalController,
  customElement,
  HelixElement,
  slottedWords,
} from '@fusion.dev/helix-core'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A message that a region has nothing in it, and the next step to take.
 *
 * @description
 * Shows what would be in a region and the one action that would fill it, so an
 * empty region does not look like one that failed to load.
 *
 * The message is announced, because an empty view often replaces content that
 * was loading, and the announcement tells a screen reader user that the search
 * returned nothing. It is announced from a status region of its own, which is
 * rendered empty and filled a frame after the view appears. Screen readers read
 * a region that arrives with its text already in it inconsistently.
 *
 * Every region is a bare slot. There is no `empty-state-heading` or
 * `empty-state-actions` element: assign your own heading and actions to the
 * slots.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Placeholder, NoResults, Blank
 * @documentation https://fusion.dev/helix/components/empty
 *
 * @slot - The message: why the region is empty, and what to do about it.
 * @slot actions - The action that would put something in the region.
 * @slot heading - The heading, which names what is missing. Slot a heading element, such as an `<h3>`, so a reader can find it in the page's outline.
 * @slot icon - An icon above the heading.
 *
 * @csspart live - A copy of the heading and the message, in a live region that screen readers announce when the view appears. Visually hidden in the styled tier.
 */
@customElement('helix-headless-empty')
export class HelixHeadlessEmpty extends HelixElement {
  /**
   * Whether the state is announced when it appears.
   *
   * On by default: an empty view almost always replaces something that was
   * loading. Turn it off for one that was on the page from the start, which
   * has nothing to announce because nothing changed.
   */
  @property({ attribute: 'no-announce', reflect: true, type: Boolean })
  noAnnounce = false

  /* Filled a frame after the view appears, when it appears after the page has
     loaded, as `Announcement`'s band is; at once, and silently, when it came
     with the page. A page a framework served without declarative shadow DOM is
     not `serverRendered`, so without the load test every empty state in it
     spoke over the page as it opened. */
  protected readonly arrival = new ArrivalController(this, {
    arriving: () => !this.serverRendered && document.readyState === 'complete',
    text: () => slottedWords(this, ['heading', '']),
  })

  protected override render(): TemplateResult {
    const say = () => this.arrival.say()
    return html`<slot name="icon"></slot>
      <slot name="heading" @slotchange=${say}></slot>
      <slot @slotchange=${say}></slot>
      <slot name="actions"></slot>
      ${
        this.noAnnounce
          ? nothing
          : html`<span part="live" role="status">${this.arrival.said}</span>`
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-empty': HelixHeadlessEmpty
  }
}
