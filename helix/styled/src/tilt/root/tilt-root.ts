import { customElement, HelixElement, PointerFollowController } from '@fusion.dev/helix-core'
import { type CSSResultGroup, html, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { styles } from './tilt-root.css.js'

/**
 * @summary Leans its content toward the pointer, as a card held in the hand.
 *
 * @description
 * Put a card or a picture inside, and while a mouse or pen moves over it, the
 * content turns in depth so the corner under the pointer comes forward. When
 * the pointer leaves, it settles back flat.
 *
 * **Only for a pointer that hovers.** A finger is not followed, and nothing
 * leans where the reader asked for less movement. The content is the page's
 * own and keeps its place in the reading order, its focus, and its clicks.
 *
 * A single tier, as `Marquee` is: the lean is the whole of the component.
 *
 * @since 0.241.0
 * @status experimental
 * @category content
 * @aliases Tilt card, Parallax card, 3D card, Hover tilt
 * @use A card or a picture that leans toward the mouse, such as a plan or a product shot.
 * @instead spotlight - Cards that stay flat and are lit under the pointer.
 * @instead magnetic - A button drawn a little way toward the pointer.
 * @documentation https://fusion.dev/design/components/tilt
 *
 * @slot - The content that leans, such as a `Card`.
 *
 * @csspart surface - The box that turns, holding the content.
 *
 * @cssproperty --tilt-angle - How far the content turns at an edge. Defaults to `8deg`.
 * @cssproperty --tilt-perspective - How far away the eye is, so a smaller distance turns more steeply. Defaults to `60rem`.
 *
 * @cssstate tilting - A pointer is over the content, which follows it closely. It settles back once the pointer leaves.
 */
@customElement('helix-tilt')
export class HelixTilt extends HelixElement {
  static override styles: CSSResultGroup = styles

  /** Where the pointer is over the host, as `PointerFollowController` hands it over. */
  @state()
  private at = { x: 0, y: 0 }

  constructor() {
    super()
    new PointerFollowController(this, {
      left: () => {
        this.toggleState('tilting', false)
        this.lean(0, 0)
      },
      moved: (x, y) => {
        this.toggleState('tilting', true)
        this.lean(x, y)
      },
    })
  }

  /** Holds the pointer's place, which the template writes for the stylesheet. */
  private lean(x: number, y: number): void {
    this.at = { x, y }
  }

  protected override render(): TemplateResult {
    return html`<div
      part="surface"
      style="--_tilt-x: ${this.at.x}; --_tilt-y: ${this.at.y}"
    >
      <slot></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tilt': HelixTilt
  }
}
