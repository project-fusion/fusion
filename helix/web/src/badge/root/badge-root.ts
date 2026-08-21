import { customElement } from '@helix-io/core'
import { HelixBaseBadge } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './badge-root.css.js'

/**
 * @summary Attaches a count or a presence mark to another element.
 *
 * @description
 * The indicator carries a ring in the page's own background color, so it stays
 * legible where it overlaps the thing it is pinned to. Without it a dark badge
 * on a dark icon reads as a bite taken out of the icon.
 *
 * @since 0.1.0
 * @status stable
 * @category content
 * @aliases Count, Indicator, Pip
 * @documentation https://helix.fusion.dev/components/badge
 *
 * @cssproperty --badge-background-color - Fill of the indicator.
 * @cssproperty --badge-offset - Pulls the mark in from the corner, along both axes.
 * @cssproperty --badge-ring-color - The ring separating it from what is behind.
 */
@customElement('helix-badge')
export class HelixBadge extends HelixBaseBadge {
  /** How much attention the mark asks for. */
  @property({ reflect: true })
  appearance?: 'danger' | 'neutral'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-badge': HelixBadge
  }
}
