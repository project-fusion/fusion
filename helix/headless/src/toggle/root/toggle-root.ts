import {
  customElement,
  HelixElement,
  HostClickController,
  MixinSelectableItem,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One option in a toggle group, or a toggle button on its own.
 *
 * @description
 * Renders a `<button role="radio">` for use as a form control. In a group with
 * `selection-mode="multiple"` it is a `<button>` that says whether it is
 * pressed with `aria-pressed`.
 *
 * **On its own, outside a `Toggle.Group`, it is a toggle button**, as React
 * Aria's `ToggleButton`: a `<button>` with `aria-pressed`. A press, Enter or
 * Space sends `helix-select`, which you can cancel, then flips `selected` and
 * sends `change`. Write `selected` in the markup to start it pressed.
 *
 * Do not use it for navigation. For navigation, use links marked with
 * `aria-current` and styled by the `data-navigation-item` recipe in the base
 * layer. The recipe has the same look, and links are not announced as choices.
 *
 * @since 0.1.0
 * @status stable
 * @category actions
 * @aliases Segment, NavItem, Option
 * @documentation https://fusion.dev/helix/components/toggle
 *
 * @slot - The item's label.
 *
 * @event {Event} change - Fired after a toggle button on its own is pressed or released.
 * @event {HelixSelectEvent} helix-select - Fired when the item is chosen. Cancelable: call `preventDefault()` to keep the current choice.
 *
 * @csspart item - The radio button.
 *
 * @cssstate pressed - The item is pressed, in a group where several can be.
 * @cssstate selected - The item is chosen.
 */
@customElement('helix-headless-toggle')
export class HelixHeadlessToggle extends MixinSelectableItem(HelixElement) {
  /** A click on the element itself, `click()` included, chooses it, as on `Radio`. */
  protected readonly clicks = new HostClickController(this, () => this.partNamed('item'))

  /**
   * Whether the markup declares the item chosen. A form reset returns to it.
   *
   * `<option selected>` reflects to `defaultSelected` and `option.selected` is
   * live state that does not reflect, and those are two different facts. This
   * element has one `selected` doing both jobs, so the declaration is the
   * attribute and the state is the property.
   *
   * **The attribute, read when it is asked for, and never a snapshot taken in
   * the constructor.** A field initializer runs there, and an element the HTML
   * parser created has none of its attributes yet at that moment: measured on
   * this element, on `Option` and on `Radio`, `<helix-headless-toggle
   * value="light" selected>` reported `defaultSelected` as `false` both from
   * parsed markup and from `createElement` followed by `setAttribute`, which is
   * every way a consumer writes one. The snapshot could only ever be true for
   * an element already in the document when `customElements.define` ran.
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
   * Whether the item holds the group's tab stop. Unset, no group holds the
   * item, and it is a toggle button with a tab stop of its own.
   *
   * Written by the group on every item: `true` for the chosen item, or for the
   * first item that can be chosen while there is no selection to carry the
   * stop, and `false` for every item, the chosen one too, while a toolbar the
   * group sits in holds the stop. No attribute: it is coordination between
   * elements, and `tabindex` on a host the consumer rendered is the change a
   * React consumer's hydration reports and does not patch up.
   */
  @property({ attribute: false })
  focusable?: boolean

  /**
   * Whether the item is pressed, in a group where several can be, and
   * `undefined` in a group where one is chosen.
   *
   * Written by the group, like `selected`, so no attribute.
   */
  @property({ attribute: false })
  pressed?: boolean | undefined

  /**
   * Whether no `Toggle.Group` holds the item, which makes it a toggle button
   * of its own. A group writes `focusable` on every item it holds. A server,
   * and the render that hydrates its markup, cannot tell, and draw the item a
   * group holds.
   */
  private get alone(): boolean {
    return this.focusable === undefined && this.childrenKnown
  }

  /**
   * Chooses the item in its group, or, on its own, flips `selected` once
   * `helix-select` stands and sends `change`.
   */
  override select(): boolean {
    if (!this.alone) {
      return super.select()
    }
    if (!super.select()) {
      return false
    }
    this.selected = !this.selected
    this.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    this.toggleState('pressed', this.alone ? this.selected : this.pressed === true)
  }

  /**
   * Asks for the render that follows a hydration, so the stop stops being every
   * choice's.
   *
   * `tabindex` reads `childrenKnown` and a hydrating render is one where that is
   * false, which is what keeps the hydrating render the server's. Nothing else
   * is sure to ask: a write from the group that leaves `focusable` as it was
   * re-renders nothing.
   */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override render(): TemplateResult {
    /* **A render the group has not reached holds the stop open.** `selected`
       and `focusable` are both the group's word and the group reads its
       children to say either, so on a server neither is true of anything and a
       bare `'-1'` served a set the keyboard could not enter at all: the fault
       `focusable` exists to prevent, arriving through the one render
       `focusable` cannot be written in. Untold, every item is a stop, which is
       what a document with no script does anyway, there being no arrow keys to
       move a single stop with until one arrives. `childrenKnown` is the test
       `FilterInput.Chip` uses in the same words, a server and the render that
       has to be its, so a browser draws what it drew before. `Radio.Root`
       carries the same line for the same reason. */
    const alone = this.alone
    const radio = !alone && this.pressed === undefined
    const pressed = alone ? this.selected : this.pressed
    return html`<button
      part="item"
      type="button"
      role=${radio ? 'radio' : nothing}
      aria-checked=${radio ? String(this.selected) : nothing}
      aria-pressed=${radio || pressed === undefined ? nothing : String(pressed)}
      ?disabled=${this.disabled}
      tabindex=${alone || (this.focusable ?? this.selected) || !this.childrenKnown ? '0' : '-1'}
      @click=${() => this.select()}
    ><slot></slot></button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-toggle': HelixHeadlessToggle
  }
}
