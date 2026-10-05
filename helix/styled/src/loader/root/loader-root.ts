import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessLoader } from '@fusion.dev/helix-headless/loader'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './loader-root.css.js'

/**
 * @summary Shows that work of unknown length is in progress.
 *
 * @description
 * Sized from the loader size tokens, so a loader is the same size wherever it
 * is placed and follows the density region it sits in. Set `--loader-size:
 * 1em` to match the text beside it, as inside a button. The color is
 * `currentColor`, so it matches the text color around it, including inside a
 * primary button.
 *
 * While `delay` runs, the loader keeps its size and draws nothing, so the line
 * it sits in does not move when it appears.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Spinner, Busy, Activity
 * @documentation https://fusion.dev/helix/components/loader
 *
 * @cssproperty --loader-color - Color of the moving arc.
 * @cssproperty --loader-size - Diameter. Defaults to the size token that `size` picks, which is 1.5rem at the default density.
 * @cssproperty --loader-track-color - Color of the circle behind the arc.
 */
@customElement('helix-loader')
export class HelixLoader extends HelixHeadlessLoader {
  /**
   * Diameter, from the loader size tokens.
   */
  @property({ reflect: true })
  size?: 'sm' | 'md' | 'lg'

  /**
   * How the loader is drawn. Leave it unset for a spinning arc, or set `pulse`.
   *
   * Unset is the turning arc, which is what most waits want.
   *
   * `pulse` takes the arc away and lets the middle carry the motion on its own:
   * the ring stays as the quiet outline and swells, and whatever is slotted
   * swells with it, in step. It is the shape for a wait that has a mark to
   * show, a splash or a first paint behind a wordmark, where a rotating rim
   * around a logo reads as chrome bolted to the brand.
   */
  @property({ reflect: true })
  variant?: 'pulse'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-loader': HelixLoader
  }
}
