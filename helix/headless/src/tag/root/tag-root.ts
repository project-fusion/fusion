import {
  customElement,
  drawDismiss,
  drawDismissGlyph,
  HelixElement,
  hostAria,
  MixinDismissible,
  slottedWords,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary A short label that adds metadata to content.
 *
 * @description
 * A label that people can optionally remove. `dismissible` is the difference
 * from a badge: a badge shows a state that people cannot change, and a tag
 * names something they can remove.
 *
 * The remove button sends `helix-dismiss`. The tag does not remove itself,
 * because your code owns the list it is in, so remove it in your handler. A
 * listener can cancel `helix-dismiss`, and `dismiss()` then returns `false`.
 * When the handler removes a tag whose remove button has focus, focus moves to
 * the next tag's remove button, or to the previous one's after the last tag.
 *
 * The remove button is named for its tag, such as "Remove Apple", so a list of
 * buttons says which tag each one removes. Write `{label}` in `dismiss-label`
 * to put the tag's words somewhere else, such as `dismiss-label="{label}
 * entfernen"`.
 *
 * `href` makes the label a link, and `disabled` takes the tag out of reach: its
 * link and its remove button stop answering.
 *
 * **In a `Tag.Group` a tag is a row of a grid.** The group gives it its role,
 * its place in the one tab stop and, where the group selects, whether it is
 * selected. Its remove button leaves the tab order there, Delete and Backspace
 * doing its job from the row.
 *
 * @since 0.1.0
 * @status stable
 * @category markers
 * @aliases Chip, Pill, Label
 * @documentation https://fusion.dev/helix/components/tag
 *
 * @slot - The tag's label.
 * @slot dismiss-icon - Replaces the glyph on the remove button.
 * @slot start - The category the label belongs to, shown before it in a heavier weight.
 *
 * @event {HelixDismissEvent} helix-dismiss - The remove button was pressed. The tag does not remove itself, so remove it in response. Cancelable.
 *
 * @csspart cell - The grid cell around everything the tag shows, rendered only in a `Tag.Group`, where it takes focus.
 * @csspart dismiss - The button that removes the tag.
 * @csspart dismiss-mark - The icon on the remove button.
 * @csspart label - The label, which the styled tag trims to its capitals and baseline so the letters sit at the middle in any font.
 * @csspart link - The link around the label, under `href`.
 * @csspart start - The category before the label.
 *
 * @cssstate selected - The tag is selected in a `Tag.Group` that selects.
 */
@customElement('helix-headless-tag')
export class HelixHeadlessTag extends MixinDismissible(HelixElement) {
  /* "Remove" rather than the mixin's "Dismiss". A tag is taken out of a set,
     which is a different act from closing a message, and the control's name is
     what a screen-reader user hears. */
  override dismissLabel = 'Remove'

  /**
   * Takes the tag out of reach: its link and its remove button stop
   * answering, and in a `Tag.Group` the arrow keys pass over it and it cannot
   * be selected or removed.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * Whether the tag holds its group's tab stop.
   *
   * Written by `Tag.Group` on every tag it holds, and unset outside one, which
   * is how a tag knows it is a row. No attribute: it is coordination between
   * elements, the same shape `Toggle.focusable` has.
   */
  @property({ attribute: false })
  focusable?: boolean

  /**
   * Makes the label a link to this address.
   */
  @property()
  href = ''

  /**
   * Whether the tag is selected, in a `Tag.Group` that selects.
   *
   * Written by the group from its own `value`, and unset where nothing can be
   * selected, which is what keeps `aria-selected` off a set that does not
   * select.
   */
  @property({ attribute: false })
  selected?: boolean | undefined

  /**
   * What the tag stands for in its group's `value`.
   *
   * Absent is the tag's own words, its category first.
   */
  @property()
  value = ''

  /** The tag's words, its category first, or none where the children are not known yet. */
  get words(): string {
    return this.childrenKnown ? slottedWords(this, ['start', '']) : ''
  }

  /** Whether a `Tag.Group` holds this tag, which makes it a row. */
  private get grouped(): boolean {
    return this.focusable !== undefined
  }

  /**
   * Moves focus to the tag: its cell in a group, and otherwise its link or
   * its remove button, whichever it has.
   */
  focusItem(): void {
    this.renderRoot
      .querySelector<HTMLElement>(
        this.grouped ? '[part~="cell"]' : '[part~="link"], [part~="dismiss"]',
      )
      ?.focus()
  }

  /* A removed row hands focus to the next row in a group, where the remove
     buttons are out of the tab order. */
  protected override get returnFocusTo(): HTMLElement | null {
    if (this.disabled) {
      return null
    }
    return this.grouped
      ? this.renderRoot.querySelector<HTMLElement>('[part~="cell"]')
      : super.returnFocusTo
  }

  /* What the group gives the tag, said through `ElementInternals` so nothing is
     written onto a host the consumer rendered. In `willUpdate`, which a server
     calls too, so a served tag says what a hydrated one says.

     **A row is named by its words alone.** Named from its content, a row of a
     tag called Open was "Open Remove Open", its remove button's name read
     after its own; the button is still in the row, and says its name when a
     reader reaches it. */
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed)
    hostAria(this.internals, {
      label: this.grouped ? this.words : '',
      role: this.grouped ? 'row' : '',
    })
    this.internals.ariaSelected = this.selected === undefined ? null : String(this.selected)
    this.internals.ariaDisabled = this.disabled ? 'true' : null
    this.toggleState('selected', this.selected === true)
  }

  /**
   * The remove button's name: `dismissLabel` with the tag's own words.
   *
   * **Named for its tag**, because a set of tags each named "Remove" is a list
   * of buttons that says nothing about which tag each one takes away. The
   * words are the tag's slotted text, its category first, and `{label}` in
   * `dismissLabel` says where they go. Without it they follow the verb, unless
   * the label already holds them, which is what a page naming each button by
   * hand wrote.
   *
   * Read from the children, so empty on a server and while hydrating, where
   * the name is the verb alone until the update after.
   */
  private get removeName(): string {
    const words = this.words
    if (this.dismissLabel.includes('{label}')) {
      return this.dismissLabel.replace('{label}', words).trim()
    }
    return words === '' || this.dismissLabel.includes(words)
      ? this.dismissLabel
      : `${this.dismissLabel} ${words}`
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    /* On the root, so the template the server spec reads is unchanged: a
       `slotchange` bubbles to it from either slot, and new words rename the
       button. */
    this.renderRoot.addEventListener('slotchange', () => this.requestUpdate())
    this.finishHydration()
  }

  protected override render(): TemplateResult {
    const content = html`<slot name="start" part="start"></slot>${this.renderLabel()}${
      this.dismissible ? this.renderDismiss() : nothing
    }`
    /* A cell only in a group, so a tag on its own renders exactly what it did:
       a grid row needs a cell to hold what it shows, and a lone tag is no row. */
    return this.grouped
      ? html`<span
          aria-label=${this.words || nothing}
          part="cell"
          role="gridcell"
          tabindex=${this.focusable ? '0' : '-1'}
          >${content}</span
        >`
      : content
  }

  /** The label, inside a link under `href`, behind a seam a tier can move. */
  protected renderLabel(): TemplateResult {
    if (this.href === '') {
      return html`<slot part="label"></slot>`
    }
    /* A disabled link loses its address, which is what takes it out of the
       tab order and stops a press going anywhere; in a group the row holds the
       stop and Enter follows the link. */
    return html`<a
      aria-disabled=${this.disabled ? 'true' : nothing}
      href=${this.disabled ? nothing : this.href}
      part="link"
      tabindex=${this.grouped ? '-1' : nothing}
      ><slot part="label"></slot
    ></a>`
  }

  /** The remove button, behind a seam a tier can move. */
  protected renderDismiss(): TemplateResult {
    return drawDismiss({
      disabled: this.disabled,
      label: this.removeName,
      mark: html`<slot name="dismiss-icon">${drawDismissGlyph()}</slot>`,
      onDismiss: () => this.dismiss(),
      tabindex: this.grouped ? '-1' : undefined,
    })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-tag': HelixHeadlessTag
  }
}
