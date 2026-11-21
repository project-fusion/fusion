import { customElement, HelixElement, reducedMotion } from '@fusion.dev/helix-core'
import { type CSSResultGroup, html, type TemplateResult } from 'lit'
import { styles } from './highlighter-root.css.js'

/**
 * @summary Words in a sentence marked as with a highlighter pen, drawn on as they come into view.
 *
 * @description
 * Put the words inside, in a line of text, and the first time they come into
 * view a band of color sweeps behind them from the inline start, as a pen
 * drawn along the line. Words across two lines are drawn on each line at once.
 *
 * **Marked as `<mark>` is**, text highlighted for its relevance, so the words
 * keep their place in the sentence and a screen reader reads them in it. The
 * words are never hidden: only the band waits. Where the reader asked for less
 * movement, the band is there from the start, and it prints.
 *
 * A single tier, as `Marquee` is: the stroke is the whole of the component.
 *
 * @since 0.241.0
 * @status experimental
 * @category content
 * @aliases Highlight text, Marker, Mark, Highlight
 * @use The words that carry a sentence's claim, such as a line on a landing page.
 * @instead find - Words you search for in content, with each match marked.
 * @instead reveal - A section that comes in as you scroll to it.
 * @documentation https://fusion.dev/design/components/highlighter
 *
 * @slot - The words marked.
 *
 * @csspart mark - The `<mark>` the band is drawn behind.
 *
 * @cssproperty --highlighter-color - The band's color. Defaults to `--helix-color-warning` at 35%, a highlighter's yellow over the page in either mode.
 * @cssproperty --highlighter-duration - How long the stroke takes. Defaults to two and a half times `--helix-duration-slow`, 800ms.
 *
 * @cssstate drawn - The words have come into view, so the band is drawn behind them.
 */
@customElement('helix-highlighter')
export class HelixHighlighter extends HelixElement {
  static override styles: CSSResultGroup = styles

  /** What watches for the words coming into view. */
  private watcher: IntersectionObserver | undefined

  override connectedCallback(): void {
    super.connectedCallback()
    if (typeof IntersectionObserver === 'undefined' || reducedMotion()) {
      this.toggleState('drawn', true)
      return
    }
    this.watcher = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.toggleState('drawn', true)
          this.watcher?.disconnect()
          this.watcher = undefined
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    this.watcher.observe(this)
  }

  override disconnectedCallback(): void {
    this.watcher?.disconnect()
    this.watcher = undefined
    super.disconnectedCallback()
  }

  protected override render(): TemplateResult {
    return html`<mark part="mark"><slot></slot></mark>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-highlighter': HelixHighlighter
  }
}
