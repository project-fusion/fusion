import { customElement, fillTemplate, HelixElement } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A count or a dot pinned to the corner of another element.
 *
 * @description
 * Badge wraps the element it decorates and pins an indicator to its corner, so
 * the wrapped element keeps its place in the layout.
 *
 * What the indicator shows depends on `value`:
 *
 * - A `value` of zero shows no indicator.
 * - No `value` shows a dot.
 * - Any other value shows the value. Above `max`, the indicator shows `{max}+`,
 *   so its width stays the same as the count grows.
 *
 * A count is announced from its own text, and `label` replaces that with a
 * fuller name, such as `4 unread`. A dot needs a `label`. Without one, the dot
 * is a colored circle that screen readers do not announce.
 *
 * **A badge wrapped around a control describes it.** The control is the first
 * element in the badge that takes focus, and its description is the badge's
 * words, so focusing `<helix-badge value="8" label="{count} unread"><button>Inbox
 * </button></helix-badge>` announces "Inbox, button, 8 unread", current as the
 * count changes. A control that already has a description keeps its own. The
 * count is also a status of its own, read when it changes.
 *
 * **Put the badge inside the control to have its count read with the
 * control's name**, as Web Awesome and Shoelace do: `<button>Inbox
 * <helix-badge value="8" label="8 unread"></helix-badge></button>` is the
 * button "Inbox 8 unread", and stays current as the count changes. The styled
 * tier's `placement="inline"` draws the mark in the line for that case.
 *
 * @since 0.1.0
 * @status stable
 * @category markers
 * @aliases Count, Indicator, Pip
 * @documentation https://fusion.dev/helix/components/badge
 *
 * @slot - The element being decorated.
 *
 * @csspart indicator - The count, or the dot when there is no value.
 *
 * @cssstate blank - The value is zero, so there is no mark.
 * @cssstate capped - The count is past `max`, so the mark shows `{max}+`.
 * @cssstate dot - There is no value, so the mark is a dot.
 */
@customElement('helix-headless-badge')
export class HelixHeadlessBadge extends HelixElement {
  /**
   * The badge's name, read by screen readers.
   *
   * Required for a dot, which has no text to read. `{count}` is replaced with
   * what the badge shows, so `label="{count} unread"` reads "8 unread" and
   * stays current as `value` changes, with no label of yours to keep in step.
   */
  @property()
  label = ''

  /**
   * The largest number the badge shows.
   *
   * Past it the indicator reads `{max}+`.
   */
  @property({ type: Number })
  max?: number

  /**
   * The count or short text to show.
   *
   * Absent shows a dot, zero shows nothing.
   *
   * **A string, and a number is taken anyway.** What this shows is usually a
   * count, so `value={unread}` is the first thing a React consumer writes, and
   * a property assignment does not go through the attribute converter that
   * would have made it a string. Read raw it went straight into
   * `this.value.trim()`, which threw inside `render` and left the mark showing
   * whatever it had last: measured, a badge set to the number 2 stayed an 8px
   * dot with no digit in it, and the console carried
   * `TypeError: this.value.trim is not a function`. A component whose whole job
   * is showing a count must not lose the count for being handed one.
   */
  @property()
  value: number | string = ''

  /** The value as text, whatever it was set to. */
  private get given(): string {
    return String(this.value ?? '')
  }

  /** Whether the value counts nothing, in which case there is no mark. */
  private get blank(): boolean {
    return this.given.trim() !== '' && Number(this.given) === 0
  }

  /** Whether the count is past `max`, which the mark shows as `{max}+`. */
  private get capped(): boolean {
    const count = Number(this.given)
    return this.max !== undefined && Number.isFinite(count) && count > this.max
  }

  /** What the indicator reads, once the cap has been applied. */
  private get text(): string {
    return this.capped ? `${this.max}+` : this.given
  }

  /** What a reader hears for the mark, or nothing for a blank or unnamed one. */
  private get words(): string {
    const text = this.text
    if (this.blank || (text === '' && this.label === '')) {
      return ''
    }
    return fillTemplate(this.label, { count: text }) || text
  }

  /** The control the badge describes, while it describes one. */
  private described: HTMLElement | undefined

  /**
   * The first element the badge wraps that takes focus: one with a tab stop,
   * or a component that hands its focus on.
   */
  private wrapped(): HTMLElement | undefined {
    return this.renderRoot
      .querySelector<HTMLSlotElement>('slot:not([name])')
      ?.assignedElements({ flatten: true })
      .find(
        (element): element is HTMLElement =>
          element instanceof HTMLElement &&
          (element.tabIndex >= 0 || element.shadowRoot?.delegatesFocus === true),
      )
  }

  /**
   * Points the wrapped control's description at the badge, which carries its
   * words as its own label, or takes the pointer back.
   *
   * **The badge itself and not the count**, because a reference from the
   * control into the badge's shadow root is one the platform drops, and the
   * badge is in the control's own tree. A control the page described is left
   * alone.
   */
  private describe(): void {
    const words = this.words
    const control = words === '' ? undefined : this.wrapped()
    if (this.described && this.described !== control) {
      this.undescribe()
    }
    if (!control || !('ariaDescribedByElements' in control)) {
      return
    }
    const own = control.getAttribute('aria-describedby') || control.ariaDescribedByElements?.length
    if (control !== this.described && own) {
      return
    }
    this.internals.ariaLabel = words
    control.ariaDescribedByElements = [this]
    this.described = control
  }

  private undescribe(): void {
    if (this.described?.ariaDescribedByElements?.includes(this)) {
      this.described.ariaDescribedByElements = null
    }
    this.described = undefined
    this.internals.ariaLabel = null
  }

  private readonly handleSlotchange = (): void => {
    this.describe()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.undescribe()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    if (this.hasUpdated) {
      this.describe()
    }
  }

  /* What the mark shows, as states a page styles without reading the value:
     `willUpdate`, which a server calls too. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('capped', this.capped)
    this.toggleState('dot', this.given.trim() === '')
    this.toggleState('blank', this.blank)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.describe()
  }

  protected override render(): TemplateResult {
    const blank = this.blank
    const text = this.text
    /* A mark with text is content and is announced; a dot is decoration and is
       not.
     *
     * It must not ask for a `label` as well, or a badge showing a count and no
     * label is `aria-hidden` and the number it exists to show reaches nobody
     * using a screen reader. The number is its own name where none is given,
     * which is why `aria-label` is conditional on the label rather than on this:
     * a `4` announces as "4" from the text, and `label="4 unread"` says the
     * better thing.
     *
     * A dot with no label still says nothing, which is the deliberate half: a
     * dot means "something here" and cannot say what, so naming it is the
     * consumer's to do and silence is better than "badge".
     *
     * **The count names the region even with no label**, the text it already
     * shows. Chromium leaves a status region's own text out of an ancestor's
     * name and reads its `aria-label`, so this is what puts "Alerts 3" on a
     * button holding the badge, measured. */
    const announced = !blank && (text !== '' || this.label !== '')

    // The indicator holds the text and nothing else, so an absent value leaves
    // it empty and `[part="indicator"]:empty` is what draws the dot. Lit's
    // marker comments do not affect `:empty`, but a whitespace text node does,
    // which is why the tags close the way they do.
    //
    // **A status from the start, whatever it shows.** It gained the role only
    // once there was something to say, so the first count arrived in a region
    // appearing with it and a screen reader could miss it. A blank mark keeps
    // its text to fade out with, hidden, so clearing a count says nothing, and
    // a dot with no label is an empty region, which says nothing either.
    //
    // It stays mounted when there is nothing to show, so the styled tier can
    // transition it out rather than having it vanish between frames. Both
    // markers are on the shadow content, not the host, so they cost no
    // attribute a consumer's server markup would have to match.
    //
    // `single` is what lets a one-character mark be a circle. Whether the text
    // fits inside the square is a fact about the string, and CSS cannot count
    // characters.
    return html`<slot @slotchange=${this.handleSlotchange}></slot>
      <span
        part="indicator"
        data-blank=${blank ? '' : nothing}
        data-single=${text.length <= 1 ? '' : nothing}
        role="status"
        aria-label=${announced ? fillTemplate(this.label, { count: text }) || text : nothing}
        >${blank ? html`<span aria-hidden="true">${text}</span>` : text}</span
      >`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-badge': HelixHeadlessBadge
  }
}
