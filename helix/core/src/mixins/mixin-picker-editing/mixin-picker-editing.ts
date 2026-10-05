import { property, state } from 'lit/decorators.js'
import type { HelixFormElement } from '../../helix-form-element/helix-form-element.js'
import type { MixinControllerOpenInterface } from '../mixin-controller-open/mixin-controller-open.js'
import type { MixinControllerValueInterface } from '../mixin-controller-value/mixin-controller-value.js'
import type { MixinPickerFieldInterface } from '../mixin-picker-field/mixin-picker-field.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/** What this is applied over: a picker field, which `MixinPickerField` makes. */
type EditingBase = HelixFormElement &
  MixinControllerOpenInterface &
  MixinControllerValueInterface &
  MixinPickerFieldInterface

/**
 * The public surface `MixinPickerEditing` adds.
 *
 * Declared separately because TypeScript cannot emit declarations for an
 * anonymous class that has private members (TS4094). Casting the mixin's return
 * to this interface keeps the internals private and the build working.
 */
export declare class MixinPickerEditingInterface {
  /**
   * Whether the caret is in the field, which is when it holds the value.
   */
  protected editing: boolean

  /** The caret has left, so the field renders again. */
  protected readonly handleBlur: () => void

  /**
   * A press that focuses the field opens the picker, and only from outside the
   * element. Focus that arrives by Tab or from a script opens nothing.
   */
  protected readonly handleFocus: (event: FocusEvent) => void

  /**
   * Whether the value is locked. A read-only control still submits its value.
   */
  readOnly: boolean

  /**
   * Requests a new value. While `readOnly` is set, nothing changes and it
   * returns `false`.
   */
  requestValue(next: string): boolean

  /**
   * Requests the panel open or closed. While `readOnly` is set, it does not
   * open, and it returns `false`.
   */
  requestOpen(next: boolean): boolean
}

/**
 * Grafts the typing half of a picker field: a press into it opens the picker,
 * it holds the value while the caret is in it, and it refuses while read-only.
 *
 * **Over `MixinPickerField` and not part of it, because Color Input takes the
 * one and not the other.** Date Input and Time Input show a rendering while
 * nobody is in the field, `4 August 2026` and `2:30 PM`, and the value itself
 * while somebody is, because `Intl` formats and does not parse and a document
 * being edited must not be a rendering of something else. That split needs to
 * know when the caret is in the field, which is `editing`; and a reader who
 * presses into such a field is choosing, so the press opens the picker. A color
 * has neither: `#ff0000` is what is typed and what is shown, and a reader who
 * has the hex pastes it and never opens anything.
 *
 * **Tab into the field opens nothing.** It did, and a reader moving through a
 * form with a screen reader heard a dialog appear at every date and every
 * time they passed. React Aria's DatePicker opens on its button alone and the
 * APG date picker combobox opens on its button or Down; here the trigger and
 * ArrowDown open it from the keyboard, and a press into the text opens it for
 * a pointer, which is where the reader has already shown what they came for. `readOnly` comes along here for
 * the two that take this mixin; Color Input declares its own, the same
 * property refusing the same two requests.
 */
