import { customElement, HelixElement } from '@helix-io/core'
import { icons } from '@helix-io/icons'
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
 * A name with no match renders nothing at all instead of an empty box, so a
 * typo cannot leave a hole in a layout that looks deliberate.
 *
 * An icon is decorative by default and hidden from assistive technology. Give
 * it a `label` only when the icon is the sole carrier of meaning, such as
 * inside a button with no text.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Glyph, Symbol
 * @documentation https://helix.fusion.dev/components/icon
 *
 * @csspart svg - The rendered SVG.
 */
@customElement('helix-base-icon')
export class HelixBaseIcon extends HelixElement {
  /** Name of the icon in the Helix set. */
  @property({ reflect: true })
  name = ''

  /** Accessible name, for an icon that is not decorative. */
  @property({ reflect: true })
  label = ''

  protected override render(): TemplateResult | typeof nothing {
    const icon = icons[this.name]
    if (!icon) {
      return nothing
    }

    // A labelled icon is content and needs a role to carry the label. An
    // unlabelled one is decoration sitting beside text that already says the
    // same thing, so it is removed from the accessibility tree rather than
    // announced twice.
    const labelled = this.label.length > 0
    return html`<svg
      part="svg"
      viewBox=${icon.viewBox}
      role=${labelled ? 'img' : nothing}
      aria-label=${labelled ? this.label : nothing}
      aria-hidden=${labelled ? nothing : 'true'}
    >
      ${unsafeSVG(icon.content)}
    </svg>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-icon': HelixBaseIcon
  }
}
