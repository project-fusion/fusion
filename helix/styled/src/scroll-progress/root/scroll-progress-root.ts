import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { type CSSResultGroup, html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './scroll-progress-root.css.js'

/**
 * @summary A bar that fills as the page, or a box on it, is scrolled.
 *
 * @description
 * The bar is empty at the top and full at the end, so a reader of a long
 * article sees how far through it they are.
 *
 * **Hidden from screen readers.** Where a reader is in the page is what their
 * reader already says, and a bar that changed on every scroll would be a
 * value that never settles. The bar follows the reader's own scrolling, so it
 * moves under reduced motion as a scrollbar does.
 *
 * The share scrolled is written on the host as `--scroll-progress-value`,
 * from 0 to 1, which the bar scales by, and which a sheet of your own can read
 * too.
 *
 * A single tier, as `Aura` is: the bar is the whole of the component.
 *
 * @since 0.241.0
 * @status experimental
 * @category feedback
 * @aliases Reading progress, Scroll indicator, Progress bar
 * @use How far you have scrolled through an article, or through a box on the page.
 * @instead progress - How far along a task is, such as an upload.
 * @instead outline - Links to the headings on the page, with the section in view marked.
 * @anatomy track
 * @anatomy bar
 * @practice Set `for` to the id of the box that scrolls. - Without it, the bar follows the page.
 * @practice Place the bar yourself, such as at the top of a sticky header. - It fills the width it is given and draws nothing else.
 * @documentation https://fusion.dev/design/components/scroll-progress
 *
 * @csspart bar - The fill, scaled along its length by how far the page or the box is scrolled.
 * @csspart track - The full length the bar fills.
 *
 * @cssproperty --scroll-progress-color - The fill. Defaults to `--helix-color-primary`.
 * @cssproperty --scroll-progress-size - How thick the bar is. Defaults to `--helix-border-thick`.
 * @cssproperty --scroll-progress-track-color - The ground under the fill. Transparent by default.
 * @cssproperty --scroll-progress-value - How far the page or the box is scrolled, from 0 at the start to 1 at the end. Written by the component.
 */
@customElement('helix-scroll-progress')
export class HelixScrollProgress extends HelixElement {
  static override styles: CSSResultGroup = styles

  /**
   * The direction the scrolling runs: `block`, down a page, or `inline`,
   * along a row. Absent is `block`, and writes no attribute, so a served bar
   * and the bar after upgrade carry the same markup.
   */
  @property({ reflect: true })
  axis?: 'block' | 'inline'

  /**
   * The `id` of the box that scrolls, looked up in the bar's own root, so a
   * bar inside a shadow root reads a box in that root.
   *
   * Absent follows the page.
   */
  @property()
  for = ''

  /** The box being followed, and what stops following it. */
  private followed: { box: Element | Window; stop: () => void } | undefined

  /** The frame a reading is waiting for, so a burst of scroll events reads once. */
  private frame = 0

  override connectedCallback(): void {
    super.connectedCallback()
    this.follow()
  }

  override disconnectedCallback(): void {
    this.unfollow()
    super.disconnectedCallback()
  }

  /* After the first render too, for a box that arrived with the same update. */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    if (!this.followed) {
      this.follow()
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (this.isConnected && (changed.has('for') || changed.has('axis'))) {
      this.follow()
    }
  }

  /** The box `for` names, or the page. Nothing on a server. */
  private get box(): Element | Window | undefined {
    if (typeof window === 'undefined') {
      return undefined
    }
    if (this.for === '') {
      return window
    }
    const root = this.getRootNode() as Document | ShadowRoot
    return root.getElementById?.(this.for) ?? undefined
  }

  /**
   * Starts following the box `for` names, from a first reading.
   *
   * **A box after the bar in the page is not there yet** when a served page
   * connects the bar, since the parser has not reached it, so the bar looks
   * again once the document has been read.
   */
  private follow(): void {
    this.unfollow()
    const box = this.box
    if (!box) {
      if (typeof document !== 'undefined' && document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.isConnected && this.follow(), {
          once: true,
        })
      }
      return
    }
    const listener = (): void => this.schedule()
    box.addEventListener('scroll', listener, { passive: true })
    const resizes = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(listener)
    resizes?.observe(box instanceof Window ? document.documentElement : box)
    this.followed = {
      box,
      stop: () => {
        box.removeEventListener('scroll', listener)
        resizes?.disconnect()
      },
    }
    this.read()
  }

  private unfollow(): void {
    this.followed?.stop()
    this.followed = undefined
    if (this.frame) {
      cancelAnimationFrame(this.frame)
      this.frame = 0
    }
  }

  /** Reads on the next frame, once however many scroll events arrive before it. */
  private schedule(): void {
    if (this.frame) {
      return
    }
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.read()
    })
  }

  /**
   * Writes the share scrolled. **A box with nothing to scroll is full**, as a
   * page that fits on one screen has been read to its end.
   */
  private read(): void {
    const box = this.followed?.box
    if (!box) {
      return
    }
    const scroller = box instanceof Window ? document.scrollingElement : box
    if (!scroller) {
      return
    }
    const inline = this.axis === 'inline'
    const room = inline
      ? scroller.scrollWidth - scroller.clientWidth
      : scroller.scrollHeight - scroller.clientHeight
    const at = Math.abs((inline ? scroller.scrollLeft : scroller.scrollTop) || 0)
    const share = !(room > 0) ? 1 : Math.min(1, Math.max(0, at / room))
    this.style.setProperty('--scroll-progress-value', String(Number(share.toFixed(4))))
  }

  protected override render(): TemplateResult {
    return html`<span part="track" aria-hidden="true"><span part="bar"></span></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-scroll-progress': HelixScrollProgress
  }
}
