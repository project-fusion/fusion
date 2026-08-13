import { customElement, HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { HelixBaseCardTitle } from '../title/card-title.js'

/**
 * @summary Groups related content and actions into a single surface.
 *
 * @description
 * Composed of regions rather than slots on one element, so a header, body, or
 * footer can be styled, omitted, and reordered independently.
 *
 * Set `aria-labelledby` or `aria-label` for a name present in server-rendered
 * HTML. Otherwise the card adopts the first `Card.Title` beneath it once in a
 * browser, however deeply nested.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Panel, Surface
 * @documentation https://helix.fusion.dev/components/card
 *
 * @slot - Card regions, typically Header, Body, and Footer.
 *
 * @csspart container - The card surface.
 */
@customElement('helix-base-card')
export class HelixBaseCard extends HelixElement {
  /**
   * True when the consumer named the card, so adoption must not overwrite it.
   *
   * Resolved lazily on first update rather than in `connectedCallback`: the SSR
   * renderer applies template attributes around that hook, so reading them
   * there sees the element before the consumer's `aria-label` has landed.
   */
  private consumerNamed: boolean | undefined = undefined

  /** True when this element set the label itself and may therefore clear it. */
  private ownsLabel = false

  /**
   * The title that announced itself, if any.
   *
   * Not named `title`: that is `HTMLElement.title`, the tooltip attribute, so
   * assigning to it would set a tooltip rather than track an element.
   *
   * Held rather than queried. Querying would mean naming the tags that count,
   * and the headless tier cannot know the styled tier's tag without depending
   * upward on it. The title says what it is instead.
   */
  private adoptedTitle: HelixBaseCardTitle | null = null

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener(HelixBaseCardTitle.readyEvent, this.handleTitleReady)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener(HelixBaseCardTitle.readyEvent, this.handleTitleReady)
  }

  /**
   * Adopts the announcing title, which is the event's target.
   *
   * `instanceof` rather than a tag check: the styled tier extends this one, so
   * a `helix-card-title` is a `HelixBaseCardTitle`, and the base never learns a
   * name from the tier above it.
   */
  private handleTitleReady = (event: Event): void => {
    if (event.target instanceof HelixBaseCardTitle) {
      this.adoptedTitle = event.target
      this.requestUpdate()
    }
  }

  /**
   * Sets role and name. Both are attribute writes with no DOM access, so this
   * is safe on the server, where the element shim has no tree to traverse.
   *
   * ARIA goes on the host rather than the shadow container because IDREFs do
   * not cross shadow boundaries: a reference from inside the shadow root could
   * never resolve to a title in the light DOM.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.setAttribute('role', 'group')

    this.consumerNamed ??=
      (this.hasAttribute('aria-labelledby') && !this.ownsLabel) || this.hasAttribute('aria-label')

    if (this.consumerNamed) {
      return
    }

    // `||` not `??`: an element with no id has `id === ''`, which is not
    // nullish, and an empty reference names the group the empty string.
    const id = (this.adoptedTitle?.isConnected && this.adoptedTitle.id) || null
    if (id) {
      this.setAttribute('aria-labelledby', id)
      this.ownsLabel = true
    } else if (this.ownsLabel) {
      this.removeAttribute('aria-labelledby')
      this.ownsLabel = false
    }
  }

  protected handleSlotChange = (): void => {
    if (this.adoptedTitle && !this.contains(this.adoptedTitle)) {
      this.adoptedTitle = null
      this.requestUpdate()
    }
  }

  protected override render(): TemplateResult {
    return html`
      <div part="container">
        <slot @slotchange=${this.handleSlotChange}></slot>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-card': HelixBaseCard
  }
}
