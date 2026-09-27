import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCallout } from '@fusion.dev/helix-headless/callout'
import type { CSSResultGroup } from 'lit'
import { styles } from './callout-root.css.js'

/**
 * @summary A passage set apart as information, a warning, or an error.
 *
 * @description
 * The background is a tint of the tone's status color, mixed with `color-mix`.
 * A bar on the inline start edge also marks the tone, so it still shows in
 * grayscale and for people who do not distinguish the hues.
 *
 * This tier has no treatment property. `tone` is set on the headless tier and
 * carries the meaning, and this tier draws it.
 *
 * @since 0.1.0
 * @status stable
 * @category markers
 * @aliases Admonition, Notice, Note, Alert
 * @documentation https://fusion.dev/helix/components/callout
 *
 * @slot - The callout's content.
 * @slot icon - Replaces the icon chosen by `tone`.
 *
 * @csspart content - The content region.
 * @csspart icon - The icon region.
 *
 * @cssproperty --callout-background-color - The fill behind the callout.
 * @cssproperty --callout-radius - The corner radius of the callout.
 */
@customElement('helix-callout')
export class HelixCallout extends HelixHeadlessCallout {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-callout': HelixCallout
  }
}
