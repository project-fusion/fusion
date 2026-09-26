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
 * An empty region with no explanation is indistinguishable from one that failed
 * to load, so this exists to tell the difference: what would be here, and the
 * one action that would put something here.
 *
 * Announced, because an empty view usually arrives in place of content that was
 * being fetched: saying so is the only way a screen-reader user learns the
 * search returned nothing, rather than being left waiting. **From a region of
 * its own that is there before its words are**, filled a frame after the view
 * appears. The host was the region, and a page inserts an empty state with its
 * message already in it, which is a region arriving with its words: read
 * inconsistently at best.
 *
 * Every region is a bare slot. The reference ships an `empty-state-heading` and
 * an `empty-state-actions` whose only job is to assign themselves a slot on
 * connect, which is a component for something the consumer can write.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Placeholder, NoResults, Blank
 * @documentation https://fusion.dev/helix/components/empty
 *
 * @slot - The message: why the region is empty, and what to do about it.
 * @slot actions - The action that would put something in the region.
 * @slot heading - The heading, which names what is missing.
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
