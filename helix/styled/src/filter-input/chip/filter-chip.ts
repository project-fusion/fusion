import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessFilterChip } from '@fusion.dev/helix-headless/filter-input'
import type { CSSResultGroup } from 'lit'
import { styles } from './filter-chip.css.js'

/**
 * @summary One active filter: a field, a comparison, and the values it is compared to.
 *
 * @description
 * Draws three segments and a remove control, with the values most prominent.
 * The field is the quietest segment, because the user picked it. The values
 * carry the most weight, because a row of chips is scanned for what each filter
 * is set to.
 *
 * The operator segment is drawn only when there is an operator, so the common
 * chip shows only the field and the values. The headless element documents the
 * rule.
 *
 * @since 0.23.0
 * @status stable
 * @category forms
 * @aliases FilterToken, FacetChip
 * @documentation https://fusion.dev/helix/components/filter-input
 *
 * @cssproperty --filter-input-chip-background-color - The fill behind the chip.
 * @cssproperty --filter-input-chip-border-color - The color of the chip's border.
 * @cssproperty --filter-input-chip-radius - The corner radius of the chip.
 */
@customElement('helix-filter-chip')
export class HelixFilterChip extends HelixHeadlessFilterChip {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-filter-chip': HelixFilterChip
  }
}
