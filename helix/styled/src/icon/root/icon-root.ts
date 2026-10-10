import { customElement, numberConverter } from '@fusion.dev/helix-core'
import { HelixHeadlessIcon } from '@fusion.dev/helix-headless/icon/root'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './icon-root.css.js'

/**
 * @summary A named icon from the Helix set.
 *
 * @description
 * Draws in `currentColor` and sizes from `--icon-size`, so an icon takes the
 * color of the text around it and a container can resize it without a property.
 * Inside a button, `--icon-size` is set in `em`, so the icon scales with the
 * button.
 *
 * **The glyph turns, flips and moves inside its own box**, so the line around
 * it keeps its place: `rotate` turns it by a quarter, a half or three
 * quarters, `--icon-rotate` by any angle, `flip` mirrors it across either
 * axis, and `animation` spins, pulses or beats it, as Web Awesome's icon does.
 * Reduced motion stills every animation. `auto-width` gives the box the
 * glyph's own proportions, for a mark wider than it is tall.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases Glyph, Symbol
 * @documentation https://fusion.dev/helix/components/icon
 *
 * @csspart svg - The rendered SVG.
 *
 * @cssproperty --icon-animation-duration - How long one turn, pulse or beat of `animation` takes.
 * @cssproperty --icon-rotate - An angle the glyph is turned by, such as `45deg`. `rotate` wins over it.
 * @cssproperty --icon-size - The width and height of the icon's box. The height alone under `auto-width`.
 */
@customElement('helix-icon')
export class HelixIcon extends HelixHeadlessIcon {
  /**
   * A motion that draws the eye or says work is going on: `spin` turns the
   * glyph without end, `pulse` fades it in and out, and `beat` swells it.
   *
   * Absent is still. Reduced motion stills every one of them.
   */
  @property({ reflect: true })
  animation?: 'beat' | 'pulse' | 'spin'

  /**
   * Whether the box takes the glyph's own proportions, its height from
   * `--icon-size` and its width from the glyph's box.
   *
   * Absent is a square, which lines icons up in a column.
   */
  @property({ attribute: 'auto-width', reflect: true, type: Boolean })
  autoWidth = false

  /**
   * Mirrors the glyph across an axis: `x` left to right, `y` top to bottom,
   * `both` across both.
   *
   * Absent draws it as it is. On a right-to-left page, `mirror` is the flip
   * that follows the direction.
   */
  @property({ reflect: true })
  flip?: 'both' | 'x' | 'y'

  /**
   * Turns the glyph clockwise by 90, 180 or 270 degrees.
   *
   * Absent draws it upright. `--icon-rotate` turns it by any other angle.
   */
  @property({ converter: numberConverter('rotate', undefined, 'degrees'), reflect: true })
  rotate?: 90 | 180 | 270

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-icon': HelixIcon
  }
}
