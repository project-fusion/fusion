import { customElement, HelixElement, motionPaused, onMotionChange } from '@fusion.dev/helix-core'
import { type CSSResultGroup, html, type TemplateResult } from 'lit'
import { styles } from './shimmer-text-root.css.js'

/**
 * @summary Words that a light sweeps across while the work they name is running.
 *
 * @description
 * Put the words inside, such as "Reading the files", and a band of light
 * crosses them again and again, which reads as work going on.
 *
 * **The words are the page's own**, so a screen reader reads them as they
 * are, and the sweep is paint over them.
 *
 * **The sweep stops for a reader who asked for less movement**, and the words
 * are drawn in the full ink. It runs for as long as the work does, so it is
 * motion that starts by itself and outlasts five seconds: a press on `Motion
 * Toggle` holds it, as `:state(paused)`, and a second press lets it run again.
 *
 * A single tier, as `Aura` is: the sweep is the whole of the component, and
 * there is no structure to publish without it.
 *
 * @since 0.241.0
 * @status experimental
 * @category feedback
 * @aliases Shimmering text, Thinking text, Working indicator
 * @use Words that name work while it runs, such as "Reading the project files".
 * @instead skeleton - The shape of content that is loading.
 * @instead loader - Work of unknown length with no words to name it.
 * @instead orb - What an agent is doing, shown as a shape.
 * @practice Take the element away, or put the result in its place, once the work is done. - The sweep runs for as long as the element is on the page.
 * @practice Put the element in a live region, such as a `Chat` turn's status or an element with `role="status"`, to have a change of words read out. - The element says nothing by itself.
 * @documentation https://fusion.dev/design/components/shimmer-text
 *
 * @slot - The words the sweep crosses.
 *
 * @csspart text - The box around the words, which paints the sweep through them.
 *
 * @cssproperty --shimmer-text-color - The ink of the words, between sweeps. Defaults to `--helix-color-foreground-muted`.
 * @cssproperty --shimmer-text-duration - How long one sweep takes to cross the words. Defaults to twice `--helix-duration-turn`.
 * @cssproperty --shimmer-text-highlight-color - The ink at the middle of the sweep. Defaults to `--helix-color-foreground`.
 *
 * @cssstate paused - The page's motion is paused, so the sweep holds where it is.
 */
@customElement('helix-shimmer-text')
export class HelixShimmerText extends HelixElement {
  static override styles: CSSResultGroup = styles

  /** What stops hearing the page's pause, while connected. */
  private stopHearing: (() => void) | undefined

  override connectedCallback(): void {
    super.connectedCallback()
    this.toggleState('paused', motionPaused())
    this.stopHearing ??= onMotionChange((paused) => this.toggleState('paused', paused))
  }

  override disconnectedCallback(): void {
    this.stopHearing?.()
    this.stopHearing = undefined
    super.disconnectedCallback()
  }

  protected override render(): TemplateResult {
    return html`<span part="text"><slot></slot></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-shimmer-text': HelixShimmerText
  }
}
