import {
  customElement,
  followLink,
  HelixElement,
  HelixSelectEvent,
  type LinkModifiers,
} from '@fusion.dev/helix-core'
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
 * Options are their own family, separate from Select, because an option belongs
 * to a listbox and several controls contain one. `role="option"` requires an
 * owning `role="listbox"`. A Select is a listbox with a trigger, a Combobox is
 * a listbox with a text input, and a command palette is a listbox in a dialog.
 * `Radio` is a part of its group, because a radio has only one kind of owner.
 *
 * Selection works the way it does for a radio. Choosing an option dispatches an
 * event, the listbox decides whether the choice stands, and the listbox sets
 * `selected`.
 *
 * Filtering belongs to the owner, which hides an option with `hidden`. What
 * counts as a match differs between a select and a command palette.
 *
 * An option with `href` is a link: choosing it follows the link and selects
 * nothing, as an entry in a command palette that goes to a page does.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Item, Choice
 * @documentation https://fusion.dev/helix/components/option
 *
 * @slot - The option's label.
 * @slot end - Content after the label, such as a shortcut or a count.
 * @slot start - Content before the label, such as an icon or an avatar.
 *
 * @event {HelixSelectEvent} helix-select - The option was chosen. Cancelable: canceling it leaves the selection as it was, and keeps the browser from following an option's `href`.
 *
 * @csspart description - The description under the label, when there is one.
 * @csspart item - The row.
 * @csspart item-active - The row the keyboard is on. Set alongside `item`.
 * @csspart item-selected - The row of a selected option. Set alongside `item`.
 * @csspart label - The option's label.
 * @csspart text - The label and the description under it, as one column.
 *
 * @cssstate active - While the keyboard is on the option, which is the option `aria-activedescendant` names.
 * @cssstate selected - While the option is chosen.
 */
@customElement('helix-headless-option')
export class HelixHeadlessOption extends HelixElement {
  /**
   * Whether this is the option the keyboard is on.
   *
   * Written by the listbox, which writes it once a reader moves the highlight.
   * It shows as `:state(active)`, and as a `data-active` attribute for the
   * stylesheets written before the state existed.
   */
  @property({ attribute: 'data-active', reflect: true, type: Boolean })
  active = false

  /**
   * A second destination for the row, opened when you choose it with the
   * modifier key held.
   *
   * **An attribute rather than a second row, which is the whole point.** A
   * palette that offered every component a reference page and a sandbox as
   * separate entries would be twice as long, and one earns its keep by getting
   * a reader to one thing in three keystrokes. The row already carries the
   * first destination, so the second belongs beside it.
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
   * The name of the second destination, announced to screen reader users.
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
   * Whether the markup declares this option selected. A form reset returns to it.
   *
   * `<option selected>` reflects to `defaultSelected` and `option.selected` is
   * live state that does not reflect, and those are two different facts. This
   * element has one `selected` doing both jobs, so the declaration is the
   * attribute and the state is the property.
   *
   * **The attribute, read when it is asked for, and never a snapshot taken in
   * the constructor.** A field initializer runs there, and an element the HTML
   * parser created has none of its attributes yet at that moment: measured on
   * this element, on `Radio` and on `Toggle`, `<helix-headless-option value="a"
   * selected>` reported `defaultSelected` as `false` both from parsed markup
   * and from `createElement` followed by `setAttribute`, which is every way a
   * consumer writes one. The snapshot could only ever be true for an element
   * already in the document when `customElements.define` ran.
   *
   * Nothing overwrites it either, which is what makes reading it late correct
   * rather than merely later: `selected` does not reflect, for the reason
   * `willUpdate` records, so the listbox's writes never reach the attribute and
   * what it says is what the markup said.
   *
   * **The deeper half is not this.** State reflecting under the declaration's
   * name is the fault `TreeItem` avoids by mirroring to `data-selected`.
   * Splitting them means moving what every stylesheet selects on, which is a
   * change of its own rather than a property being added.
   */
  get defaultSelected(): boolean {
    return this.hasAttribute('selected')
  }

  set defaultSelected(next: boolean) {
    this.toggleAttribute('selected', next)
  }

  /**
   * A second line under the label that describes the choice.
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
   * Prevents the option from being chosen.
   */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /**
   * Whether following the link downloads what it names. Only meaningful
   * beside an `href`.
   */
  @property({ type: Boolean })
  download = false

