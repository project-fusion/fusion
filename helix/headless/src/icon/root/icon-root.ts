import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { type HelixIcon, icons } from '@fusion.dev/helix-icons'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary A named icon from the Helix set.
 *
 * @description
 * The icons are Phosphor, drawn on a 256 box at stroke-width 16. Each glyph
 * renders its full inner markup, because most icons are several elements, each
 * with its own stroke and fill.
 *
 * The markup is generated at build time from SVG files in this repository and
 * never comes from user input, so rendering it with `unsafeSVG` is safe.
 *
 * The `<svg>` carries `fill="currentColor"`. The generator keeps only the inner
 * markup, and Phosphor sets its fill on the root tag that the generator
 * discards. Without it, the 65 solid glyphs fall back to black and disappear on
 * a dark background. Shapes that set their own `fill` or `stroke` are
 * unaffected.
 *
 * A name with no match renders nothing.
 *
 * An icon is decorative by default and hidden from assistive technology. Set
 * `label` only when the icon is the only carrier of meaning, such as in a
 * button with no text.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases Glyph, Symbol
 * @documentation https://fusion.dev/helix/components/icon
 *
 * @csspart svg - The rendered SVG.
 */
@customElement('helix-headless-icon')
export class HelixHeadlessIcon extends HelixElement {
  /**
   * The icon to draw, as an object you import.
   *
   * **The scalable door, and the one this library uses internally.** An icon is
   * data, `{ content, name, viewBox }`, so a value imported by name ships one
   * glyph rather than the set, a weight is a subpath rather than an index of
   * every weight, and the supply stops being ours: anything exporting that
   * shape works, whether it is Phosphor at another weight, Lucide, or a
   * consumer's own drawings.
   *
   * **A property and not an attribute**, because an object is not a string. The
   * frameworks set properties and plain markup cannot, which is what `name` is
   * for. Set both and this wins, the value being the more specific statement.
   */
  @property({ attribute: false })
  icon?: HelixIcon

  /**
   * The icon's name, read by screen readers. Set it for an icon that is not
   * decorative.
   */
  @property()
  label = ''

  /**
   * Flips the glyph on a right-to-left page. Use it for an arrow that means
   * forward or back.
   *
   * Asked for rather than inferred from the name. The names are physical, and
   * `arrow-left` drawn pointing right on an Arabic page would be the icon
   * disagreeing with its own name for every reader who meant the left.
   */
  @property({ type: Boolean })
  mirror = false

  /**
   * The name of the icon in the Helix set.
   *
   * **A lookup, and the reason both this and `icon` exist.** A name is a string,
   * so it is what markup can carry, and resolving one means an index of the
   * whole set that no bundler can shake: 15 kB for a consumer who renders one
   * mark. An attribute is the only thing an HTML author can write, and that is
   * worth the index; a consumer who would rather not pay it hands over the
   * value instead.
   */
  @property()
  name = ''

  protected override render(): TemplateResult | typeof nothing {
    /* Own keys only. A truthiness check on a plain-object index lets an
       inherited `Object.prototype` key through, and the component renders a
       sized, empty `<svg viewBox="">` rather than nothing at all. */
    const named = Object.hasOwn(icons, this.name) ? icons[this.name] : undefined
    const icon = this.icon ?? named
    if (!icon) {
      return nothing
    }

    // A labeled icon is content and needs a role to carry the label. An
    // unlabelled one is decoration sitting beside text that already says the
    // same thing, so it is removed from the accessibility tree rather than
    // announced twice.
    const labeled = this.label.length > 0
    return html`<svg
      part="svg"
      ?data-mirror=${this.mirror}
      fill="currentColor"
      viewBox=${icon.viewBox}
      role=${labeled ? 'img' : nothing}
      aria-label=${labeled ? this.label : nothing}
      aria-hidden=${labeled ? nothing : 'true'}
    >
      ${unsafeSVG(icon.content)}
    </svg>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-icon': HelixHeadlessIcon
  }
}
