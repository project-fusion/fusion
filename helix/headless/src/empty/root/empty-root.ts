import {
  ArrivalController,
  customElement,
  HelixElement,
  headingIn,
  headingLevel,
  slottedWords,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A message that a region has nothing in it, and the next step to take.
 *
 * @description
 * Shows what would be in a region and the one action that would fill it, so an
 * empty region does not look like one that failed to load.
 *
 * The message is announced, because an empty view often replaces content that
 * was loading, and the announcement tells a screen reader user that the search
 * returned nothing. It is announced from a status region of its own, which is
 * rendered empty and filled a frame after the view appears. Screen readers read
 * a region that arrives with its text already in it inconsistently. For the
 * seven seconds the region holds its copy, the heading and the message are
 * hidden from screen readers, so the words are in the page once.
 *
 * Every region is a bare slot. There is no `empty-state-heading` or
 * `empty-state-actions` element: assign your own heading and actions to the
 * slots.
 *
 * **Or give the heading as words.** `heading` draws them in a `heading` part
 * that is a heading at `heading-level`, 3 where it is not set, so a page
 * rendering from data or on a server gets a heading a reader finds in the
 * outline without writing the element. A heading slotted in replaces it.
 *
 * **Whatever is slotted into `heading` is read as a heading.** An element that
 * is no heading, such as a `<span>` or a `<p>`, is set inside the `heading`
 * part at `heading-level`, so a screen reader still finds it in the outline.
 * A heading element, or an element holding one, keeps its own level. A server
 * cannot see the slotted element, so a served `<span>` becomes a heading once
 * the script runs.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Placeholder, NoResults, Blank
 * @documentation https://fusion.dev/helix/components/empty
 *
 * @slot - The message: why the region is empty, and what to do about it.
 * @slot actions - The action that would put something in the region.
 * @slot heading - The heading, which names what is missing. A heading element, such as an `<h3>`, keeps its level; any other element is read as a heading at `heading-level`. Replaces the one `heading` draws.
 * @slot icon - An icon above the heading.
 *
 * @csspart heading - The heading at `heading-level`: the one `heading` draws while nothing is slotted into `heading`, or the one around a slotted element that is no heading.
 * @csspart live - A copy of the heading and the message, in a live region that screen readers announce when the view appears. Visually hidden in the styled tier.
 */
@customElement('helix-headless-empty')
export class HelixHeadlessEmpty extends HelixElement {
  /**
   * The heading as words, such as "No results", drawn as a heading when
   * nothing is slotted into `heading`.
   *
   * Absent draws none, and the `heading` slot is the only heading.
   */
  @property()
  heading = ''

  /**
   * The level of the heading `heading` draws, from 1 to 6.
   *
   * Absent is 3, the level of a heading inside a page's section. Set it to fit
   * the outline the empty view sits in. A slotted heading keeps its own.
   */
  @property({ attribute: 'heading-level', type: Number })
  headingLevel?: number

  /**
   * Whether the state is announced when it appears.
   *
   * On by default: an empty view almost always replaces something that was
   * loading. Turn it off for one that was on the page from the start, which
   * has nothing to announce because nothing changed.
   */
  @property({ attribute: 'no-announce', reflect: true, type: Boolean })
  noAnnounce = false

  /**
   * Whether the `heading` slot holds elements and none of them is or holds a
   * heading, read from the children before each render.
   */
  private looseHeading = false

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (this.childrenKnown) {
      const slotted = this.knownChildren.filter((child) => child.slot === 'heading')
      this.looseHeading = slotted.length > 0 && headingIn(slotted) === null
    }
  }

  /* A served view rendered no wrapper, having no children to read, and the
     hydrating render matched it; this one reads them. */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  /* Filled a frame after the view appears, when it appears after the page has
     loaded, as `Announcement`'s band is; at once, and silently, when it came
     with the page. A page a framework served without declarative shadow DOM is
     not `serverRendered`, so without the load test every empty state in it
     spoke over the page as it opened. */
  protected readonly arrival = new ArrivalController(this, {
    arriving: () => !this.serverRendered && document.readyState === 'complete',
    text: () =>
      [slottedWords(this, ['heading']) || this.heading.trim(), slottedWords(this, [''])]
        .filter(Boolean)
        .join(' '),
  })

  /**
   * The `heading` slot, with the heading `heading` draws as its fallback, so
   * one slotted in replaces it; no fallback while `heading` holds no words.
   *
   * A method, so a tier above can draw its own, as the slot lets a page.
   *
   * @param hidden Whether the live copy holds the heading's words, which
   * hides them from readers until it empties.
   */
  protected renderHeading(hidden: boolean): TemplateResult {
    const level = headingLevel(this.headingLevel)
    const slot = html`<slot
      aria-hidden=${hidden && !this.looseHeading ? 'true' : nothing}
      name="heading"
      @slotchange=${() => {
        this.arrival.say()
        this.requestUpdate()
      }}
      >${
        this.heading.trim()
          ? html`<div aria-level=${level} part="heading" role="heading">
              ${this.heading}
            </div>`
          : nothing
      }</slot
    >`
    /* **A slotted element that is no heading is set inside one**, the part
       `heading` draws, so the outline has it at `heading-level`. A role cannot
       be written onto the page's own element. */
    return this.looseHeading
      ? html`<div
          aria-hidden=${hidden ? 'true' : nothing}
          aria-level=${level}
          part="heading"
          role="heading"
        >${slot}</div>`
      : slot
  }

  protected override render(): TemplateResult {
    const say = () => this.arrival.say()
    /* **The words are in the tree once.** While the live copy holds them, the
       heading and the message it copies are hidden from readers, so a reader
       moving through the page meets them in one place; when the copy empties,
       they are back. The actions are never hidden. */
    const held = this.arrival.said !== '' && !this.noAnnounce
    return html`<slot name="icon"></slot>
      ${this.renderHeading(held)}
      <slot aria-hidden=${held ? 'true' : nothing} @slotchange=${say}></slot>
      <slot name="actions"></slot>
      ${
        this.noAnnounce
          ? nothing
          : html`<span part="live" role="status">${this.arrival.said}</span>`
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-empty': HelixHeadlessEmpty
  }
}
