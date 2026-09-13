import { customElement, HelixElement, HelixSelectEvent } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * The options among some elements, reaching one level into a group.
 *
 * What a control holding options reads its words from, off its own children
 * rather than off the listbox they are slotted into: the slot exists only once a
 * render has made it, so the listbox has none on a first render, and on a page a
 * server rendered the `slotchange` that would correct it fires before anything
 * listens.
 *
 * **An option by its shape, not by `instanceof`.** A tag is defined once, by
 * whichever copy of this class registered it first, and a second copy in the
 * same document tests against a class no element on the page has: every option
 * failed it, and a select said "Choose" over its value. Two copies are a
 * consumer with a duplicated dependency, or the browser specs, where each
 * family's bundle carries its own and they share one page.
 */
export const optionsAmong = (elements: readonly Element[]): HelixHeadlessOption[] => {
  const isOption = (element: Element): element is HelixHeadlessOption =>
    'text' in element && 'value' in element && 'selected' in element
  return elements.flatMap((element) =>
    isOption(element) ? [element] : [...element.children].filter(isOption),
  )
}

/**
 * @summary One choice in a listbox.
 *
 * @description
 * **Its own family rather than a part of Select, and the reason is what it
 * belongs to.** `role="option"` requires an owning `role="listbox"`, which is
 * the ARIA contract: an option cannot stand alone. But a Select is *a listbox
 * with a trigger*, a Combobox is *a listbox with a text input*, and a command
 * palette is the same listbox again. The thing an option belongs to is the
 * listbox, not any one control that happens to contain one.
 *
 * That is the difference from `Radio`, which is a part of its group: a radio
 * has exactly one kind of owner, and an option has several.
 *
 * Selection is announced rather than applied, the way a radio's is. The option
 * says it was chosen, the listbox decides whether that stands, and the listbox
 * writes `selected` back. An option that selected itself would be a second
 * answer to which one is chosen.
 *
 * **Nothing here knows about filtering.** A hidden option is hidden by whatever
 * owns it, through `hidden`, because what counts as a match is the listbox's
 * question and differs between a select and a command palette.
 *
 * @since 0.1.0
 * @status experimental
 * @category forms
 * @aliases Item, Choice
 * @documentation https://helix.fusion.dev/components/option
 *
 * @slot - The words naming this choice.
 * @slot end - After them, for a shortcut or a count.
 * @slot start - Before the words, for an icon or an avatar.
 *
 * @event {HelixSelectEvent} helix-select - Fired when this choice is made. Cancelable: refusing it takes the decision and nothing moves.
 *
 * @csspart description - The caption under the words, when there is one.
 * @csspart item - The row.
 * @csspart label - The words.
 * @csspart text - The words and the caption under them, as one column.
 */
@customElement('helix-headless-option')
export class HelixHeadlessOption extends HelixElement {
  /**
   * Whether this is the option the keyboard is on.
   *
   * Written by the listbox.
   */
  @property({ attribute: 'data-active', reflect: true, type: Boolean })
  active = false

  /**
   * A second destination for this row, taken with the modifier held.
   *
   * **An attribute rather than a second row, which is the whole point.** A
   * palette of eighty-eight components that offered each of them a reference
   * page and a sandbox as separate entries would be a palette of a hundred and
   * seventy-six, and one earns its keep by getting a reader to one thing in
   * three keystrokes. The row already carries the first destination, so the
   * second belongs beside it.
   *
   * Declared here and acted on by whatever owns the list, the same division
   * selection already uses: an option says what it is and the listbox decides
   * what happens. `Command` is the only owner that reads it today, because a
   * select has one destination by definition.
   *
   * Absent is a row with one destination, which is nearly every row.
   */
  @property()
  alternate = ''

  /**
   * What the second destination is, for a reader who cannot see the footer.
   *
   * A row with two destinations needs both said, or a screen reader is told
   * about one of them and the other is a key nobody mentioned. It goes to
   * `aria-description` rather than into the name: the name is the row's own
   * words and stays what a reader searched for, and the second destination is a
   * fact about what pressing a key would do, which is what a description is.
   */
  @property({ attribute: 'alternate-label' })
  alternateLabel = ''

  /**
   * Whether the markup declared this one chosen, which is what a reset returns to.
   *
   * `<option selected>` reflects to `defaultSelected` and `option.selected` is
   * live state that does not reflect, and those are two different facts. This
   * element has one `selected` doing both jobs, so what is captured here is what
   * the markup said at upgrade, before anything could overwrite it: read the
   * attribute later and the listbox's own writes answer instead.
   *
   * **The deeper half is 302 and is not this.** State reflecting under the
   * declaration's name is the fault `TreeItem` already avoids by mirroring to
   * `data-selected`, and four families here still write `selected` back into a
   * consumer's markup. Splitting them means moving what every stylesheet selects
   * on, which is a change of its own rather than a property being added.
   */
  get defaultSelected(): boolean {
    return this.seeded
  }

  set defaultSelected(next: boolean) {
    this.seeded = next
  }

  /** What the markup said, read once at construction for the reason above. */
  private seeded = this.hasAttribute('selected')

