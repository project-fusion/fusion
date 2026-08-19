import { customElement } from '@helix-io/core'
import { HelixBaseLoader } from '@helix-io/headless'
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
 * @status experimental
 * @aliases Spinner, Busy, Activity
 * @documentation https://helix.fusion.dev/components/loader
 *
 * @cssproperty --loader-size - Diameter. Defaults to 1.5em.
 * @cssproperty --loader-color - Color of the moving arc.
 * @cssproperty --loader-track-color - Color of the circle behind it.
 */
@customElement('helix-loader')
export class HelixLoader extends HelixBaseLoader {
  /** Diameter relative to the surrounding text. */
  @property({ reflect: true })
  size?: 'sm' | 'md' | 'lg'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-loader': HelixLoader
  }
}
