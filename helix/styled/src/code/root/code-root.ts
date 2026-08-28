import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCode } from '@fusion.dev/helix-headless/code'
import type { CSSResultGroup } from 'lit'
import { styles } from './code-root.css.js'

/**
 * @summary A fragment of code inside a line of prose.
 *
 * @description
 * A step down the scale, because a monospace face reads larger than the prose
 * around it at the same nominal size. `--code-size` overrides it.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @documentation https://helix.fusion.dev/components/code
 *
 * @cssproperty --code-padding - Space either side of the fragment. Defaults to half
 * of `space-2xs`, which is what keeps a bracket beside the chip rather than a space
 * away from it.
 * @cssproperty --code-size - The fragment's size. Defaults to `text-sm`.
 */
@customElement('helix-code')
export class HelixCode extends HelixHeadlessCode {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-code': HelixCode
  }
}
