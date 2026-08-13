import { HelixBaseDisclosure } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styles } from './disclosure-root.css.js'

/**
 * @summary Shows and hides a section of related content.
 *
 * @description
 * The content region animates between collapsed and expanded by transitioning a
 * grid row, which is the only technique that reaches the content's intrinsic
 * height without measuring it in JavaScript.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Collapsible, Expander
 * @documentation https://helix.fusion.dev/components/disclosure
 *
 * @slot summary - The always-visible trigger content.
 * @slot - The content revealed when open.
 *
 * @csspart container - The outer wrapper.
 * @csspart trigger - The clickable summary row.
 * @csspart content - The revealed region. Animates open and closed.
 * @csspart content-inner - Padding wrapper inside the animated region.
 *
 * @cssproperty --disclosure-background-color - Surface behind the disclosure.
 * @cssproperty --disclosure-border-color - Border color of the container.
 * @cssproperty --disclosure-padding - Inner padding of trigger and content.
 *
 * @event {HelixOpenChangeEvent} helix-open-change - Fired when the disclosure opens or closes.
 */
@customElement('helix-disclosure')
export class HelixDisclosure extends HelixBaseDisclosure {
  /**
   * Visual weight of the disclosure.
   */
  @property({ reflect: true })
  appearance: 'outlined' | 'plain' = 'outlined'

  /**
   * Reduces the vertical padding for dense layouts.
   */
  @property({ reflect: true, type: Boolean })
  dense = false

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-disclosure': HelixDisclosure
  }
}
