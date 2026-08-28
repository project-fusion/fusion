import { customElement } from '@helix-io/core'
import { HelixHeadlessLoader } from '@helix-io/headless/loader'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './loader-root.css.js'

/**
 * @summary Says that something indeterminate is in progress.
 *
 * @description
 * Sized in `em`, so it matches whatever text it sits beside without being told.
 * The color is `currentColor` for the same reason: a loader inside a primary
 * button is on the accent, and one in body copy is not, and neither should have
 * to say so.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Spinner, Busy, Activity
 * @documentation https://helix.fusion.dev/components/loader
 *
 * @cssproperty --loader-color - Color of the moving arc.
 * @cssproperty --loader-size - Diameter. Defaults to 1.5em.
 * @cssproperty --loader-track-color - Color of the circle behind it.
 */
@customElement('helix-loader')
export class HelixLoader extends HelixHeadlessLoader {
  /**
   * How the waiting is drawn.
   *
   * Unset is the turning arc, which is what most waits want and what this
   * component was called for years.
   *
   * `pulse` takes the arc away and lets the middle carry the motion on its own:
   * the ring stays as the quiet outline and swells, and whatever is slotted
   * swells with it, in step. It is the shape for a wait that has a mark to
   * show, a splash or a first paint behind a wordmark, where a rotating rim
   * around a logo reads as chrome bolted to the brand.
   *
   * That the component can now be drawn without anything spinning is why it is
   * no longer called Spinner: the old name described one appearance of two.
   */
  @property({ reflect: true })
  variant?: 'pulse'

  /**
   * Diameter relative to the surrounding text.
   */
  @property({ reflect: true })
  size?: 'sm' | 'md' | 'lg'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-loader': HelixLoader
  }
}
