import { customElement } from '@helix-io/core'
import { HelixBaseCode } from '@helix-io/headless/code'
import type { CSSResultGroup } from 'lit'
import { styles } from './code-root.css.js'

/**
 * @summary A fragment of code inside a line of prose.
 *
 * @description
 * A step down the scale, because a monospace face reads larger than the prose
 * around it at the same nominal size. `--code-size` overrides it.
 *
 * @cssproperty --code-size - The fragment's size. Defaults to `text-sm`.
 * @cssproperty --code-padding - Space either side of the fragment. Defaults to half
 * of `space-2xs`, which is what keeps a bracket beside the chip rather than a space
 * away from it.
 *
 * @since 0.1.0
 * @status stable
 * @category content
 * @documentation https://helix.fusion.dev/components/code
 */
@customElement('helix-code')
export class HelixCode extends HelixBaseCode {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-code': HelixCode
  }
}
