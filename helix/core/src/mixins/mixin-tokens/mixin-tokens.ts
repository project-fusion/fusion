import { caretUp } from '@fusion.dev/helix-icons'
import { html, nothing, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { HelixElement } from '../../helix-element/helix-element.js'
import { drawIcon } from '../../utils/draw-icon/draw-icon.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/**
 * The public surface `MixinTokens` adds.
 *
 * Declared separately for the reason `MixinFieldInterface` gives: TypeScript
 * cannot emit declarations for an anonymous class holding private members.
 */
export declare class MixinTokensInterface {
  /**
   * How many tokens to show before the rest become a count.
   *
   * `0` is all of them, and is the default: a cap that guesses is worse than no
   * cap, because the number that fits depends on the width of the field and the
   * length of what is in it, neither of which this element knows. What a cap is
   * genuinely for is a field in a row or a table cell, where a set of twelve
   * choices would push everything below it down a line at a time.
   *
   * The remainder is counted rather than hidden. `+3` is a fact a reader can act
   * on, where a row that silently stops is a field that appears to have lost
   * what was put in it. Date Input and Time Input carry the same property and
   * the same reasoning without taking this mixin, which is why the name is
   * theirs rather than a fourth word for one idea.
   */
  maxTags: number

  /**
   * Whether the count is a button that shows the hidden tokens.
   *
   * **Off by default, and that is about focus rather than caution.** The count
   * becomes a real button when this is set, which is a new stop in the tab
   * order inside the field. Combobox's whole arrangement is that focus stays in
   * the text while the arrows work the list, so a button appearing between the
   * tags and the caret is a change to its keyboard model and not a detail. A
   * host that wants it asks.
   *
   * Left off, the count stays the `<span>` it has always been: no tab stop, no
   * behavior, and nothing a consumer is holding changes.
   */
  expandable: boolean

  /**
   * The count button's label, read by screen readers. Its visible text, such
   * as `+3`, does not say what it does.
   */
  expandLabel: string

  /**
   * The button's label, read by screen readers, once every token is showing.
   *
   * **The name and not the words on it**, which are a caret: expanded there is
   * no longer a number to show, and a phrase in its place would translate badly
   * and change the control's width as it was pressed. The mark is the same size
   * either way and this is what says what pressing it does.
   */
  collapseLabel: string

  /**
   * The cap in force right now, which is none while the reader has expanded it.
   *
   * Hosts that slice their own tokens read this rather than `maxTags`, or
   * expanding would hide the very tokens it was asked to show.
   */
  protected readonly shownLimit: number

  /**
   * The row, given what goes in it and how many did not fit.
   *
   * The host supplies the content because the two hosts get their tokens from
   * different places, and neither can use the other's route.
   */
  protected renderTokenRow(content: unknown, over: number): TemplateResult | typeof nothing

  /**
   * Hides what is over the limit, for a host whose tokens are slotted.
   *
   * `hidden` rather than removal, because these are the consumer's own nodes
   * and this mixin is not entitled to take them out of their document. Returns
   * how many were hidden, which is what the row's count renders.
   */
  protected hideOverflow(slot: HTMLSlotElement | null | undefined): number

  /**
   * Backspace on an empty control, answered.
   *
   * **`typed` is passed rather than read off the control, and that is not
   * tidiness.** Combobox writes completions into its own control behind Lit's
   * back, so `control.value` holds a suggestion while nothing has been typed:
   * reading the control there would refuse a Backspace the reader is entitled
   * to. The host knows which of the two it means.
   *
   * Returns whether it took the key, so a host carries on to its own handling
   * when it did not.
   */
  protected tokenKeydown(event: KeyboardEvent, typed: string): boolean

  /**
   * What the host does when the last token is asked to go.
   *
   * The policy is shared and the mechanism is not: a combobox drops a value out
   * of its selection, and a filter field takes a token out of its own list.
   */
  protected removeLastToken(): void
}

/**
 * A row of tokens inside a field, and the behavior that goes with it.
 *
 * **This owns the row and knows nothing about what a token is.** Not where they
 * came from, not whether they were chosen from a list or invented, not what
 * removing one means. Combobox's tokens are a view of its selection and carry a
 * `data-value` it reads back; a filter field's are whatever a reader typed.
 * Both get the same row, the same overflow count and the same Backspace.
 *
 * **What it does not own is where the tokens come from, and that is not a gap.**
 * Combobox renders its tags into its own shadow root from the options it was
 * given; a filter field takes them as slotted children of the host. A slot
 * cannot assign a shadow root's own children, so one route cannot serve both,
 * and pretending otherwise would put a mode inside the mixin to hide a
 * difference that is real. The host passes what it has and this draws the row
 * around it.
 *
 * **The control stays in the host's shadow root**, which is why this is a mixin
 * and not an element to nest. Combobox reaches `[part="control"]` four times,
 * for focus twice, for the floating anchor's width, and to set the selection
 * range across a completion. A shadow root does not pierce a child's, so a
 * nested field holding that control would answer `null` to all four.
 */
export const MixinTokens = <T extends Constructor<HelixElement>>(Base: T) => {
  class TokensElement extends Base {
    /**
     * The button's label, read by screen readers, once every token is showing.
     */
    @property({ attribute: 'collapse-label' })
    collapseLabel = 'Show fewer'

    /**
     * Whether the count is a button that shows the hidden tokens.
     */
    @property({ type: Boolean })
    expandable = false

    /**
     * The count button's label, read by screen readers. Its visible text, such
     * as `+3`, does not say what it does.
     */
    @property({ attribute: 'expand-label' })
    expandLabel = 'Show all'

    /**
     * How many tokens to show before the rest become a count.
     */
    @property({ attribute: 'max-tags', type: Number })
    maxTags = 0

    /**
     * Whether the reader has asked for all of them.
     *
     * State and private, the way `Input`'s `revealed` is: it is a reader's
     * momentary choice about what is on their own screen, it must not survive
     * anything, and a consumer who wants the field opened is asking for
     * `max-tags="0"` rather than for a second way to say it.
     */
    @state()
    private expanded = false

    protected get shownLimit(): number {
      return this.expanded ? 0 : this.maxTags
    }

    /** Turns the cap off and on, which is all expanding is. */
    private readonly toggleExpanded = (): void => {
      this.expanded = !this.expanded
    }

    protected renderTokenRow(content: unknown, over: number): TemplateResult | typeof nothing {
      /* `tags` and `rest`, which is what Combobox already published and what a
         consumer already styles through `::part`. A row that renamed them to
         match this mixin's own word would break every one of those for nothing:
         the vocabulary is the components', not this file's. */
      return html`<span part="tags">${content}${this.renderRest(over)}</span>`
    }

    /**
     * The count, as a control where the host asked for one and a word otherwise.
     *
     * **`part="rest"` either way**, so a consumer's `::part(rest)` keeps working
     * across the change. The element under it is different, which is the point:
     * a `<span>` that looks like an affordance and answers nothing is the fault
     * this exists to fix, and the way to fix it is a real button rather than a
     * click handler on text.
     *
     * **Expanded, it renders on no count.** `shownLimit` is zero while expanded,
     * so `over` is zero too, and gating the control on the number would take
     * away the only way back.
     */
    private renderRest(over: number): TemplateResult | typeof nothing {
      if (!this.expandable) {
        return over > 0 ? html`<span part="rest">${`+${over}`}</span>` : nothing
      }
      if (over < 1 && !this.expanded) {
        return nothing
      }
      /* **A mark rather than words on the way back, and the words become its
         name.** `+3` is a number in every language and needs no translating;
         "Show fewer" is a sentence, and a control that is a count going one way
         and a phrase coming back also changes width as it is pressed, which
         moves the row of tokens beside it. A caret is the same size either way.

         `collapseLabel` did not go: it is the accessible name now, so what a
         screen reader hears is still a phrase and still the consumer's to
         translate. Both states carry a name for the same reason: `+3` says a
         number and not what pressing it does.

         **No `aria-expanded` beside a name that changes.** The name already
         says what pressing it does, the way the play control does, and a state
         on top of it was the same fact said twice and heard as "Show fewer,
         expanded". */
      return html`<button
        part="rest"
        type="button"
        aria-label=${this.expanded ? this.collapseLabel : this.expandLabel}
        @click=${this.toggleExpanded}
        >${this.expanded ? drawIcon(caretUp) : `+${over}`}</button
      >`
    }

    protected hideOverflow(slot: HTMLSlotElement | null | undefined): number {
      if (!slot) {
        return 0
      }
      const tokens = slot.assignedElements({ flatten: true })
      /* The limit in force, not the property: expanded, the cap is off and every
         token has to come back. */
      const limit = this.shownLimit
      for (const [at, token] of tokens.entries()) {
        token.toggleAttribute('hidden', limit > 0 && at >= limit)
      }
      return limit > 0 ? Math.max(0, tokens.length - limit) : 0
    }

    protected tokenKeydown(event: KeyboardEvent, typed: string): boolean {
      if (event.key !== 'Backspace' || typed !== '') {
        return false
      }
      event.preventDefault()
      this.removeLastToken()
      return true
    }

    protected removeLastToken(): void {}
  }

  /* Through `unknown`, for the reason `MixinField` gives: the protected members
     here and on the declared interface are two declarations of the same names,
     which TypeScript treats as incompatible, and making them public would put
     four helpers on the API page of every field that takes tokens. */
  return TokensElement as unknown as Constructor<MixinTokensInterface> & T
}
