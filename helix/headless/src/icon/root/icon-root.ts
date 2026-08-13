import { customElement, HelixElement } from '@helix-io/core'
import { icons } from '@helix-io/icons'
import { html, nothing, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Renders a named icon from the Helix set.
 *
 * @description
 * Icons are data rather than components, so the set is a plain record of path
 * strings and this element is the only thing that knows how to draw one. A name
 * with no match renders nothing at all instead of an empty box, so a typo
 * cannot leave a hole in a layout that looks deliberate.
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
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      role=${labelled ? 'img' : nothing}
      aria-label=${labelled ? this.label : nothing}
      aria-hidden=${labelled ? nothing : 'true'}
    >
      <path d=${icon.path}></path>
    </svg>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-icon': HelixBaseIcon
  }
}
