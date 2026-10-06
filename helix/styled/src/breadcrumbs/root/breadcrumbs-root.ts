import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessBreadcrumbs } from '@fusion.dev/helix-headless/breadcrumbs'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './breadcrumbs-root.css.js'
import '../breadcrumb/breadcrumb.js'

/**
 * @summary Shows the path to the current page.
 *
 * @description
 * The trail is a single line by default and wraps onto a second line when it
 * runs out of room, so every crumb stays visible.
 *
 * @since 0.1.0
 * @status stable
 * @category navigation
 * @aliases Breadcrumb, Crumbs
 * @documentation https://fusion.dev/helix/components/breadcrumbs
 *
 * @slot - The trail's items, in order from root to current page.
 *
 * @csspart expand - The button in the folded crumb that shows the whole trail.
 * @csspart list - The ordered list.
 *
 * @cssproperty --breadcrumbs-font-size - Size of the trail's text.
 * @cssproperty --breadcrumbs-gap - Space between items and separators.
 * @cssproperty --breadcrumbs-split-divider-color - Color of the line between the two halves of a
 *   split crumb, under `separation="outlined"`.
 * @cssproperty --breadcrumbs-split-fill - Fill across both halves of a split crumb while one of
 *   them is under the pointer, under the default `plain` separation.
 */
@customElement('helix-breadcrumbs')
export class HelixBreadcrumbs extends HelixHeadlessBreadcrumbs {
  static override tier = 'helix-'

  /**
   * How the two halves of a split crumb are told apart. A split crumb is one
   * with a control in its `end` slot, such as a switcher's menu trigger.
   *
   * - `plain` is the default. The halves are text at rest, like every other
   *   crumb. While one half is under the pointer, both halves take a light fill
   *   and that half takes the full hover fill.
   * - `outlined` draws a hairline between the halves, at rest and under the
   *   pointer, the way an outlined surface keeps its edge at rest.
   *
   * The other crumbs look the same under either value.
   */
  @property({ reflect: true })
  separation?: 'outlined' | 'plain'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-breadcrumbs': HelixBreadcrumbs
  }
}
