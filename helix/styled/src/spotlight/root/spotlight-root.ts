import { customElement, HelixElement, PointerFollowController } from '@fusion.dev/helix-core'
import { type CSSResultGroup, html, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { styles } from './spotlight-root.css.js'

/**
 * @summary A soft light that follows the pointer across its content and along its edge.
 *
 * @description
 * Put a `Card` or a tile inside, and while a mouse or pen moves over it, a
 * soft light follows the pointer across the content and lights the edge
 * nearest it. When the pointer leaves, the light fades where it was.
 *
 * **The light is the hover wash, drawn round.** It is the foreground at the
 * hover wash's own strength, so it shows the same in light and dark and asks
 * for no color of its own, and the edge is lit a few steps stronger. Both are
 * drawn over the content, take no pointer, and are hidden from screen readers,
 * so the content keeps its clicks, its focus, and its place in the reading
 * order.
 *
 * **Only for a pointer that hovers.** A finger is not followed, and nothing is
 * drawn where the reader asked for less movement.
 *
 * A single tier, as `Tilt` is: the light is the whole of the component.
 *
 * @since 0.246.0
 * @status experimental
 * @category content
 * @aliases Glow card, Hover glow, Cursor glow, Mouse light
 * @use A row of cards, such as pricing plans, lit under the mouse as it moves.
 * @instead shine - One button that a band of light crosses.
 * @instead border-beam - A card whose work is running, lit around its edge.
 * @instead tilt - A card that leans toward the pointer.
 * @practice Put each card of a row in its own Spotlight. - The row then reads as one surface the light moves over.
 * @documentation https://fusion.dev/design/components/spotlight
 *
 * @slot - The content the light moves over, such as a `Card`.
 *
 * @csspart edge - The light on the edge, a ring as wide as `--spotlight-edge-width`. Hidden from screen readers.
 * @csspart glow - The light over the content. Hidden from screen readers.
 *
 * @cssproperty --spotlight-color - The color of the light over the content. Defaults to the foreground at 5% in light mode and 8% in dark mode.
 * @cssproperty --spotlight-edge-color - The color of the light on the edge. Defaults to the foreground at 30% in light mode and 40% in dark mode. `transparent` lights no edge.
 * @cssproperty --spotlight-edge-width - How wide the lit edge is. Defaults to `--helix-border-thin`, a `Card`'s border.
 * @cssproperty --spotlight-radius - The corners the light is clipped to. Defaults to `--helix-radii-md`, the corners of a `Card`.
 * @cssproperty --spotlight-size - How far the light reaches from the pointer. Defaults to `12rem`.
 *
 * @cssstate lit - A pointer is over the content, and the light follows it. It fades once the pointer leaves.
 */
@customElement('helix-spotlight')
export class HelixSpotlight extends HelixElement {
  static override styles: CSSResultGroup = styles

  /**
   * Where the light is over the host, as a share of its width and height from
   * the top left, kept as the light fades so it fades where it was.
   */
  @state()
  private at = { x: 0.5, y: 0.5 }

  constructor() {
    super()
    new PointerFollowController(this, {
      left: () => {
        this.toggleState('lit', false)
      },
      moved: (x, y) => {
        /* The controller signs the inline axis for a page's direction, which
           a light under the pointer has to undo: it sits where the pointer
           is, on the screen. */
        const rtl = getComputedStyle(this).direction === 'rtl'
        this.at = { x: ((rtl ? -x : x) + 1) / 2, y: (y + 1) / 2 }
        this.toggleState('lit', true)
      },
    })
  }

  protected override render(): TemplateResult {
    const place = `--_spotlight-x: ${(this.at.x * 100).toFixed(2)}%; --_spotlight-y: ${(this.at.y * 100).toFixed(2)}%`
    return html`<slot></slot
      ><span part="glow" aria-hidden="true" style=${place}></span
      ><span part="edge" aria-hidden="true" style=${place}></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-spotlight': HelixSpotlight
  }
}
