import { customElement } from '@helix-io/core'
import { HelixBaseOptionGroup } from '@helix-io/headless/option'
import type { CSSResultGroup } from 'lit'
import { styles } from './option-group.css.js'

/**
 * @summary A named run of options inside a listbox.
 *
 * @description
 * The heading is set small and quiet, because it is a divider that happens to
 * have words on it: a run of options is read as a list and the heading is what
 * tells you which list, not something to read on its own.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases OptGroup, Section
 * @documentation https://helix.fusion.dev/components/option-group
 */
@customElement('helix-option-group')
export class HelixOptionGroup extends HelixBaseOptionGroup {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-option-group': HelixOptionGroup
  }
}
