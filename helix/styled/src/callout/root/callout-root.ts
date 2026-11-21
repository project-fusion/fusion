import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessCallout } from '@fusion.dev/helix-headless/callout'
import type { CSSResultGroup, PropertyValues } from 'lit'
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
 * hairline, `outlined` an edge with no fill, and `plain` the bar and the mark alone.
 *
 * The inset and the type follow `data-density`, as the controls around a
 * callout do. `--callout-padding` and `--callout-font-size` set either to a
 * value of your own.
 *
 * @since 0.1.0
 * @status stable
 * @category markers
 * @aliases Admonition, Notice, Note, Alert
 * @use A note, a warning, or an error about the content around it.
 * @instead toast - A confirmation that leaves on its own.
 * @instead announcement - A message for the whole site.
 * @anatomy icon
 * @anatomy content
 * @practice {dismissible} Set `open` to show a dismissed callout again, or remove it in your listener. - A dismissed callout hides itself and stays in the page.
 * @practice {density} Size a callout with `data-density="sm"` or `data-density="lg"`, on the callout or a region around it. - A callout follows the density of the controls around it, and has no size property.
 * @documentation https://fusion.dev/design/components/callout
 *
 * @slot - The callout's content.
 * @slot dismiss-icon - Replaces the cross inside the dismiss button.
 * @slot heading - A heading above the content.
 * @slot icon - Replaces the icon chosen by `tone`.
 *
 * @csspart content - The content region.
 * @csspart dismiss - The button that dismisses the callout, shown when `dismissible` is set.
 * @csspart dismiss-mark - The cross on the dismiss button, shown when the `dismiss-icon` slot is empty.
 * @csspart icon - The icon region.
 *
 * @cssproperty --callout-accent-color - The color of the bar, the mark and the tint, in place of the tone's.
 * @cssproperty --callout-background-color - The fill behind the callout.
 * @cssproperty --callout-bar-thickness - The thickness of the bar on the inline start edge.
 * @cssproperty --callout-font-size - The size of the callout's text. Defaults to the control text step, which follows `data-density`.
 * @cssproperty --callout-gap - The space between the mark and the content.
 * @cssproperty --callout-padding - The inset around the content, to which the bar's width is added at the start. Defaults to the control space step, which follows `data-density`.
 * @cssproperty --callout-radius - The corner radius of the callout.
 */
@customElement('helix-callout')
export class HelixCallout extends HelixHeadlessCallout {
  /**
   * Where the callout's box ends, whatever its tone.
   *
   * Absent, or `filled`, is the tint with a hairline, the resting look.
   * `outlined` draws the tone at the edge with no fill, and `plain` keeps only
   * a bar and the mark, for an aside in running prose. The bar says the tone
   * where there is no box to carry it. `--callout-bar-thickness` adds it to the
   * others.
   *
   * Web Awesome calls this `appearance`. It is `separation` here, as on
   * `Announcement` and `Card`, since a box's edge and its meaning are two
   * choices.
   */
  @property({ reflect: true })
  separation?: 'filled' | 'outlined' | 'plain'

  static override styles: CSSResultGroup = styles

  /**
   * **The height to fold from, measured as a dismissal begins**, while the
   * callout still shows, and to unfold to once it shows again, measured
   * after the headless tier takes `hidden` off and before the frame is
   * painted. The stylesheet's keyframes read it, a height of `auto` being one
   * no animation follows.
   */
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed)
    if (this.hasUpdated && changed.has('open') && !this.open) {
      this.measureFold()
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    /* Shown and measured before the headless tier marks it entering, whose
       animation starts it at no height and would be what was measured. */
    if (changed.has('open') && changed.get('open') !== undefined && this.open) {
      this.removeAttribute('hidden')
      this.measureFold()
    }
    super.updated(changed)
  }

  /**
   * The height to fold, and **the gap beside it in a column**, which goes
   * with the callout once it is hidden: folded to nothing with the gap still
   * standing, the next thing jumped the gap's height at the end. The gap
   * after it where something follows, and before it where it is last.
   */
  private measureFold(): void {
    this.style.setProperty('--_callout-block-size', `${this.getBoundingClientRect().height}px`)
    this.style.removeProperty('--_callout-fold-start')
    this.style.removeProperty('--_callout-fold-end')
    const parent = this.parentElement
    if (!parent) {
      return
    }
    const style = getComputedStyle(parent)
    const column =
      style.display.includes('grid') ||
      (style.display.includes('flex') && style.flexDirection.startsWith('column'))
    const gap = Number.parseFloat(style.rowGap)
    if (!column || !(gap > 0)) {
      return
    }
    const shown = (one: Element | null): boolean => one !== null && !one.hasAttribute('hidden')
    if (shown(this.nextElementSibling)) {
      this.style.setProperty('--_callout-fold-end', `${-gap}px`)
    } else if (shown(this.previousElementSibling)) {
      this.style.setProperty('--_callout-fold-start', `${-gap}px`)
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-callout': HelixCallout
  }
}
