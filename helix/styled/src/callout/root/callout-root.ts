import { customElement } from '@helix-io/core'
import { HelixHeadlessCallout } from '@helix-io/headless/callout'
import type { CSSResultGroup } from 'lit'
import { styles } from './callout-root.css.js'

/**
 * @summary Sets a passage apart as information, a warning, or an error.
 *
 * @description
 * Tinted from the severity's status color with `color-mix`, and marked with a
 * bar on the inline start so the severity survives being read in grayscale or
 * by anyone who does not distinguish the hues.
 *
 * There is no treatment axis here. `tone` carries the meaning and lives on the
 * headless tier; this tier only decides what that meaning looks like.
 *
 * @since 0.1.0
 * @status stable
 * @category markers
 * @aliases Admonition, Notice, Note, Alert
 * @documentation https://helix.fusion.dev/components/callout
 *
 * @slot - The callout's content.
 * @slot icon - Replaces the icon chosen by `severity`.
 *
 * @csspart content - The content region.
 * @csspart icon - The icon region.
 *
 * @cssproperty --callout-background-color - Fill behind the callout.
 * @cssproperty --callout-radii - Corner radius of the callout.
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
