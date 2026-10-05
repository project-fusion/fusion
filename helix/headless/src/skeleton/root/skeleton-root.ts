import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A placeholder shown in place of content that is still loading.
 *
 * @description
 * A skeleton is hidden from screen readers unless it has a `label`. An empty
 * placeholder has nothing to say, and a page of them would be a page of
 * unnamed shapes. Tell a screen reader that a region is loading on the region
 * itself: set `aria-busy="true"` on it while it loads, and put a `Loader` or a
 * status message in it. Set `label` on one skeleton to have it read out by
 * name, such as "Loading profile", when a reader reaches it. The role and the
 * name are set through `ElementInternals`, which writes no attributes.
 *
 * There is no `shape` property. Whether a placeholder is a line, a block, or a
 * circle is presentation, which belongs to the styled tier.
 *
 * **Put the real content inside and set `loading`, and the skeleton takes its
 * size.** While `loading` is set the content is inert, the host is
 * `aria-busy`, and the styled tier hides the content and paints the
 * placeholder over its box, so nothing moves when the content arrives. Take
 * `loading` off and the content is shown as it is. An empty skeleton is a
 * placeholder of its own size, as before.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Placeholder, Shimmer, Ghost
 * @documentation https://fusion.dev/helix/components/skeleton
 *
 * @slot - The content the skeleton stands in for, which sizes it. Optional.
 *
 * @csspart content - The box around the content, inert while `loading`.
 * @csspart skeleton - The placeholder shape.
 *
 * @cssstate wrapping - The skeleton holds content, an element or words, and takes that content's size. Line breaks and spaces alone are not content.
 */
@customElement('helix-headless-skeleton')
export class HelixHeadlessSkeleton extends HelixElement {
  /**
   * What is loading, read out as the placeholder's name, such as "Loading
   * profile".
   *
   * Absent hides the placeholder from screen readers.
   */
  @property()
  label = ''

  /**
   * Whether the content inside is still loading, which keeps it inert and
   * draws the placeholder over it.
   *
   * Absent shows the content. An empty skeleton is a placeholder whatever
   * this says. Reflected, because the styled tier hides the content on it.
   */
  @property({ reflect: true, type: Boolean })
  loading = false

  /**
   * Whether the skeleton holds content, read off its children where they can
   * be known. Not on a server, where an unlabeled skeleton is taken for an
   * empty one until the page has its children.
   */
  private get wraps(): boolean {
    return (
      this.childrenKnown &&
      [...this.childNodes].some(
        (node) => node.nodeType === 1 || (node.textContent ?? '').trim() !== '',
      )
    )
  }

  /* The busy state and a live region were on the placeholder itself, which
     holds nothing and never changes, so a screen reader announced nothing. A
     labeled placeholder is a busy indicator with a name, which is what
     `Loader` is; an unlabeled one is hidden. */
  /* Content a skeleton wraps is the page's own, so it stays in the tree once
     it has loaded; while it loads it is inert, which takes it out, and the
     host says the region is busy. */
  /* **The wrapper is a state, read with the script's own test.** The styled
     sheet told a wrapper from a placeholder with `:empty`, which counts a line
     break as content, so a skeleton written across two lines, as pretty-printed
     markup and most templates write one, took the wrapper's layout around
     nothing and drew a 0 by 0 box while the script still called it empty. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    const wraps = this.wraps
    this.toggleState('wrapping', wraps)
    this.internals.ariaBusy = this.loading ? 'true' : null
    if (this.label) {
      hostAria(this.internals, { label: this.label, role: 'progressbar' })
      this.internals.ariaHidden = null
    } else {
      hostAria(this.internals, { label: '', role: '' })
      this.internals.ariaHidden = wraps ? null : 'true'
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override render(): TemplateResult {
    /* The content before the shape, so a sheet can lay the shape over the
       content's box. Content arriving later asks for the update that says
       whether the skeleton wraps anything. */
    return html`<span part="content" ?inert=${this.loading}
        ><slot @slotchange=${() => this.requestUpdate()}></slot></span
      ><span part="skeleton"></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-skeleton': HelixHeadlessSkeleton
  }
}
