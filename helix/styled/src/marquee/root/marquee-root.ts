import {
  customElement,
  HelixElement,
  motionPaused,
  numberConverter,
  onMotionChange,
} from '@fusion.dev/helix-core'
import { type CSSResultGroup, html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './marquee-root.css.js'

/**
 * @summary A row that scrolls by itself, round and round, such as a band of logos.
 *
 * @description
 * Put the items inside, such as the logos of the teams that use a product, and
 * the row runs from the inline end to the inline start at an even speed,
 * joining its end to its start so it never runs out.
 *
 * **The items are the page's own, and are read once.** The row is drawn twice
 * so the loop has no gap, and the second drawing is hidden from screen readers
 * and taken out of the tab order.
 *
 * **It stops where a reader is.** A pointer over it or focus inside it holds
 * the row, so a reader can read an item or press a link in it. It moves by
 * itself for as long as the page is open, so a press on `Motion Toggle` holds
 * it too, as `:state(paused)`. Where the reader asked for less movement, it
 * does not run at all, and the row scrolls by hand instead.
 *
 * `speed` is how fast it runs, in pixels a second.
 *
 * A single tier, as `Aura` is: the loop is the whole of the component.
 *
 * @since 0.241.0
 * @status experimental
 * @category content
 * @aliases Ticker, Logo band, Scrolling row, Carousel strip
 * @use A band of logos or names that runs by itself, such as the teams on a product.
 * @instead carousel - Slides you move between yourself, one at a time.
 * @instead sliding-number - A number whose digits roll to a new value.
 * @instead rotating-text - One word in a line that turns through others in its place.
 * @practice Give every Marquee on a page the same `speed`. - A longer row then takes longer to go round, and every row reads at one pace.
 * @documentation https://fusion.dev/design/components/marquee
 *
 * @slot - The items the row carries.
 *
 * @csspart copy - The second drawing of the items, which joins the end of the row to its start. Hidden from screen readers and inert.
 * @csspart items - The items, in a row.
 * @csspart track - The two drawings side by side, which is what moves.
 *
 * @cssproperty --marquee-duration - How long one turn takes, worked out from the row's length and `speed`. Written by the component.
 * @cssproperty --marquee-fade - How far the row fades in and out at either edge. Defaults to `--helix-space-2xl`.
 * @cssproperty --marquee-gap - The space between items, and between the end of the row and its start. Defaults to `--helix-space-xl`.
 *
 * @cssstate paused - The page's motion is paused, so the row holds where it is.
 */
@customElement('helix-marquee')
export class HelixMarquee extends HelixElement {
  static override styles: CSSResultGroup = styles

  /**
   * Whether the row runs from the inline start to the inline end instead.
   * Reflected, because the stylesheet turns the loop round on it.
   */
  @property({ reflect: true, type: Boolean })
  reverse = false

  /** How fast the row runs, in pixels a second. */
  @property({ converter: numberConverter('speed', 40) })
  speed = 40

  /** What stops hearing the page's pause, and what stops watching the row's length. */
  private stops: (() => void)[] = []

  override connectedCallback(): void {
    super.connectedCallback()
    this.toggleState('paused', motionPaused())
    this.stops.push(onMotionChange((paused) => this.toggleState('paused', paused)))
  }

  override disconnectedCallback(): void {
    for (const stop of this.stops) {
      stop()
    }
    this.stops = []
    super.disconnectedCallback()
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    const items = this.partNamed('items')
    if (items && typeof ResizeObserver !== 'undefined') {
      const sizes = new ResizeObserver(() => this.time())
      sizes.observe(items)
      this.stops.push(() => sizes.disconnect())
    }
    this.copy()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('speed')) {
      this.time()
    }
  }

  /**
   * Writes how long one turn takes: the row's length and the gap after it, at
   * `speed`. A row with no length yet keeps the last one written.
   */
  private time(): void {
    const items = this.partNamed('items')
    const length = items?.getBoundingClientRect().width ?? 0
    if (length <= 0 || !(this.speed > 0)) {
      return
    }
    const track = this.partNamed('track')
    const gap = track ? Number.parseFloat(getComputedStyle(track).columnGap) || 0 : 0
    this.style.setProperty('--marquee-duration', `${((length + gap) / this.speed).toFixed(2)}s`)
  }

  /**
   * Draws the items a second time, hidden and inert, after the first, so the
   * end of the row joins its start. Drawn again whenever the items change.
   */
  private readonly copy = (): void => {
    const copy = this.partNamed('copy')
    if (!copy) {
      return
    }
    copy.replaceChildren(...[...this.children].map((child) => child.cloneNode(true)))
    this.time()
  }

  protected override render(): TemplateResult {
    return html`<div part="track">
      <div part="items"><slot @slotchange=${this.copy}></slot></div>
      <div part="copy" aria-hidden="true" inert></div>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-marquee': HelixMarquee
  }
}