  /**
   * A second line under the words, for what the choice actually is.
   *
   * A palette row reads better as a name and a caption than as one sentence
   * carrying both: "Helix" and "the design system" are two facts, and a comma
   * between them makes a reader parse the punctuation to find where the name
   * ends. Matching still reads the label, so what somebody types is matched
   * against the name rather than against prose about it.
   *
   * **A property and not a slot, which is the departure worth explaining.** The
   * area rules say a content property is its slot's fallback, and that holds for
   * a region always drawn: `Avatar`'s initials, `Tooltip`'s text. This one is
   * usually absent, and a wrapped slot generates a box whether or not it is
   * filled, so every option without a caption would carry an empty line. The
   * detection that would avoid it does not exist, `:host(:has())` being invalid
   * and the server having no children to inspect. A property is known at render
   * time, so the component can decline to draw the box at all.
   *
   * It does not reflect, per the rule that payload state stays off the host: a
   * string is not a fact a selector needs.
   */
  @property()
  description?: string

  /**
   * Whether this choice can be made.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * A shorter name for this choice, for where the row does not fit.
   *
   * `<option label>`'s own meaning: the text a chooser shows when it has less
   * room than the row does, which is what a select's closed trigger has. Empty
   * means the row's own content, which is the common case and is why this is not
   * simply the accessible name.
   */
  @property()
  label = ''

  /**
   * Whether this choice is currently chosen.
   *
   * Written by the listbox.
   */
  @property({ type: Boolean })
  selected = false

  /**
   * Identifies this choice, and is what a form submits.
   */
  @property()
  value = ''

  /**
   * The words, for a listbox that has to match text against them.
   *
   * Read from the rendered content rather than required as a property, because
   * the content is where a consumer naturally puts it and asking for both is
   * asking for two things to disagree.
   *
   * **The default slot's content, never `this.textContent`.** An option holds
   * three slots: the words, plus `start` for an icon and `end` for a shortcut
   * or a count. Neither of the latter two is what a reader searched for, and
   * `textContent` runs both onto the end of it. Measured on a font picker whose
   * options carry a two-letter specimen in `end`: the field read
   * `Noto Sans Linear BAg`, and typing `ag` matched 1,892 of 1,893 options,
   * every row containing the sample. An option with a keyboard shortcut in its
   * end slot has the same fault and a worse one, every row carrying one matching
   * every letter of it.
   *
   * Six things read this: the collapsed field of Select and of Combobox, the
   * listbox's filter, Combobox's match against typed text, its inline
   * completion, and the label on a chosen tag.
   *
   * A node goes to the default slot when it names no other, which is the rule
   * the platform applies at assignment. Asking the same question here rather
   * than a second one is what stops the two disagreeing. Text nodes are
   * always the default slot's and cannot say otherwise.
   *
   * **Text and elements, named rather than "not an element".** The filter read
   * `!(node instanceof Element) || node.slot === ''`, which admits a comment,
   * and `textContent` on a comment is the comment's own body. Every option Lit
   * renders carries one: a child binding is marked with `<!--?lit$1234$-->`, so
   * an option written as `` html`<${option}>${size}</${option}>` `` read back as
   * `?lit$090648746$25`. Measured in `pagination/footer`, where the trigger
   * painted exactly that instead of `25`, on both twins.
   *
   * It is worse than one wrong label, because of the six readers listed above:
   * the filter and Combobox's match compare against this string, so a marker in
   * it is in every comparison too.
   */
  get text(): string {
    return [...this.childNodes]
      .filter(
        (node) => node.nodeType === Node.TEXT_NODE || (node instanceof Element && node.slot === ''),
      )
      .map((node) => node.textContent ?? '')
      .join('')
      .trim()
  }

  /** Makes this choice and announces it. */
  select(): void {
    if (this.disabled) {
      return
    }
    this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
  }

  /**
   * Mirrors the chosen state where a stylesheet can select on it.
   *
   * **A custom state, and never the `selected` attribute.** The parent writes
   * this: a listbox choosing a row, a tab strip moving the tab, a radio group
   * answering for its set. Reflected, that puts the element's own bookkeeping
   * onto markup a consumer wrote and a consumer's server never sent, which React
   * reconciles and reports as a mismatch, and which a serialized element pasted
   * back declares as a choice nobody made. `ElementInternals` holds it instead,
   * where it is not in the DOM at all.
   *
   * Reading `selected` is unaffected and so is writing it: the attribute still
   * seeds the property, which is what `<helix-option selected>` in a consumer's
   * markup means. What stops is the write back.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('selected', this.selected)
  }

  protected override render(): TemplateResult {
    /* `role` and `aria-selected` on the host through internals, because an
       option's semantics have to be visible to the listbox that owns it and a
       wrapper in here would put a box between them. */
    this.internals.role = 'option'
    this.internals.ariaSelected = String(this.selected)
    this.internals.ariaDisabled = this.disabled ? 'true' : null
    this.internals.ariaDescription =
      this.alternate !== '' && this.alternateLabel !== '' ? this.alternateLabel : null

    /* A pointer reaches `select()` the way every other choosable row in this
       library does, from a `@click` in its own template: `Tabs.Tab`,
       `Tree.Item` and `Menu.Item` all bind one. Nothing else listens for a click
       on an option, so removing this leaves a select the keyboard can use and a
       pointer cannot. A spec that chooses by calling `select()` or by pressing a
       key cannot tell the difference. */
    return html`<div part="item" @click=${() => this.select()}>
      <slot name="start"></slot>
      <span part="text">
        <span part="label"><slot></slot></span>
        ${this.description ? html`<span part="description">${this.description}</span>` : nothing}
      </span>
      <slot name="end"></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-option': HelixHeadlessOption
  }
}