  /**
   * The URL the option links to. Setting it makes the option a link: choosing
   * it, with a press, Enter or a click, follows the link and selects nothing,
   * as React Aria's items with `href` do. Command, Control and Shift open it
   * where they open a link, in a new tab or a new window.
   *
   * `helix-select` is said first with the `href` in it, and canceling it keeps
   * the browser from following, so a client-side router follows it instead.
   *
   * **The option stays an option**, and an anchor is never drawn inside it:
   * `role="option"` sits on the host, where a listbox's
   * `aria-activedescendant` can name it, and an `<a>` inside would be exposed
   * as a link within the option and take its name (Menu Item's `href` records
   * the measurement). The link is followed through an anchor made for the
   * moment, which `followLink` describes.
   */
  @property()
  href = ''

  /**
   * A shorter name for this choice, for where the row does not fit.
   *
   * `<option label>`'s own meaning: the text a chooser shows when it has less
   * room than the row does, which is what a select's closed trigger has. Empty
   * means the row's own content, which is the common case and is why this is not
   * simply the accessible name.
   *
   * **An option with a label and nothing in it shows the label**, as
   * `<option label>` does: written the platform's way, a select listed a row of
   * nothing for every choice.
   */
  @property()
  label = ''

  /**
   * The link's `rel`. Set it whenever you set `target="_blank"`.
   */
  @property()
  rel = ''

  /**
   * Whether this choice is currently chosen.
   *
   * Written by the listbox.
   */
  @property({ type: Boolean })
  selected = false

  /**
   * Where the link opens, such as `_blank`, for an option with an `href`.
   */
  @property()
  target = ''

  /**
   * The words a reader types to reach this choice, where the row's own words
   * are not them: typeahead, a filter and a combobox match against it, and a
   * select's trigger shows it.
   *
   * For a row whose content is a picture, an avatar beside a name and a role,
   * or a name written in another script, as React Aria's `textValue`. Empty
   * reads the row's words, then `label`.
   */
  @property({ attribute: 'text-value' })
  textValue = ''

  /**
   * The value that identifies the option, and that a form submits.
   */
  @property()
  value = ''

  /**
   * The option's text, which a listbox matches typed text against.
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
   *
   * **The `label` where the slot holds nothing**, which is what the row shows
   * then, so the six read the words a reader sees. `text-value` wins over both,
   * being the consumer saying outright what the words are.
   */
  get text(): string {
    if (this.textValue !== '') {
      return this.textValue
    }
    return (
      [...this.childNodes]
        .filter(
          (node) =>
            node.nodeType === Node.TEXT_NODE || (node instanceof Element && node.slot === ''),
        )
        .map((node) => node.textContent ?? '')
        .join('')
        .trim() || this.label
    )
  }

  /**
   * Sends `helix-select` for this option. Does nothing when it is disabled.
   *
   * An option with an `href` then follows its link, unless the event was
   * canceled, with the keys `modifiers` names held.
   */
  select(modifiers?: LinkModifiers): void {
    if (this.disabled) {
      return
    }
    if (this.href === '') {
      this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
      return
    }
    if (this.dispatchEvent(new HelixSelectEvent({ href: this.href, value: this.value }))) {
      followLink(this.ownerDocument, this, modifiers)
    }
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
   * seeds the property, which is what `<helix-headless-option selected>` in a
   * consumer's markup means. What stops is the write back.
   */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('selected', this.selected)
    this.toggleState('active', this.active)
  }

  protected override render(): TemplateResult {
    /* `role` and `aria-selected` on the host through internals, because an
       option's semantics have to be visible to the listbox that owns it and a
       wrapper in here would put a box between them. */
    this.internals.role = 'option'
    /* A link is followed, not chosen, so it says nothing about being chosen,
       as React Aria's link items in a list that selects nothing. */
    this.internals.ariaSelected = this.href === '' ? String(this.selected) : null
    this.internals.ariaDisabled = this.disabled ? 'true' : null
    this.internals.ariaDescription =
      this.alternate !== '' && this.alternateLabel !== '' ? this.alternateLabel : null

    /* A pointer reaches `select()` the way every other choosable row in this
       library does, from a `@click` in its own template: `Tabs.Tab`,
       `Tree.Item` and `Menu.Item` all bind one. Nothing else listens for a click
       on an option, so removing this leaves a select the keyboard can use and a
       pointer cannot. A spec that chooses by calling `select()` or by pressing a
       key cannot tell the difference.

       `item-selected` and `item-active` say on the row what `:state(selected)`
       and `data-active` say on the host, for the option a component draws in
       its own shadow root: `Time Picker`'s times are out of reach of any
       selector naming the host, and `::part()` reaches the row. */
    return html`<div
      part="item${this.selected ? ' item-selected' : ''}${this.active ? ' item-active' : ''}"
      @click=${(event: MouseEvent) => this.select(event)}
    >
      <slot name="start"></slot>
      <span part="text">
        <span part="label"><slot>${this.label}</slot></span>
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
