import { customElement, HelixElement, reducedMotion } from '@fusion.dev/helix-core'
import { type CSSResultGroup, html, type TemplateResult } from 'lit'
import { styles } from './reveal-root.css.js'

/**
 * @summary Brings its content in as it scrolls into view, rising and fading up.
 *
 * @description
 * Put a section of a page inside, and the section rises a little and fades in
 * the first time it scrolls into view. Once in, it stays.
 *
 * **Content is never hidden that a reader could already see.** What is in view
 * when the page opens shows at once, with no move, so nothing the reader
 * arrives at waits on a script. Before the component's definition loads, on a
 * server, in print, and where the reader asked for less movement, the content
 * shows as it is. Screen readers and find in page reach it throughout.
 *
 * A single tier, as `Marquee` is: the entrance is the whole of the component.
 *
 * @since 0.241.0
 * @status experimental
 * @category content
 * @aliases Reveal on scroll, Scroll reveal, Fade in, Entrance, Animate on scroll
 * @use Sections of a long page that come in as you scroll to them, such as features.
 * @instead skeleton - The shape of content that is still loading.
 * @instead highlighter - Words in a sentence marked as they come into view.
 * @practice Set a `--reveal-delay` on each of several in a row, such as `0ms`, `80ms`, and `160ms`. - They then come in one after another.
 * @documentation https://fusion.dev/design/components/reveal
 *
 * @slot - The content that comes in.
 *
 * @csspart content - The box that rises and fades in, holding the content.
 *
 * @cssproperty --reveal-delay - How long the content waits once in view before it moves, for one of several coming in after another. Defaults to `0ms`.
 * @cssproperty --reveal-distance - How far below its place the content starts. Defaults to `--helix-space-lg`.
 * @cssproperty --reveal-duration - How long the content takes to come in. Defaults to `--helix-duration-slow`.
 *
 * @cssstate waiting - The content is below the view and has not come in yet, so it is drawn faded and lowered.
 */
@customElement('helix-reveal')
export class HelixReveal extends HelixElement {
  static override styles: CSSResultGroup = styles

  /** What watches for the content scrolling into view. */
  private watcher: IntersectionObserver | undefined

  override connectedCallback(): void {
    super.connectedCallback()
    if (typeof IntersectionObserver === 'undefined' || reducedMotion()) {
      return
    }
    let first = true
    this.watcher = new IntersectionObserver(
      (entries) => {
        const seen = entries.some((entry) => entry.isIntersecting)
        /* **In view on arrival, it shows at once**: only content still out of
           view at the first reading waits to come in. */
        if (first) {
          first = false
          if (!seen) {
            this.toggleState('waiting', true)
            return
          }
        }
        if (seen) {
          this.toggleState('waiting', false)
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
    this.toggleState('waiting', false)
    super.disconnectedCallback()
  }

  protected override render(): TemplateResult {
    return html`<div part="content"><slot></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-reveal': HelixReveal
  }
}
