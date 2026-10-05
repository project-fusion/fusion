import type { PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { PopoverController } from '../../controllers/popover-controller/popover-controller.js'
import type { HelixFormElement } from '../../helix-form-element/helix-form-element.js'
import { reportValues } from '../../utils/report-values/report-values.js'
import type { MixinControllerOpenInterface } from '../mixin-controller-open/mixin-controller-open.js'
import type { MixinControllerValueInterface } from '../mixin-controller-value/mixin-controller-value.js'
import type { MixinFieldInterface } from '../mixin-field/mixin-field.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/**
 * What this is applied over: a form field that opens, holds a value and has a
 * label, which is the three controller mixins and `MixinField` together.
 */
type PickerBase = HelixFormElement &
  MixinControllerOpenInterface &
  MixinControllerValueInterface &
  MixinFieldInterface

/**
 * The public surface `MixinPickerField` adds.
 *
 * Declared separately because TypeScript cannot emit declarations for an
 * anonymous class that has private members (TS4094). Casting the mixin's return
 * to this interface keeps the internals private and the build working.
 */
export declare class MixinPickerFieldInterface {
  /** The message shown when the field holds text the picker cannot read. */
  badInputMessage: string | undefined

  /**
   * What the label points at and focus lands on.
   *
   * The text control, unless a family says otherwise: Color Input in `swatch`
   * has no text control, and its trigger is the only thing in the field a label
   * can name.
   */
  protected get anchor(): HTMLElement | null

  /**
   * Each answer the field holds, where it holds several, or `undefined` where
   * its value is one answer. Several are sent one entry each; see
   * `reportValues`.
   */
  protected get answers(): readonly string[] | undefined

  /** The text input, or `null` where there is no DOM to hold one. */
  protected get control(): HTMLInputElement | null

  /**
   * What the field shows, which is the value unless a family renders it.
   *
   * Date Input and Time Input show a written date or time while nobody is in
   * the field and the value itself while somebody is; Color Input shows the
   * value either way. What `restore` puts back is whichever the family says.
   */
  protected get display(): string

  /** Puts the caret in the field, as clicking its label does. */
  focus(options?: FocusOptions): void

  /**
   * The text control's own `change`, which a reader's edit ends with, said
   * under the host's name.
   */
  protected readonly handleCommit: (event: Event) => void

  /**
   * The trigger's press: opens the panel with focus in the picker, or closes
   * it.
   */
  protected readonly handleTriggerClick: () => void

  /** Enter in the text submits the form, as it does in a native text field. */
  protected readonly handleKeypress: (event: KeyboardEvent) => void

  /**
   * Escape shuts the panel without moving the value, Tab out of the text shuts
   * a panel the reader is passing, and ArrowDown in the text moves into it.
   */
  protected readonly handleKeydown: (event: KeyboardEvent) => void

  /** The overlay, placed against the field rather than the trigger. */
  protected readonly panel: PopoverController

  /**
   * Told the panel has been placed, and how wide the window leaves it room to
   * be, in pixels.
   *
   * Nothing, unless a family fits what its panel holds to the room it has.
   */
  protected placed(room: number | undefined): void

  /**
   * Takes a value the reader picked in the panel, and says it is settled.
   *
   * Returns whether it was taken. A family whose typing announces `input`
   * alone sends `change` from here for a pick, since a pick is a finished
   * choice.
   */
  protected requestPicked(next: string): boolean

  /** Puts the field back where the answer differs from what was typed. */
  protected restore(): void

  /** Puts the caret back in the field without the field reopening the panel. */
  protected returnFocus(): void

  /** Whether this element is moving the focus itself, right now. */
  protected returning: boolean

  /** Reports the value and the validity the host stands behind. */
  protected sync(): void

  /**
   * What is wrong with the value, in the reader's words, or nothing.
   *
   * The one check the platform cannot make: the control is `type="text"` and
   * has no idea what a date, a time or a color is, so the family says what one
   * looks like and `sync` reports it as `badInput`. Empty means the platform's
   * own verdict stands.
   */
  protected validate(): string
}

/**
 * Grafts a floating picker onto a text field, and the protocol between them.
 *
 * **Three families are this shape and were three copies of it.** Date Input,
 * Time Input and Color Input each render a text control, a trigger and a
 * `popover="manual"` surface holding a picker that already exists on its own,
 * and each owed the same wiring: the panel that floats the surface against the
 * field, the Escape that shuts it and hands the caret back, the restore that
 * puts the control back where a refusal left the value, and the sync that
 * reports the value and a verdict the platform cannot reach. Measured on the
 * diff that made the lift, 14 Sep 2026, comments counted: 223 lines left Date
 * Input and 32 came back, 185 left Time Input and 32 came back, 87 left
 * Color Input and 11 came back.
 *
 * **What it does not own is the picker, the typing or the value's shape.**
 * Which element floats in the surface, what a keystroke means, what the field
 * shows when idle and what is wrong with a value are each the family's, which
 * is why `display` and `validate` are seams here and the template stays where
 * it was. A family renders `field`, `control`, `trigger` and `surface`; this
 * reads them.
 *
 * **The parts this reads are the host's, so the name is a parameter.** A
 * literal `[part="control"]` here would be a lookup nothing in this file
 * renders, which is the fault `helix component`'s `selectors` exists to catch
 * and would rightly report. `MixinField.reportRequired` takes its anchor the
 * same way, and for the same reason: a mixin reads a part out of whatever host
 * applies it.
 *
 * **Opening on focus, `readOnly` and the idle rendering are not here.** They
 * are `MixinPickerEditing`'s, because Color Input takes neither of the first
 * and last: a hex is pasted and read at a glance, so its field neither renders
 * nor opens on arrival. Color Input declares its own `readOnly`.
 *
 * **Three things the two typed families share stay with them.** `renderTrigger`
 * differs only by its icon and would still be the wrong thing to lift: a part a
 * mixin renders belongs to every host that applies it, which is how
 * `helix component`'s `parts` reads a chain, so `trigger-icon` would be
 * credited to Color Input, whose trigger is a swatch and documents no such
 * part. `renderTag` names its part after the family, `date` or `time`, and
 * writes the label on the remove control differently in each. `valueAsDate`
 * and `valueAsNumber` are public, convert a different way, and carry a
 * different note onto each family's page, which a mixin could only carry as
 * one.
 *
 * **Four more families look like this and are not.** Select has no text to
 * hand the caret to: its panel hangs off the trigger and dismissal refocuses
 * that. Combobox has the text and a different agreement with it: a press
 * anywhere in the field is inside, the gap is four, Escape closes without the
 * `returning` flag because nothing there opens on arrival, and the control is
 * reconciled against a completion rather than restored to a value. Input and
 * Textarea open nothing, and their `readOnly` is the native attribute rather
 * than a gate on `requestValue`, so a programmatic change still lands. What
 * those two share with this is `focus()` and the platform's verdict copied in
 * `sync`, which is not a protocol.
 */
export const MixinPickerField = <T extends Constructor<PickerBase>>(Base: T) => {
  // JSDoc is duplicated from MixinPickerFieldInterface deliberately. The
  // interface is what TypeScript consumers see; this class is what the manifest
  // analyzer reads when resolving inherited members into dependent packages.
  class PickerFieldElement extends Base {
    /**
     * The message shown when the field holds text the picker cannot read as a
     * date, a time, or a color.
     *
     * **Every sentence a control raises in the browser's bubble is a
     * property**, named for the validity flag it reports, so a form in another
     * language speaks it. Absent is the family's own sentence, in English,
     * which says what the value should look like.
     */
    @property({ attribute: 'bad-input-message' })
    badInputMessage?: string

    /**
     * The overlay, placed against the field rather than the trigger.
     *
     * Against the field because that is the box a reader sees as the control: a
     * calendar hung off a small button at one end of a wide field reads as
     * belonging to the button. `Select` anchors to its trigger for the opposite
     * reason, its trigger being the whole control.
     */
    protected readonly panel = new PopoverController(this, {
      anchor: () => this.partNamed('field'),
      /* The surface *and* the trigger.
       *
       * A control is not always one element: the button that opens this panel is
       * part of it, and a press on it is not a press outside. Scoped to the
       * surface alone, `pointerdown` on the trigger closes the panel and the
       * trigger's own `toggleOpen` reopens it on the `click` that follows, so the
       * panel can never be closed by the button that opened it.
       * `DismissController` documents this failure and takes a list for it. */
      boundary: (): readonly (Element | null | undefined)[] => [
        this.partNamed('surface'),
        this.partNamed('trigger'),
      ],
      /* Wider than the four every other panel here takes. Those sit against a
         control the same width as themselves and read as an extension of it; this
         one is a picker of its own size hanging off a field, so the gap is what
         says the two are separate things rather than one control that grew. */
      offset: () => 8,
      onDismiss: () => this.requestOpen(false),
      onPlace: (_placement, room) => this.placed(room),
      open: () => this.open,
      placement: 'bottom-start',
      surface: () => this.partNamed('surface'),
    })

    /**
     * Told the panel has been placed, and how wide the window leaves it room to
     * be, in pixels.
     *
     * Nothing, unless a family fits what its panel holds to the room it has.
     */
    protected placed(_room: number | undefined): void {
      // A seam: Date Input shows one month where two do not fit.
    }

    /**
     * What the label points at and focus lands on.
     */
    protected get anchor(): HTMLElement | null {
      return this.control
    }

    /**
     * The text input, or `null` where there is no DOM to hold one.
     */
    protected get control(): HTMLInputElement | null {
      return this.partNamed<HTMLInputElement>('control')
    }

    /**
     * What the field shows, which is the value unless a family renders it.
     */
    protected get display(): string {
      return this.value
    }

    /**
     * Each answer the field holds, where it holds several.
     *
     * One answer by default, the value itself. Date Input and Time Input hold
     * several in `multiple` and `range`, and say so.
     */
    protected get answers(): readonly string[] | undefined {
      return undefined
    }

    /**
     * What is wrong with the value, in the reader's words, or nothing.
     */
    protected validate(): string {
      return ''
    }

    /**
     * Puts the field back where the answer differs from what was typed.
     *
     * `requestValue` is the mixin's, and it announces and decides; this is the
     * other half, which `Input` needs for the same reason: the native control has
     * already changed, so wherever the answer does not follow it, it has to be
     * restored. A refusal and a consumer who owns `value` and has not given a new
     * one are the same thing from here.
     */
    protected restore(): void {
      const control = this.control
      if (control && control.value !== this.display) {
        control.value = this.display
      }
      this.sync()
    }

    /**
     * Reports the value and the validity the host stands behind.
     *
     * The family's verdict first, where it has one, because the input is
     * `type="text"` and knows nothing about what it holds: `min` and `max` on a
     * text input do nothing, and the typed kind is what was given up to own the
     * picker. The platform's own verdict otherwise, copied rather than
     * recomputed, with the control as the anchor so a validity bubble points at
     * the text and not at the host.
     */
    protected sync(): void {
      const answers = this.answers
      if (answers === undefined) {
        this.internals.setFormValue(this.value)
      } else {
        reportValues(this.internals, this.name, answers)
      }
      const control = this.control
      if (!control) {
        return
      }
      const message = this.validate()
      if (message === '') {
        this.copyValidity(control)
      } else {
        this.internals.setValidity({ badInput: true }, message, control)
      }
      this.refreshFeedback()
    }

    /**
     * Escape shuts the panel without moving the value, Tab out of the text
     * shuts a panel the reader is passing, and ArrowDown in the text moves
     * into it.
     *
     * **Tab is for a reader moving through a form.** The panel opens when the
     * text is reached, which is `MixinPickerEditing`'s, and left open it added
     * its own controls to the Tab order: a reader passing a Date Input pressed
     * Tab five times for one field. Leaving the text by Tab closes it, so the
     * panel is reached by its trigger, which moves focus into it.
     */
    protected readonly handleKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && this.open) {
        event.stopPropagation()
        this.requestOpen(false)
        this.returnFocus()
        return
      }
      const fromText = event.composedPath()[0] === this.control
      if (event.key === 'Tab' && this.open && fromText) {
        this.requestOpen(false)
        return
      }
      /* Down from the text goes into the panel, opening it first where it is
         shut, which is what Alt+Down and Down do on the APG date picker
         combobox. A single line of text has nothing below the caret, so the key
         has no other meaning here. */
      if (event.key === 'ArrowDown' && fromText && !this.isDisabled) {
        event.preventDefault()
        if (this.open) {
          this.partNamed('picker')?.focus()
        } else {
          this.fromTrigger = true
          if (!this.requestOpen(true)) {
            this.fromTrigger = false
          }
        }
      }
    }

    /**
     * Escape pressed inside the panel, which `handleKeydown` never hears.
     *
     * A family binds `handleKeydown` on the field, and the surface is the
     * field's sibling, so a key pressed in the grid or the list went past it to
     * the document, where the dismissal closed the panel and left focus on a
     * cell that was no longer shown. Measured: focus fell to the body. Here the
     * key is taken on the host, and focus goes back to the text.
     */
    private readonly handleSurfaceKeydown = (event: KeyboardEvent): void => {
      const surface = this.partNamed('surface')
      if (
        event.key !== 'Escape' ||
        !this.open ||
        event.defaultPrevented ||
        !surface ||
        !event.composedPath().includes(surface)
      ) {
        return
      }
      event.stopPropagation()
      event.preventDefault()
      this.requestOpen(false)
      this.returnFocus()
    }

    /**
     * Closes the panel when focus leaves the whole control.
     *
     * Only for a move to somewhere else that can hold focus. Focus that goes
     * nowhere, which is a press on the panel's own padding or a hidden cell
     * giving it up, has no `relatedTarget`, and closing then would shut the
     * panel under a reader who pressed inside it.
     */
    private readonly handleFocusOut = (event: FocusEvent): void => {
      const to = event.relatedTarget
      if (!this.open || !(to instanceof Node)) {
        return
      }
      if (this.contains(to) || this.renderRoot?.contains?.(to)) {
        return
      }
      this.requestOpen(false)
    }

    /**
     * The text control's own `change`, which a reader's edit ends with, said
     * under the host's name.
     *
     * A native `change` is not composed, so it stops at this shadow root. The
     * families whose typing announces `input` alone send this one when the
     * reader is done, as `<input>` does.
     */
    protected readonly handleCommit = (event: Event): void => {
      event.stopPropagation()
      this.announceChange()
    }

    /** Whether the trigger opened the panel, so focus moves into the picker. */
    private fromTrigger = false

    /**
     * Enter in the text submits the form, as it does in a native text field.
     *
     * The text is in a shadow root and has no form owner, so the platform
     * never runs implicit submission for it. On `keypress`, where the platform
     * runs its own, so an Enter a family or a consumer prevented on `keydown`,
     * such as one that adds a date in `multiple`, submits nothing.
     */
    protected readonly handleKeypress = (event: KeyboardEvent): void => {
      if (event.key === 'Enter' && !event.defaultPrevented) {
        this.submitImplicitly()
      }
    }

    /** @internal A single line of text counts against implicit submission. */
    protected override get blocksImplicitSubmission(): boolean {
      return this.control !== null
    }

    /**
     * The trigger's press: opens the panel with focus in the picker, or closes
     * it.
     *
     * **Focus moves only when the trigger opened it**, which is what the APG
     * date picker dialog does: the panel is a dialog, and opening one from a
     * button takes focus into it. Measured before this: Enter on the trigger
     * left focus there, three Tab presses from the selected day. Focusing the
     * text opens the panel too, on the families that open on arrival, and
     * moving focus from there would take the caret from a reader who came to
     * type.
     */
    protected readonly handleTriggerClick = (): void => {
      this.fromTrigger = !this.open
      this.toggleOpen()
    }

    /**
     * Takes a value the reader picked in the panel, and says it is settled.
     */
    protected requestPicked(next: string): boolean {
      const taken = this.requestValue(next)
      if (taken && this.announcesInput) {
        this.announceChange()
      }
      return taken
    }

    override connectedCallback(): void {
      super.connectedCallback()
      this.addEventListener('keydown', this.handleSurfaceKeydown)
      this.addEventListener('focusout', this.handleFocusOut)
    }

    override disconnectedCallback(): void {
      super.disconnectedCallback()
      this.removeEventListener('keydown', this.handleSurfaceKeydown)
      this.removeEventListener('focusout', this.handleFocusOut)
    }

    /**
     * Whether this element is moving the focus itself, right now.
     *
     * Focus opens the panel on the families that open on arrival, so handing
     * focus back after a pick reopens the thing that was just answered.
     * `relatedTarget` was the guard and it is not enough on its own: it catches
     * a hand-off from the trigger, and it does not catch this, because the cell
     * or the option that had focus is gone by the time the caret moves and the
     * document has fallen back to something outside this element.
     *
     * **Reasoned in a browser and measured in the test runtime, and worth
     * saying which is which.** In a focused document: the reader presses a day,
     * the cell has focus, the panel is hidden, the browser moves focus off the
     * removed cell to the body, and the caret is then put back here with
     * `relatedTarget` pointing at the body, which is outside this element and
     * reads as an arrival. Every step is ordinary browser behavior, and none of
     * it can be driven from a browser pane, where `focus()` dispatches nothing
     * because the document is not focused. happy-dom is the exception, and it
     * is what the specs run under: it dispatches `focus` from `focus()`
     * synchronously and with no `relatedTarget`, measured on 20.11.2, so the
     * mixin's spec asks the hand-off directly, and two of its tests fail with
     * this guard removed.
     *
     * A flag rather than a better guess, because this element is the one moving
     * the focus and is the only thing that can know so. Cleared synchronously,
     * since `focus()` dispatches before it returns.
     */
    protected returning = false

    /**
     * Puts the caret back in the field without the field reopening the panel.
     *
     * The anchor rather than the text, which is the trigger where there is no
     * text: Color Input's swatch dropped focus to the body on Escape.
     */
    protected returnFocus(): void {
      this.returning = true
      this.anchor?.focus()
      this.returning = false
    }

    /** Puts the caret in the field, as clicking its label does. */
    override focus(options?: FocusOptions): void {
      this.anchor?.focus(options)
    }

    protected override firstUpdated(changed: PropertyValues): void {
      super.firstUpdated(changed)
      // Whatever the markup arrived with, so a form knows before anything is typed.
      this.sync()
    }

    protected override updated(changed: PropertyValues): void {
      super.updated(changed)
      /* After the panel is shown, which the controller does on this update. */
      if (changed.has('open')) {
        if (this.open && this.fromTrigger) {
          this.partNamed('picker')?.focus()
        }
        this.fromTrigger = false
      }
      /* Every update, not only the ones that name `value`.
         `value` is an accessor over `valueState ?? defaultValue`, so a consumer
         moving `default-value` on an untouched control moves what the form
         submits without ever putting `value` in the changed map, and the reported
         entry goes stale. Native `<input>` updates in exactly that case, which is
         the behavior the mixin's own notes take as the reference. */
      this.sync()
    }
  }

  /* Through `unknown`, for the reason `MixinField` gives: the protected members
     here and on the declared interface are two declarations of the same names,
     which TypeScript treats as incompatible, and making them public would put
     the wiring on the API page of every field that takes a picker. */
  return PickerFieldElement as unknown as Constructor<MixinPickerFieldInterface> & T
}
