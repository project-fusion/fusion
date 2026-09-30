import {
  customElement,
  HelixElement,
  HostClickController,
  MixinSelectableItem,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One choice in a radio group.
 *
 * @description
 * Renders a `<button role="radio">`. Native radios group by sharing a `name`
 * within a form, and a radio inside a shadow root cannot join a group outside
 * it. The group is the form control, so each radio only exposes its role and
 * dispatches an event when it is chosen.
 *
 * The radio has no label of its own. Its content names it, and the label, the
 * hint, and the message of the set belong to the group. It is the only control
 * in the family that takes nothing from `MixinField`.
 *
 * When a radio is chosen, it dispatches an event, the group determines whether
 * the choice stands, and the group writes `selected` back. The group is the one
 * source of which radio is on.
 *
 * @since 0.1.0
 * @status stable
 * @category forms
 * @aliases Option, Choice
 * @documentation https://fusion.dev/helix/components/radio
 *
 * @slot - The radio's label.
 * @slot icon - An icon shown beside the label. With `variant="chip"`, the icon
 * replaces the visible label, and the label becomes the name read by screen
 * readers. The icon has its own slot so the chip can hide the label and show
 * the icon.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the radio is chosen. Cancelable: call `preventDefault()` to keep the current choice.
 *
 * @csspart box - The circle. Draw the dot inside it with `::part(box)::after` in
 * your stylesheet. This tier ships no CSS, so it renders no separate element for
 * the dot, which would add an empty child to your layout.
 * @csspart item - The button, which covers the whole row.
 * @csspart label - The label beside the circle.
 *
 * @cssstate selected - The radio is chosen.
 */
@customElement('helix-headless-radio')
export class HelixHeadlessRadio extends MixinSelectableItem(HelixElement) {
  /** A click on the element itself, `click()` included, chooses it. */
  protected readonly clicks = new HostClickController(this, () => this.partNamed('item'))

  /**
   * Whether the markup declares the radio chosen. A form reset returns to it.
   *
   * `<option selected>` reflects to `defaultSelected` and `option.selected` is
   * live state that does not reflect, and those are two different facts. This
   * element has one `selected` doing both jobs, so the declaration is the
   * attribute and the state is the property.
   *
   * **The attribute, read when it is asked for, and never a snapshot taken in
   * the constructor.** A field initializer runs there, and an element the HTML
   * parser created has none of its attributes yet at that moment: measured on
   * this element, on `Option` and on `Toggle`, `<helix-headless-radio value="a"
   * selected>` reported `defaultSelected` as `false` both from parsed markup
   * and from `createElement` followed by `setAttribute`, which is every way a
   * consumer writes one. The snapshot could only ever be true for an element
   * already in the document when `customElements.define` ran.
   *
   * Nothing overwrites it either, which is what makes reading it late correct
   * rather than merely later: `selected` does not reflect, for the reason
   * `willUpdate` records, so the group's writes never reach the attribute and
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
   * Whether the radio holds the group's tab stop while nothing is chosen.
   *
   * The stop rides on the selection, and an unanswered group has no selection,
   * so without this every choice is `tabindex="-1"` and the keyboard cannot
   * enter the set at all.
   *
   * **Written by the group, with no attribute, and it reaches the control
   * rather than the host.** A `tabindex` on the host is two faults at once: it
   * is markup a consumer rendered and their server never sent, which React
   * reports as a mismatch and does not patch up, and it puts the tab stop on
   * the element rather than on the `<button role="radio">` inside it, so a
   * screen reader meets an unnamed box where a native group would have given
   * them an unchecked radio. `Toggle.Root` carries the same property for the
   * same reason.
   */
  @property({ attribute: false })
  focusable = false

  /**
   * Asks for the render that follows a hydration, so the stop stops being every
   * choice's.
   *
   * `tabindex` reads `childrenKnown` and a hydrating render is one where that is
   * false, which is what keeps the hydrating render the server's. Nothing else
   * would ask: the group writes an already-false `focusable` onto every choice
   * but one, which changes nothing and so re-renders nothing.
   */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override render(): TemplateResult {
    /* Roving `tabindex`: one stop for the whole set, which is what a radio
       group is in the tab order, and the arrow keys move within it. The group
       owns the keys, because moving between items is a fact about the set.

       `focusable` is the unanswered set's entry stop, and it is on the button
       rather than on the host so that what a reader tabs to is the radio.

       **And a render the group has not reached holds the stop open.** Both
       halves are the group's word and the group reads its children to say
       either, so on a server neither is true of anything and a bare `'-1'`
       served a set the keyboard could not enter at all: the fault `focusable`
       exists to prevent, arriving through the one render `focusable` cannot be
       written in. Untold, every choice is a stop, which is what a document with
       no script does anyway, there being no arrow keys to move a single stop
       with until one arrives. `childrenKnown` is the test `FilterInput.Chip`
       uses in the same words, a server and the render that has to be its, so a
       browser draws what it drew before. */
    return html`<button
      part="item"
      type="button"
      role="radio"
      aria-checked=${this.selected ? 'true' : 'false'}
      ?disabled=${this.disabled}
      tabindex=${this.selected || this.focusable || !this.childrenKnown ? '0' : '-1'}
      @click=${() => this.select()}
    >
      <span part="box"></span>
      <slot name="icon"></slot>
      <span part="label"><slot></slot></span>
    </button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-radio': HelixHeadlessRadio
  }
}
