import { customElement, HelixElement, motionPaused, onMotionChange } from '@fusion.dev/helix-core'
import { type CSSResultGroup, html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './shine-root.css.js'

/**
 * @summary Sweeps a band of light across its content, such as a button asking to be pressed.
 *
 * @description
 * Put a button or a card inside, and a band of light crosses it from the
 * inline start to the inline end when a pointer comes over it or focus comes
 * inside it. With `loop`, the band crosses by itself, with a rest between.
 *
 * **Drawn over the content, which keeps its clicks.** The band takes no
 * pointer and is hidden from screen readers. It is clipped to `--shine-radius`,
 * which takes the corners of the content inside.
 *
 * A band that crosses by itself runs for as long as the page is open, so a
 * press on `Motion Toggle` stops it, as `:state(paused)`. Where the reader
 * asked for less movement, no band is drawn at all.
 *
 * A single tier, as `Marquee` is: the band is the whole of the component.
 *
 * @since 0.241.0
 * @status experimental
 * @category content
 * @aliases Shine border, Glint, Sheen, Light sweep
 * @use The main action on a page, such as a sign-up button, crossed by light on hover.
 * @instead border-beam - A card whose work is running, lit around its edge.
 * @instead spotlight - Cards lit under the pointer as it moves over them.
 * @instead shimmer-text - Words that light sweeps across while the work they name runs.
 * @practice Set `loop` on one action on a page at most. - The band then catches the eye for the one action that matters most.
 * @documentation https://fusion.dev/design/components/shine
 *
 * @slot - The content the band crosses.
 *
 * @csspart band - The band of light.
 * @csspart sweep - The layer over the content that the band crosses, clipped to `--shine-radius`. Hidden from screen readers.
 *
 * @cssproperty --shine-color - The color of the band. Defaults to white at 45% in light mode and black at 18% in dark mode, which show on the dark and the light fill of an action in each.
 * @cssproperty --shine-duration - How long the band takes to cross. Defaults to two and a half times `--helix-duration-slow`, 800ms.
 * @cssproperty --shine-radius - The corners the band is clipped to. Defaults to `--helix-radii-sm`, the corners of a `Button`.
 *
 * @cssstate paused - The page's motion is paused, so a band that crosses by itself does not.
 */
@customElement('helix-shine')
export class HelixShine extends HelixElement {
  static override styles: CSSResultGroup = styles

  /**
   * Whether the band crosses by itself, with a rest between. Reflected,
   * because the stylesheet runs the loop on it.
   */
  @property({ reflect: true, type: Boolean })
  loop = false

  /** What stops hearing the page's pause. */
  private stop: (() => void) | undefined

  override connectedCallback(): void {
    super.connectedCallback()
    this.toggleState('paused', motionPaused())
    this.stop = onMotionChange((paused) => this.toggleState('paused', paused))
  }

  override disconnectedCallback(): void {
    this.stop?.()
    this.stop = undefined
    super.disconnectedCallback()
  }

  protected override render(): TemplateResult {
    return html`<slot></slot
      ><span part="sweep" aria-hidden="true"><span part="band"></span></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-shine': HelixShine
  }
}