export const MixinPickerEditing = <T extends Constructor<EditingBase>>(Base: T) => {
  // JSDoc is duplicated from MixinPickerEditingInterface deliberately. The
  // interface is what TypeScript consumers see; this class is what the manifest
  // analyzer reads when resolving inherited members into dependent packages.
  class PickerEditingElement extends Base {
    /**
     * Whether the value is locked. A read-only control still submits its value.
     *
     * **Enforced by refusing every request in one place**, which is the seam this
     * component already has: `requestValue` is what every path here comes through,
     * and gating it once is what stops the next call site from being written
     * without the check.
     *
     * Not `disabled`, which is the confusion worth naming: a disabled control
     * submits nothing and leaves the tab order, and a read-only one submits its
     * value and stays reachable, which is what a form showing a value somebody
     * else set needs.
     */
    @property({ attribute: 'readonly', reflect: true, type: Boolean })
    readOnly = false

    /**
     * Whether the caret is in the field, which is when it holds the value.
     */
    @state()
    protected editing = false

    /**
     * Requests a new value. While `readOnly` is set, nothing changes and it
     * returns `false`.
     */
    override requestValue(next: string): boolean {
      if (this.readOnly) {
        return false
      }
      return super.requestValue(next)
    }

    /**
     * Requests the panel open or closed. While `readOnly` is set, it does not
     * open, and it returns `false`.
     *
     * A read-only field opened its picker on focus and on its trigger, and
     * then refused every pick in it, so the panel offered choices that went
     * nowhere. A native read-only `<input type="date">` opens nothing.
     */
    override requestOpen(next: boolean): boolean {
      if (next && this.readOnly) {
        return false
      }
      return super.requestOpen(next)
    }

    /** The caret has left, so the field renders again. */
    protected readonly handleBlur = (): void => {
      this.editing = false
    }

    /**
     * Whether a press on the text is under way, which is the one arrival that
     * opens the picker.
     *
     * Set on `pointerdown`, which a browser sends before the focus it causes,
     * and cleared on the `click` that ends the press: a touch moves focus after
     * `pointerup`, so `pointerup` would clear it too soon. A press that scrolls
     * instead is canceled, and focus takes the flag either way.
     */
    private pressing = false

    private readonly handlePress = (event: Event): void => {
      this.pressing = event.type === 'pointerdown' && event.composedPath()[0] === this.control
    }

    override connectedCallback(): void {
      super.connectedCallback()
      this.addEventListener('pointerdown', this.handlePress)
      this.addEventListener('pointercancel', this.handlePress)
      this.addEventListener('click', this.handlePress)
    }

    override disconnectedCallback(): void {
      super.disconnectedCallback()
      this.removeEventListener('pointerdown', this.handlePress)
      this.removeEventListener('pointercancel', this.handlePress)
      this.removeEventListener('click', this.handlePress)
    }

    /**
     * A press that focuses the field opens the picker.
     *
     * A reader who presses into this control is choosing, and making them find
     * the trigger afterwards is a second action for something they have already
     * asked for. Typing still works with it up, because the picker follows the
     * field rather than the other way round. Focus by Tab or by `focus()` opens
     * nothing: see the mixin's note.
     *
     * **Only where focus arrived from outside this element**, which is the whole
     * of the difficulty: picking shuts the panel and puts the caret back in the
     * field, so an unguarded version reopens the picker the reader just
     * answered. `relatedTarget` is where focus came from, so a hand-off from the
     * picker or the trigger is left alone and only a genuine arrival opens
     * anything. `returning` covers the hand-off `relatedTarget` cannot see, and
     * `MixinPickerField` says why.
     *
     * On the input rather than on the field, too. Focus does not bubble, so a
     * listener there covers the text and not the trigger, which is what keeps
     * pressing the trigger from opening the panel on focus and then shutting it
     * again on the click.
     */
    protected readonly handleFocus = (event: FocusEvent): void => {
      /* Not while the caret is being handed back. Picking returns focus to the
         field, and treating that as editing puts the field into the shape it
         takes for typing: a reader picks 4 August 2026 from the calendar and the
         field answers `2026-08-04`. Focus is a good enough signal for editing
         everywhere except the one moment this element moved the focus itself,
         and it already knows when that is. */
      this.editing = !this.returning
      const pressed = this.pressing
      this.pressing = false
      const from = event.relatedTarget
      if (!pressed || this.open || this.isDisabled || this.returning) {
        return
      }
      if (from instanceof Node && this.renderRoot?.contains?.(from)) {
        return
      }
      this.requestOpen(true)
    }
  }

  /* Through `unknown`, for the reason `MixinField` gives: the protected members
     here and on the declared interface are two declarations of the same names,
     which TypeScript treats as incompatible. */
  return PickerEditingElement as unknown as Constructor<MixinPickerEditingInterface> & T
}
