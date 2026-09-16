import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessFilterChip } from '@fusion.dev/helix-headless/filter-input'
import type { CSSResultGroup } from 'lit'
import { styles } from './filter-chip.css.js'

/**
 * @summary One filter in force: a field, how it is compared, and to what.
 *
 * @description
 * Three segments and a control, drawn so the reader's eye lands on the values.
 * The field is the quietest of the three because it is the part they already
 * know, having picked it; the values carry the weight, because a bar of these is
 * scanned for what the filters are set to rather than for what they are on.
 *
 * The operator segment is drawn only where there is one, which is what keeps the
 * common chip free of jargon. See the headless note, which records the rule.
 *
 * @since 0.23.0
 * @status experimental
 * @category forms
 * @aliases FilterToken, FacetChip
 * @documentation https://fusion.dev/helix/components/filter-input
 *
 * @cssproperty --filter-input-chip-background-color - Fill behind the chip.
 * @cssproperty --filter-input-chip-border-color - Color of the edge.
 * @cssproperty --filter-input-chip-radius - Corner radius of the chip.
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
