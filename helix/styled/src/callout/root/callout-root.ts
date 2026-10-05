import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCallout } from '@fusion.dev/helix-headless/callout'
import type { CSSResultGroup } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './callout-root.css.js'

/**
 * @summary A passage set apart as a note, information, a warning, or an error.
 *
 * @description
 * The background is a tint of the tone's color, mixed with `color-mix`. A
 * `neutral` callout is drawn in the muted ink, for a note that reports no
 * status, so it keeps to the palette whatever the brand.
 * A bar on the inline start edge also marks the tone, so it still shows in
 * grayscale and for people who do not distinguish the hues.
 *
 * `tone` is set on the headless tier and carries the meaning, and this tier
 * draws it. `separation` is where the box ends: absent is the tint with the
 * bar, `outlined` an edge with no fill, and `plain` the bar and the mark alone.
 *
 * @since 0.1.0
 * @status stable
 * @category markers
 * @aliases Admonition, Notice, Note, Alert
 * @documentation https://fusion.dev/helix/components/callout
 *
 * @slot - The callout's content.
 * @slot heading - A heading above the content.
 * @slot icon - Replaces the icon chosen by `tone`.
 *
 * @csspart content - The content region.
 * @csspart icon - The icon region.
 *
 * @cssproperty --callout-accent-color - The color of the bar, the mark and the tint, in place of the tone's.
 * @cssproperty --callout-background-color - The fill behind the callout.
 * @cssproperty --callout-bar-thickness - The thickness of the bar on the inline start edge.
 * @cssproperty --callout-font-size - The size of the callout's text.
 * @cssproperty --callout-gap - The space between the mark and the content.
 * @cssproperty --callout-padding - The inset around the content, to which the bar's width is added at the start.
 * @cssproperty --callout-radius - The corner radius of the callout.
 */
@customElement('helix-callout')
export class HelixCallout extends HelixHeadlessCallout {
  /**
   * Where the callout's box ends, whatever its tone.
   *
   * Absent, or `filled`, is the tint with the bar, the resting look.
   * `outlined` draws the tone at the edge with no fill, and `plain` keeps only
   * the bar and the mark, for an aside in running prose. The bar stays in
   * every one, being what says the tone where the hue is not seen.
   *
   * Web Awesome calls this `appearance`. It is `separation` here, as on
   * `Announcement` and `Card`, since a box's edge and its meaning are two
   * choices.
   */
  @property({ reflect: true })
  separation?: 'filled' | 'outlined' | 'plain'

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-callout': HelixCallout
  }
}
