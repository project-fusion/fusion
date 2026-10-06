import { customElement, HelixElement, markRegion, reportRuntime } from '@fusion.dev/helix-core'
import {
  type CSSResultGroup,
  css,
  html,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from 'lit'
import { property } from 'lit/decorators.js'
import { typedMarks } from '../../quote/marks.js'

/**
 * @summary A passage set off from the prose around it.
 *
 * @description
 * Renders a figure holding the `<blockquote>` and a caption for the
 * attribution, the structure the HTML spec describes. The attribution sits
 * outside the quotation because it is about the quotation, and it names the
 * figure, so a screen reader reads the source as the figure's caption.
 *
 * **The figure is a `<div role="figure">`**, so the headless tier draws no
 * space around the quotation. A `<figure>` takes a 40px indent and a line of
 * space above and below from the browser's own sheet, which every page had to
 * reset. The `<blockquote>` keeps its own margins, as a bare one does. A
 * screen reader meets the same figure, named by its caption.
 *
 * **A figure only while there is an attribution.** With nothing in the caption
 * the figure has no name and nothing to say, so the role and its name are
 * dropped and a reader meets the quotation alone. A server cannot see what is
 * slotted, so it serves the figure, and the client drops it after hydration;
 * an `attribution` written as words is served exactly.
 *
 * **Quotation marks follow the language**, under `marks`. The opening mark is
 * the one the browser sets for a `<q>` in the element's language, „ under
 * `lang="de"` and « under `lang="fr"`, and a `Quote` inside the passage takes
 * the inner marks. The mark is drawn, not read: a screen reader hears the
 * passage. A passage under `marks` that starts with a mark typed into the text
 * would show two, and warns once, with the runtime kind `typed-marks`.
 *
 * **`cite` is the source's URL**, which the browser keeps and does not show.
 * Words in it, such as the author's name, warn once, with the runtime kind
 * `cite-not-url`.
 *
 * For a quotation inside a sentence, use `Quote`.
 *
 * @since 0.1.0
 * @status stable
 * @category typography
 * @aliases Pullquote, Citation, Excerpt
 * @documentation https://fusion.dev/helix/components/blockquote
 *
 * @slot - The quoted passage.
 * @slot attribution - Who said it, and where. Replaces the words of `attribution`.
 *
 * @csspart attribution - The caption carrying the source.
 * @csspart blockquote - The quotation.
 * @csspart figure - The figure holding the quotation and its attribution, a `<div>` with `role="figure"` while the attribution has words.
 */
@customElement('helix-headless-blockquote')
export class HelixHeadlessBlockquote extends HelixElement {
  /* The mark is content, as a `<q>`'s is, so it is drawn in this tier too.
     `open-quote` takes the mark for the element's language from the browser,
     and the empty alternative keeps it out of what a reader hears. Closed at
     the end without a mark, so the quotation depth after the passage is what
     it was before it. */
  static override styles: CSSResultGroup = css`
    :host([marks]) [part='blockquote']::before {
      content: open-quote / '';
    }

    :host([marks]) [part='blockquote']::after {
      content: no-close-quote;
    }
  `

  /**
   * Who said it, and where, as words, such as "Maria Lopez, operations
   * manager". The `attribution` slot replaces them, for markup such as a link.
   *
   * Words are served with the figure they name, where a server cannot see a
   * slotted attribution.
   */
  @property()
  attribution = ''

  /**
   * The URL of the source the passage came from. Who said it goes in
   * `attribution`: a `cite` with words in it warns once, with the runtime kind
   * `cite-not-url`.
   */
  @property()
  cite = ''

  /**
   * Whether to draw an opening quotation mark before the passage, in the
   * element's language. Leave the marks out of the text.
   */
  @property({ reflect: true, type: Boolean })
  marks = false

  /** Whether this blockquote has said its passage starts with a typed mark, so it says so once. */
  private warned = false

  /** Whether this blockquote has said its `cite` holds words, so it says so once. */
  private citeWarned = false

  /**
   * Says on the caption whether there is an attribution in it.
   *
   * A `<figcaption>` with nothing in it is still a block in the quote's flow and
   * still takes the container's gap, so every blockquote written without an
   * attribution reserved a full space below itself. There is no selector that
   * can ask, `slot:empty` being about a slot's fallback rather than its
   * assigned nodes, so the component asks and says so on the caption inside this
   * shadow root: an attribute on the host is a change to markup the consumer
   * rendered, which React reports on hydration.
   */
  private markEmpty(): void {
    /* `hidden` beside the mirror, because `data-empty` is the hook a sheet
       selects on and this tier ships none: an empty region left in the box tree
       is a gap a consumer cannot close without knowing to look for it. Both
       stay, since `[hidden]` is a UA rule and a sheet setting `display` on this
       part outranks it. */
    markRegion(this.renderRoot, 'attribution', ['attribution'], {
      occupied: 'slot[name="attribution"] > *',
    })
    /* **A figure only while the caption has words.** Written here rather than
       bound, since only the client can see what is slotted: a server serves
       the figure, and the first look after hydration takes it away where the
       caption is empty. */
    const named = !this.partNamed('attribution')?.hasAttribute('data-empty')
    const figure = this.partNamed('figure')
    if (named) {
      figure?.setAttribute('role', 'figure')
      figure?.setAttribute('aria-labelledby', 'attribution')
    } else {
      figure?.removeAttribute('role')
      figure?.removeAttribute('aria-labelledby')
    }
  }

  /**
   * Reads the passage for a mark typed at its start, which `marks` would
   * double. Only the start: the mark drawn is an opening one.
   */
  private readonly readPassage = (): void => {
    if (!this.marks || this.warned) {
      return
    }
    const text = [...this.childNodes]
      .filter((node) => !(node instanceof Element) || !node.slot)
      .map((node) => node.textContent ?? '')
      .join('')
      .trim()
    if (!typedMarks(text.charAt(0))) {
      return
    }
    this.warned = true
    reportRuntime({
      kind: 'typed-marks',
      message: `<${this.localName} marks> starts with a typed quotation mark, and the element draws its own, so the mark shows twice. Take the typed mark out.`,
      tag: this.localName,
    })
  }

  /**
   * Reads `cite` for words where the source's URL belongs, the common mistake
   * of naming the author there. A URL holds no spaces, so words with a space
   * between them are enough to tell.
   */
  private readCite(): void {
    if (this.citeWarned || !/\S\s+\S/.test(this.cite || '')) {
      return
    }
    this.citeWarned = true
    reportRuntime({
      kind: 'cite-not-url',
      message: `<${this.localName} cite="${this.cite}"> holds words, and \`cite\` takes the URL of the source. Put who said it in \`attribution\`.`,
      tag: this.localName,
    })
  }

  /* On the shadow root rather than in the template, so the served markup is
     the `<blockquote>` and its slot and nothing else. */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.renderRoot.addEventListener('slotchange', this.readPassage)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.markEmpty()
    if (changed.has('marks')) {
      this.readPassage()
    }
    if (changed.has('cite')) {
      this.readCite()
    }
  }

  protected override render(): TemplateResult {
    /* The attribution is a bare slot inside the caption: the caption is the
       name and cannot be omitted, while an unfilled slot inside it is
       `display: contents` and generates no box. Beside the `<blockquote>`,
       because the HTML spec puts attribution outside it: inside, it was read as
       part of the quotation. Re-marked on `slotchange`, so an attribution that
       arrives after the first render is shown.

       **The figure names itself from the caption by id.** HTML-AAM names a
       figure from its figcaption, and Chromium does not read the caption's
       words through the slot, so the figure came out unnamed. The reference
       is inside one shadow root and resolves; the caption holds the slot, so
       the words are the consumer's, and an empty caption names nothing. */
    /* **A role on a `<div>`, where a `<figure>` drew the browser's margins.**
       The tree is the same, a figure named by its caption, and the caption is a
       `<div>` too, since a `<figcaption>` belongs only in a `<figure>`. */
    return html`<div aria-labelledby="attribution" part="figure" role="figure">
      <blockquote part="blockquote" cite=${this.cite || nothing}><slot></slot></blockquote>
      ${this.renderAttribution()}
    </div>`
  }

  /**
   * The caption, with the words of `attribution` as its slot's fallback,
   * behind a seam a tier can move. The words are in an element, so the region
   * counts them as its own.
   */
  protected renderAttribution(): TemplateResult {
    return html`<div id="attribution" part="attribution"
      ><slot name="attribution" @slotchange=${() => this.markEmpty()}
        >${this.attribution ? html`<span>${this.attribution}</span>` : nothing}</slot
      ></div
    >`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-blockquote': HelixHeadlessBlockquote
  }
}
