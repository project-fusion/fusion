import { customElement, HelixElement, PointerFollowController } from '@fusion.dev/helix-core'
import { type CSSResultGroup, html, type TemplateResult } from 'lit'
import { state } from 'lit/decorators.js'
import { styles } from './magnetic-root.css.js'

/**
 * @summary Draws its content a little way toward the pointer, as if pulled.
 *
 * @description
 * Put a button inside, and while a mouse or pen moves over it, the button
 * drifts toward the pointer, the further the nearer the pointer is to an
 * edge, and springs back to its place when the pointer leaves.
 *
 * **Only for a pointer that hovers.** A finger is not followed, and nothing
 * drifts where the reader asked for less movement. The content moves by at
 * most `--magnetic-reach`.
 *
 * A single tier, as `Tilt` is: the drift is the whole of the component.
 *
 * @since 0.241.0
 * @status experimental
 * @category content
 * @aliases Magnetic button, Pointer pull, Attract
 * @use The main button on a landing page, drawn toward the mouse as it nears.
 * @instead tilt - A card that turns in depth under the pointer.
 * @instead shine - A button that a band of light crosses.
 * @practice Keep `--magnetic-reach` smaller than the content. - The drift then never takes the content out from under the pointer.
 * @documentation https://fusion.dev/design/components/magnetic
 *
 * @slot - The content that drifts, such as a `Button`.
 *
 * @csspart surface - The box that drifts, holding the content.
 *
 * @cssproperty --magnetic-reach - How far the content drifts at most, with the pointer at an edge. Defaults to `--helix-space-sm`.
 *
 * @cssstate pulled - A pointer is over the content, which follows it closely. It springs back once the pointer leaves.
 */
@customElement('helix-magnetic')
export class HelixMagnetic extends HelixElement {
  static override styles: CSSResultGroup = styles

  /** Where the pointer is over the host, as `PointerFollowController` hands it over. */
  @state()
  private at = { x: 0, y: 0 }

  constructor() {
    super()
    new PointerFollowController(this, {
      left: () => {
        this.toggleState('pulled', false)
        this.pull(0, 0)
      },
      moved: (x, y) => {
        this.toggleState('pulled', true)
        this.pull(x, y)
      },
    })
  }

  /** Holds the pointer's place, which the template writes for the stylesheet. */
  private pull(x: number, y: number): void {
    this.at = { x, y }
  }

  protected override render(): TemplateResult {
    return html`<div
      part="surface"
      style="--_magnetic-x: ${this.at.x}; --_magnetic-y: ${this.at.y}"
    >
      <slot></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-magnetic': HelixMagnetic
  }
}
