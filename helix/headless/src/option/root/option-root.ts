import { customElement, HelixElement, HelixSelectEvent } from '@helix-io/core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

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
 * @slot start - Before the words, for an icon or an avatar.
 * @slot end - After them, for a shortcut or a count.
 *
 * @event {HelixSelectEvent} helix-select - Fired when this choice is made.
 *
 * @csspart item - The row.
 * @csspart label - The words.
 */
@customElement('helix-base-option')
export class HelixBaseOption extends HelixElement {
  /** Whether this choice can be made. */
  @property({ reflect: true, type: Boolean })
  disabled = false

  /** Whether this is the option the keyboard is on. Written by the listbox. */
  @property({ attribute: 'data-active', reflect: true, type: Boolean })
  active = false

  /** Whether this choice is currently chosen. Written by the listbox. */
  @property({ reflect: true, type: Boolean })
  selected = false

  /** Identifies this choice, and is what a form submits. */
  @property()
  value = ''

  /**
   * The words, for a listbox that has to match text against them.
   *
   * Read from the rendered content rather than required as a property, because
   * the content is where a consumer naturally puts it and asking for both is
   * asking for two things to disagree.
   */
  get text(): string {
    return this.textContent?.trim() ?? ''
  }

  /** Makes this choice and announces it. */
  select(): void {
    if (this.disabled) {
      return
    }
    this.dispatchEvent(new HelixSelectEvent({ value: this.value }))
  }

  protected override render(): TemplateResult {
    /* `role` and `aria-selected` on the host through internals, because an
       option's semantics have to be visible to the listbox that owns it and a
       wrapper in here would put a box between them. */
    this.internals.role = 'option'
    this.internals.ariaSelected = String(this.selected)
    this.internals.ariaDisabled = this.disabled ? 'true' : null

    /* A pointer reaches `select()` the way every other choosable row in this
       library does, from a `@click` in its own template: `Tabs.Tab`,
       `Tree.Item` and `Menu.Item` all bind one. This had none, and nothing else
       listened for a click either, so an option could be chosen with the
       keyboard and not with a mouse. A select was unusable with a pointer for
       as long as it has existed, which nothing caught because every spec for it
       chooses by calling `select()` or by pressing a key. */
    return html`<div part="item" @click=${() => this.select()}>
      <slot name="start"></slot>
      <span part="label"><slot></slot></span>
      <slot name="end"></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-option': HelixBaseOption
  }
}
