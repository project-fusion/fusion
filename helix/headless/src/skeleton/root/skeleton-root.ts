import { customElement, HelixElement, hostAria, internalsOf } from '@fusion.dev/helix-core'
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
 * While `loading` is set the content is inert, the host is `aria-busy`, and
 * the styled tier hides the content and paints the placeholder over its box.
 * Take `loading` off and the content is shown as it is. An empty skeleton is a
 * placeholder of its own size, as before.
 *
 * While `loading` is set, a placeholder in the `placeholder` slot shows and the
 * content is hidden. Once it is off the placeholder
 * is hidden and the content shows. The placeholder is hidden from screen
 * readers. A server cannot see the children, so it serves both, and the
 * content is hidden once the page has its children.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Placeholder, Shimmer, Ghost
 * @use The shape of content that is loading, where its layout is known.
 * @instead loader - Work of unknown length with no layout to hold.
 * @instead empty - A region that loaded and holds nothing.
 * @anatomy skeleton
 * @practice {loading} Put the real content inside the skeleton and set `loading`. - The skeleton takes the content's size, so nothing moves when the content arrives.
 * @practice {revealing} Draw your own placeholder in the `placeholder` slot for content that is not there until it loads. - The placeholder shows while `loading` is set, laid out as the content will be, such as a circle and three lines for a profile.
 * @documentation https://fusion.dev/design/components/skeleton
 *
 * @slot - The content the skeleton stands in for, which sizes it. Optional.
 * @slot placeholder - What shows while `loading` is set, in place of the content, such as skeletons laid out as the content will be. Falls back to the skeleton's own shape.
 *
 * @csspart content - The box around the content, inert while `loading`, and hidden while `loading` where the `placeholder` slot is filled.
 * @csspart placeholder - The box around the `placeholder` slot and the shape it falls back to, hidden once the content has loaded.
 * @csspart sheen - The highlight inside the shape, which the styled tier sweeps across it. Empty, and drawn by no rule on this tier.
 * @csspart skeleton - The placeholder shape.
 *
 * @cssstate wrapping - The skeleton holds content, an element or words, and takes that content's size. Line breaks and spaces alone are not content.
 * @cssstate wrapping-block - The content the skeleton holds is a block, which fills its line, so the skeleton fills the line with it.
 */
@customElement('helix-headless-skeleton')
export class HelixHeadlessSkeleton extends HelixElement {
  /**
   * What is loading, read out as the placeholder's name, such as "Loading
   * profile".
   *
   * Absent hides the placeholder from screen readers. Around content, the name
   * is read while `loading` is set, and the loaded content is read as it is.
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
  protected get wraps(): boolean {
    return (
      this.childrenKnown &&
      [...this.childNodes].some(
        (node) => node.nodeType === 1 || (node.textContent ?? '').trim() !== '',
      )
    )
  }

  /**
   * Whether the page drew its own placeholder, in the `placeholder` slot,
   * read off the children where they can be known. Not on a server, which
   * serves the content and the placeholder both until the page has its
   * children.
   */
  protected get placeholdered(): boolean {
    return this.knownChildren.some((child) => child.slot === 'placeholder')
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
    /* A block fills its line, so a skeleton around one fills it too: shrunk to
       fit, a wrapped Input measured 202 pixels against the 260 it takes alone. */
    const first =
      this.knownChildren.find((child) => child.slot !== 'placeholder') ?? this.firstElementChild
    const display = wraps && first && this.isConnected ? getComputedStyle(first).display : ''
    this.toggleState(
      'wrapping-block',
      /^(block|flex|grid|table|list-item|flow-root)$/.test(display),
    )
    internalsOf(this).ariaBusy = this.loading ? 'true' : null
    /* Loaded content is the page's own and is read as it is. The busy
       indicator and its name belong to a placeholder or to content that is
       still loading. */
    if (this.label && (this.loading || !wraps)) {
      hostAria(internalsOf(this), { label: this.label, role: 'progressbar' })
      internalsOf(this).ariaHidden = null
    } else {
      hostAria(internalsOf(this), { label: '', role: '' })
      internalsOf(this).ariaHidden = wraps ? null : 'true'
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
    /* The sheen is an element rather than a sheet's `::after`, so a page
       reaches it as a part, as Web Awesome's skeleton publishes its
       indicator. */
    /* **The shape is the `placeholder` slot's fallback**, so a placeholder
       the page draws replaces it with no detection: the server cannot see
       the children, and the slot decides at assignment time on both sides.
       The placeholder is hidden once the content has loaded, and the content
       is hidden while it loads where the page drew a placeholder, so with no
       stylesheet one of the two shows. */
    const update = (): void => this.requestUpdate()
    return html`<span
        part="content"
        ?hidden=${this.loading && this.placeholdered}
        ?inert=${this.loading}
        ><slot @slotchange=${update}></slot></span
      >${this.renderPlaceholder(update)}`
  }

  /**
   * The `placeholder` slot, with the shape as its fallback, hidden from
   * assistive technology and once the content has loaded.
   *
   * @param update Asks for the update that reads what the page slotted.
   */
  protected renderPlaceholder(update: () => void): TemplateResult {
    return html`<span
      part="placeholder"
      aria-hidden="true"
      ?hidden=${!this.loading && this.wraps}
      ><slot name="placeholder" @slotchange=${update}>${this.renderShape()}</slot></span
    >`
  }

  /**
   * The placeholder shape and the sheen inside it.
   *
   * A method, so a tier above can draw the placeholder as several shapes, as
   * the styled tier draws a paragraph of lines.
   */
  protected renderShape(): TemplateResult {
    return html`<span part="skeleton"><span part="sheen"></span></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-skeleton': HelixHeadlessSkeleton
  }
}
