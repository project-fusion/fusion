import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCodeDiff } from '@fusion.dev/helix-headless/code-diff'
import type { CSSResultGroup } from 'lit'
import { styles } from './code-diff-root.css.js'

/**
 * @summary A change to some code, read as the lines it added and removed.
 *
 * @description
 * Code Block's frame, with each changed line washed in its tone: success for a
 * line the new version added, danger for one it removed, and the `+` or `-` in
 * the tone's own ink so the difference does not rest on telling two pale
 * surfaces apart.
 *
 * **Split falls back to unified stacking below about 40rem of its own width**,
 * the two files one above the other, since two columns of code at that width
 * leave neither readable.
 *
 * @since 0.1.0
 * @status experimental
 * @category typography
 * @aliases Diff, Code diff, Patch, Changes
 * @documentation https://helix.fusion.dev/components/code-diff
 *
 * @cssproperty --code-diff-background-color - Ground under the lines.
 * @cssproperty --code-diff-border-color - The edge around each block and header.
 * @cssproperty --code-diff-header-background-color - The bar carrying the file's name.
 * @cssproperty --code-diff-radius - Corner radius of each block.
 */
@customElement('helix-code-diff')
export class HelixCodeDiff extends HelixHeadlessCodeDiff {
  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-code-diff': HelixCodeDiff
  }
}
