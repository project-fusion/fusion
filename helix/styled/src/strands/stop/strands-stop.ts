import { customElement, HelixElement } from '@fusion.dev/helix-core'
import type { CSSResultGroup } from 'lit'
import { nothing } from 'lit'
import { property } from 'lit/decorators.js'
import type { StrandsVariant } from '../path.js'
import { styles } from './strands-stop.css.js'

/**
 * @summary Pins a form of the ribbon to a section of the page.
 *
 * @description
 * Placed inside a `helix-strands` with `travel`, a stop names an element with
 * `for` and says which form the ribbon takes when the page reaches it: a `fan`
 * bending through it, a `ribbon` passing through `at`, or `waves` crossing at
 * its top edge. The stops are read in page order, whatever order they are
 * written in, and a stop naming no element is skipped.
 *
 * A stop draws nothing itself and is never shown.
 *
 * **Every property is reflected**, because the parent watches its stops'
 * attributes to lay the ribbon out again: a change made from script reaches the
 * page as a change made in markup does. None has a default, so a stop writes
 * nothing it was not given.
 *
 * @since 0.147.0
 * @status experimental
 * @documentation https://fusion.dev/helix/components/strands
 */
@customElement('helix-strands-stop')
export class HelixStrandsStop extends HelixElement {
  static override styles: CSSResultGroup = styles

  /**
   * Where the form sits across the page, as a share of the width: the fan's
   * bend or the ribbon's axis. A wave crosses the whole width and does not
   * read it. Unset, a fan bends at `0.4` and a ribbon runs down the middle.
   */
  @property({ reflect: true, type: Number })
  at?: number

  /** The id of the element the form is pinned to, in the same tree as the stop. */
  @property({ reflect: true })
  for?: string

  /** The form the ribbon takes at the element. When it is not set, the form is `ribbon`. */
  @property({ reflect: true })
  variant?: StrandsVariant

  protected override render(): typeof nothing {
    return nothing
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-strands-stop': HelixStrandsStop
  }
}
