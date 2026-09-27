import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessOptionGroup } from '@fusion.dev/helix-headless/option'
import type { CSSResultGroup } from 'lit'
import { styles } from './option-group.css.js'

/**
 * @summary A labeled group of options inside a listbox.
 *
 * @description
 * The heading is small and muted. It labels the run of options below it and is
 * not meant to be read as content of its own.
 *
 * @since 0.1.0
 * @status stable
 * @aliases OptGroup, Section
 * @documentation https://fusion.dev/helix/components/option
 */
@customElement('helix-option-group')
export class HelixOptionGroup extends HelixHeadlessOptionGroup {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-option-group': HelixOptionGroup
  }
}
