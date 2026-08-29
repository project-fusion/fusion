import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { icons } from '@fusion.dev/helix-icons'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary Renders a named icon from the Helix set.
 *
 * @description
 * The set is Phosphor, drawn on a 256 box at stroke-width 16, and each glyph is
 * rendered as its own inner markup rather than as a single path. Most icons are
 * several elements at once, each with its own stroke and fill, so a one-path
 * model would draw a fraction of the set and quietly drop the rest.
 *
 * **The markup is trusted by construction.** It is generated at build time from
 * SVG files in this repository, never from anything a user supplies, which is
 * what makes `unsafeSVG` the right tool rather than a risk.
 *
 * The `<svg>` carries `fill="currentColor"` because the generator keeps only
 * the inner markup and discards the source's own root tag, and that tag is
 * where Phosphor puts its fill. Without it, every solid glyph in the set, 65 of
 * them, falls back to the SVG default of black and disappears on a dark page.
 * Shapes that set their own `fill` or `stroke` are unaffected, which is why the
 * outline icons looked fine and hid this.
 *
 * A name with no match renders nothing at all instead of an empty box, so a
 * typo cannot leave a hole in a layout that looks deliberate.
 *
 * An icon is decorative by default and hidden from assistive technology. Give
 * it a `label` only when the icon is the sole carrier of meaning, such as
 * inside a button with no text.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases Glyph, Symbol
 * @documentation https://helix.fusion.dev/components/icon
 *
 * @csspart svg - The rendered SVG.
 */
@customElement('helix-headless-icon')
export class HelixHeadlessIcon extends HelixElement {
  /**
   * Name of the icon in the Helix set.
   */
  @property()
  name = ''

  /**
   * Accessible name, for an icon that is not decorative.
   */
  @property()
  label = ''

  protected override render(): TemplateResult | typeof nothing {
    /* Own keys only. A truthiness check on a plain-object index lets an
       inherited `Object.prototype` key through, and the component renders a
       sized, empty `<svg viewBox="">` rather than nothing at all. */
    const icon = Object.hasOwn(icons, this.name) ? icons[this.name] : undefined
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
