import { customElement } from '@helix-io/core'
import { HelixBaseSpinner } from '@helix-io/headless'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './spinner-root.css.js'

/**
 * @summary Says that something indeterminate is in progress.
 *
 * @description
 * Sized in `em`, so it matches whatever text it sits beside without being told.
 * The colour is `currentColor` for the same reason: a spinner inside a primary
 * button is on the accent, and one in body copy is not, and neither should have
 * to say so.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Loader, Busy, Activity
 * @documentation https://helix.fusion.dev/components/spinner
 *
 * @cssproperty --spinner-size - Diameter. Defaults to 1.5em.
 * @cssproperty --spinner-color - Colour of the moving arc.
 * @cssproperty --spinner-track-color - Colour of the circle behind it.
 */
@customElement('helix-spinner')
export class HelixSpinner extends HelixBaseSpinner {
  /** Diameter relative to the surrounding text. */
  @property({ reflect: true })
  size?: 'sm' | 'lg'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-spinner': HelixSpinner
  }
}
