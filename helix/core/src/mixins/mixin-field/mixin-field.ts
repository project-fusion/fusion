import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { HelixElement } from '../../helix-element/helix-element.js'
import { auditName } from '../../utils/audit-name/audit-name.js'
import { hostAria } from '../../utils/host-aria/host-aria.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/** Fixed ids, scoped to the shadow root that holds them. See the mixin's note. */
const HINT_ID = 'helix-hint'
const FEEDBACK_ID = 'helix-feedback'

/**
 * The public surface `MixinField` adds.
 *
 * Declared separately because TypeScript cannot emit declarations for an
 * anonymous class that has private members (TS4094). Casting the mixin's return
 * to this interface keeps the internals private and the build working.
 */
export declare class MixinFieldInterface {
  /**
   * Id the field's label points at, written by the control this wraps.
   *
   * The third fixed id and the only one this mixin does not render, the
   * control being the family's. See the note on the class member.
   */
  protected controlId: string

  /** The id the label carries, for an element in the template to be named by. */
  protected labelId: string

  /** Whether a label is drawn at all, in either shape. */
  protected get labeled(): boolean

  /** The element in the shadow root a reader lands on and hears the name of. */
  protected get namedControl(): HTMLElement | null

  /**
   * Help text shown under the control. A validation message replaces it.
   *
   * Fallback content for the `hint` slot, so anything richer replaces it.
   */
  hint: string

  /**
   * Id of the description node, for `aria-describedby` on the control.
   *
   * `undefined` when there is nothing to point at, so the attribute is absent
   * rather than pointing at an id that renders nothing.
   */
  readonly describedBy: string | undefined

  /**
   * `'true'` for `aria-invalid` on the control while a message is shown, and
   * `undefined` otherwise, so the attribute is absent.
   */
  readonly invalidity: 'true' | undefined

  /**
   * The validation message shown under the control. It replaces the browser's
   * message.
   *
   * Overrides the platform's message. Left empty, the platform's own is shown
   * once the reader has had a go at the field, never before. Either way it
   * takes the hint's place rather than appearing under it.
   */
  feedback: string

  /**
   * The field's label, which is also its accessible name. Content in the
   * `label` slot replaces it.
   *
   * Content rather than configuration, so it is the slot's fallback and never a
   * second thing rendered beside it.
   */
  label: string

  /**
   * Points the host at its own label and description nodes, for a group.
   *
   * Client only, and an enhancement rather than the whole story: a group's name
   * is also set as a plain string so the server can serve one, and this
   * overrides it where a consumer slotted something richer than a string.
   */
  protected linkHost(): void

  /** Help under the control, unless something has gone wrong. */
  protected renderHint(): TemplateResult | typeof nothing

  /** The validation message, in the hint's place. */
  protected renderFeedback(): TemplateResult | typeof nothing

  /** A label over a set, for a group, which has nothing to point `for` at. */
  protected renderGroupLabel(): TemplateResult | typeof nothing

  /** A label above the control, pointing at it with a real `for`. */
  protected renderLabel(): TemplateResult | typeof nothing

  /** Whether the field needs a value before the form can submit. */
  required: boolean

  /**
   * Re-reads the platform's verdict, for a control that has just reported one.
   *
   * Call it straight after `setValidity`. Nothing else can: validity changes
   * through `ElementInternals` rather than through a property, so no update is
   * scheduled for it and the message on screen would be the one from before.
   */
  protected refreshFeedback(): void

  /**
   * Reports "required and empty" against a rendered part, or clears it.
   *
   * `empty` is the control's own answer to whether it holds nothing, `message`
   * is what to say about it, and `anchor` names the part the browser should
   * point its bubble at.
   */
  protected reportRequired(empty: boolean, message: string, anchor: string): void

  /**
   * Hands on the verdict of a native control this renders, with the page's own
   * words where it gave some.
   */
  protected copyValidity(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): void

  /** The validation message shown: yours, the browser's, or none. */
  readonly resolvedFeedback: string

  /** The message shown when the field is required and empty. */
  valueMissingMessage: string | undefined
}

/**
 * Grafts a label, help text, and a validation message onto a control.
 *
 * **Over `HelixElement` rather than `HelixFormElement`, because not every
 * control that wants a label is form-associated.** A checkbox group is the
 * case: each box in it submits itself already, so the group deliberately
 * reports no value of its own, and every form-related member of
 * `ElementInternals` throws `NotSupportedError` on an element that is not
 * form-associated. Measured, and the ARIA members are fine on the same
 * element, which is why the naming and describing work there and only the
 * validity has to ask first.
 *
 * Every form control wants the same three things around it and wants them in a
 * different arrangement: a label above an input, beside a checkbox, and over a
 * group. So this owns the properties, the parts, and the wiring, and each
 * control places the nodes where its own geometry needs them. Same part names
 * either way, so one stylesheet in the styled tier dresses all of them.
 *
 * **Not a wrapping `Field` component, and that is not a style preference.** A
 * wrapper cannot name what it wraps. Its label would live in its own shadow
 * root and the control in another, and measured in Chrome 148: an
 * `aria-labelledby` IDREF cannot see across, and
 * `control.ariaLabelledByElements = [labelInTheWrapper]` reads back as zero
 * elements, the reference dropped. The same assignment with a label in the
 * control's own tree is kept. That pattern works in React libraries because
 * they have no shadow boundary; bringing it here brings the ergonomics and none
 * of the conditions that made it work.
 *
 * **A control whose label is its content renders its own.** A checkbox is named
 * by the words beside it, inside the `<label>` that forwards the press, so it
 * uses its default slot and nesting `renderLabel`'s `<label>` in there would be
 * invalid markup. `label` is that slot's fallback either way.
 *
 * Worth knowing, because it costs a label and gives no warning: **a
 * whitespace-only text node is assigned to the default slot and defeats its
 * fallback.** Measured in Chrome 148, and a newline between the tags is enough,
 * so `<helix-checkbox label="Accept">` closed on the next line renders no label
 * at all. A named slot does not have this problem, because `slot="label"` is an
 * attribute and a text node has none. It is the platform's behavior rather
 * than ours, and the same is already true of every slot fallback here.
 *
 * **The ids are fixed rather than generated.** IDREFs resolve within the tree
 * that holds them, so two controls on a page each carrying `helix-hint` in
 * their own shadow root do not collide. That also removes the usual hydration
 * hazard, since there is no generated value for a server and a client to
 * disagree about.
 *
 * **A group has to say it differently.** A control's `<input>` and its hint
 * are both in the shadow root, so a plain `aria-describedby` resolves. A
 * group's host is in the light DOM and its hint is not, so the IDREF cannot
 * reach and `element.ariaDescribedByElements` drops the reference. Only
 * `internals.ariaDescribedByElements` keeps it, which is what `describeHost`
 * uses. Measured the same way, and the failure is silent either way: the
 * description simply never reaches the accessibility tree.
 *
 * **The label, the hint and the feedback are documented on each component that
 * applies this, rather than here.** Declaring them once on this mixin is the
 * obvious fix and does not work: the analyzer reads `@csspart` off a custom
 * element class, so a class-level tag here reaches the manifest as nothing at
 * all, on this JSDoc and on the inner class alike. Measured both ways, and the
 * inner-class version is the dangerous one, since it satisfies the rule while
 * every API page stays exactly as wrong as before. Members are different and
 * do inherit, which is what the note about the inner class in the area rules
 * is about. `:state(invalid)` is listed the same way, as a `@cssstate` on each
 * component, for the same reason.
 */
export const MixinField = <T extends Constructor<HelixElement>>(Base: T) => {
  // JSDoc is duplicated from MixinFieldInterface deliberately. The interface is
  // what TypeScript consumers see; this class is what the manifest analyzer
  // reads when resolving inherited members into dependent packages.
  class FieldElement extends Base {
    /**
     * Id the field's label points at, written by the control this wraps.
     *
     * `renderLabel` emits the `for` and the family renders the `id`, so the
     * two ends of one IDREF sat in two packages as a pair of literals with
     * nothing holding them together: eleven templates wrote `id="control"`,
     * two wrote a second `for="control"` of their own, and a family that
     * spelled either differently got a `<label for>` resolving to nothing.
     * That failure is silent in the way the area rules describe for a
     * `[part=]` naming a part nobody renders: no error, no warning, and a
     * label that has stopped focusing its field.
     *
     * A member rather than a module constant, which is what the anchor
     * argument for `reportRequired` already settled one level down: the name
     * belongs to the control the family renders, so the family has to be able
     * to read it, and `HINT_ID` and `FEEDBACK_ID` stay private because this
     * mixin renders both of those itself.
     */
    protected controlId = 'control'

    /**
     * The id the label carries, for an element in the template to be named by.
     *
     * **What a template draws is not the host**, which is what `hostAria`
     * names: a rating's radiogroup, a pin input's row of cells, a listbox's
     * list and a range slider's two thumbs are elements of their own, and they
     * had no name but a `label` string, or none at all. In the same tree as
     * the label, so a plain `aria-labelledby` resolves, and it names them by
     * whatever the label holds, a slotted one included. One id for both shapes,
     * since a family draws one or the other.
     */
    protected labelId = 'label'

    /**
     * @internal The host's `aria-label`, observed so a new one renders.
     *
     * **An `aria-label` is read when the field renders, and nothing else would
     * render it again.** It is the platform's attribute and no property of this
     * element's, so writing a new one scheduled no update and the label kept
     * the old words. Data Table meets this on every column move: each row's
     * checkbox is named by the first column, so reordering renames every one.
     *
     * A reactive property on the attribute, which is the one way Lit observes
     * one. Overriding `observedAttributes` in a mixin compiled `this` to the
     * mixin's own class, so every field observed only this mixin's attributes
     * and dropped its own. Not reflected: the attribute is the consumer's.
     */
    @property({ attribute: 'aria-label' })
    protected namedBy: string | null = null

    /**
     * @internal The element in the shadow root a reader lands on and hears
     * the name of, which the check for a missing name reads: the control the
     * label points at, or the first native control drawn.
     *
     * A family whose name sits on an element of its own, a row of cells or a
     * set of stars, answers with that element, so the name of one cell does
     * not count as the name of the row.
     */
    protected get namedControl(): HTMLElement | null {
      return (
        this.renderRoot?.querySelector<HTMLElement>(`#${this.controlId}`) ??
        this.renderRoot?.querySelector<HTMLElement>('input, button, select, textarea') ??
        null
      )
    }

    /** Whether a label is drawn at all, in either shape. */
    protected get labeled(): boolean {
      return (
        this.label !== '' ||
        Boolean(this.getAttribute('aria-label')) ||
        this.filledSlots.has('label')
      )
    }

    /**
     * The named slots a consumer has put content in, among `label` and `hint`.
     *
     * **Asked of the slot, because the property cannot answer.** A label or a
     * hint is drawn only when there is something in it, and slotted content
     * changes no property, so a field given `<span slot="label">` and no
     * `label` drew no label at all and its control went unnamed. With nothing
     * else to show, each renders a bare slot, which takes no box, and the slot
     * reports what arrives in it.
     */
    @state()
    private filledSlots = new Set<string>()

    /**
     * Records whether the `label` or `hint` slot has content, which moves it
     * into its part.
     *
     * On the render root, so the binding leaves the served markup as it was.
     */
    private readonly noteSlotted = (event: Event): void => {
      const slot = event.target as HTMLSlotElement
      if (slot.name !== 'label' && slot.name !== 'hint') {
        return
      }
      const filled = slot.assignedNodes().length > 0
      if (filled !== this.filledSlots.has(slot.name)) {
        const next = new Set(this.filledSlots)
        next[filled ? 'add' : 'delete'](slot.name)
        this.filledSlots = next
      }
    }

    /** A slot with no part around it, for content that may arrive. */
    private bareSlot(name: 'hint' | 'label'): TemplateResult {
      return name === 'label' ? html`<slot name="label"></slot>` : html`<slot name="hint"></slot>`
    }

    /** @internal `feedback` marks a form-associated field invalid, so it does not submit. */
    protected get validityFeedback(): string {
      return this.validates ? this.feedback : ''
    }

    /**
     * The validation message shown under the control. It replaces the
     * browser's message.
     */
    @property()
    feedback = ''

    /**
     * Help text shown under the control. A validation message replaces it.
     */
    @property()
    hint = ''

    /**
     * The field's label, which is also its accessible name. Content in the
     * `label` slot replaces it.
     */
    @property()
    label = ''

    /**
     * Whether the field needs a value before the form can submit.
     */
    @property({ reflect: true, type: Boolean })
    required = false

    /**
     * The message shown when the field is required and empty.
     *
     * **Absent, or empty, is the control's own sentence**, "Choose one to continue." on a
     * set and the browser's own on a text field, which the browser writes in
     * the reader's language. Every other word a control speaks is a property,
     * and this one was the English a form in another language still spoke in
     * the bubble it raises on submit: `feedback` replaces the message under
     * the field and does not reach that one.
     */
    @property({ attribute: 'value-missing-message' })
    valueMissingMessage?: string

    /**
     * Whether the reader has had a go at the field yet.
     *
     * **Not `:user-invalid`**, which is the platform's own answer to "is this
     * field wrong *yet*" and cannot work here, for a structural reason rather
     * than a browser bug: it tracks interaction with the element it is on, and
     * nobody interacts with this element. The reader types into an `<input>`
     * inside its shadow root, so the host's interaction flag is never set and
     * the selector never matches. Measured after submitting an invalid required
     * field and again after editing one and leaving it: false both times, while
     * `:invalid` matched both times.
     *
     * So the moments are listened for instead, and both of them demonstrably
     * reach the host: `invalid` when a form is submitted with this control
     * failing, and `change` when the reader has edited and committed. Focus
     * alone is deliberately not one of them. Tabbing past an empty required
     * field should not be answered with an error.
     *
     * **A composite control has to construct its own `change`, and this mixin
     * deliberately does not do it for them.** A native `change` is
     * `composed: false`, so a control built from several inner inputs never
     * relays one to its host: `Input` gets this free from its one control,
     * while a `PinInput` of four boxes has no inner `change` that means the
     * code is entered, so a half-entered code is never `touched` and can never
     * say what is wrong with it.
     *
     * **The obvious shared fix is for `touched` to take a `focusout`, and it is
     * the wrong one**, because it is the paragraph above undone: a `focusout`
     * fires on the reader who tabbed past and typed nothing, which is exactly
     * the case this refuses to call an error. What a composite needs is not a
     * focus moment, it is the native meaning of `change`, "edited, then left",
     * and the editing half is the part a mixin up here cannot see.
     *
     * **Nor is there one shape to extract yet.** The two composites solve it
     * differently and both are right: `PinInput` is focus-driven, taking a
     * baseline when focus arrives from outside the row and announcing on the
     * way out if it moved, and `DateInput` is value-driven, stopping its inner
     * `change` and announcing once the date itself moves. Only one of them has
     * a leaving moment at all, so generalizing from the pair is generalizing
     * from one. The trigger for lifting it is a third control that needs the
     * focus-driven shape, at which point what moves up is the
     * baseline-and-commit pair rather than `touched`.
     */
    @state()
    private touched = false

    /**
     * Whether this element may be asked about its own validity at all.
     *
     * Reading the static the platform itself reads to decide, rather than
     * probing: `validity` and `validationMessage` throw `NotSupportedError` on
     * an element that is not form-associated, and a group whose members each
     * submit themselves is not. Such a control still shows a message, it just
     * has to be given one.
     */
    private get validates(): boolean {
      return (this.constructor as { formAssociated?: boolean }).formAssociated === true
    }

    /**
     * @internal The message actually shown: the consumer's, or the platform's,
     * or none. Wiring a field does to itself, read by its own template. A
     * consumer sets `feedback` and reads validity from the platform.
     */
    get resolvedFeedback(): string {
      if (this.feedback !== '') {
        return this.feedback
      }
      if (!this.validates || !this.touched || this.internals.validity.valid) {
        return ''
      }
      return this.internals.validationMessage
    }

    /**
     * @internal Id of the description node, for `aria-describedby` on the
     * control. Written by the field's own template into its own shadow root.
     *
     * One at a time, because only one of the two is ever rendered. Naming both
     * would point a screen reader at an id that resolves to nothing, which it
     * reads as a description it cannot find.
     */
    get describedBy(): string | undefined {
      if (this.resolvedFeedback !== '') {
        return FEEDBACK_ID
      }
      return this.hint === '' && !this.filledSlots.has('hint') ? undefined : HINT_ID
    }

    /**
     * @internal `aria-invalid` for the control, bound beside `describedBy` in
     * the field's own template.
     *
     * **On the control, because the control is what a screen reader is on.**
     * `ariaInvalid` on the host's internals reaches a host that has a role of
     * its own, a group or a radiogroup, and nothing else: read from Chromium's
     * tree, an Input showing "Too short" was a textbox reporting `invalid:
     * false`, described by its message. A reader heard the message as though it
     * were a hint. Bound in the template, so a server that renders a field
     * already failing sends it failing.
     */
    get invalidity(): 'true' | undefined {
      return this.resolvedFeedback === '' ? undefined : 'true'
    }

    /**
     * A label over a set rather than beside a control.
     *
     * A plain element and not a `<label for>`, because a group is not a single
     * control and there is nothing for `for` to point at. What names the group
     * is `linkHost`, pointing the host's internals at this element.
     */
    protected renderGroupLabel(): TemplateResult | typeof nothing {
      /* A set names itself through `hostAria`, so an `aria-label` here already
         reaches the group. The label is still rendered and clipped, because
         `renderGroupLabel` is what the styled tier lays out and a group that
         drew nothing would collapse its own first row. */
      const hidden = this.label === '' ? this.getAttribute('aria-label') : null
      if (this.label === '' && !hidden && !this.filledSlots.has('label')) {
        return this.bareSlot('label')
      }
      return html`<span part="label" id=${this.labelId} ?data-hidden=${hidden !== null}
        ><slot name="label">${this.label || hidden}</slot></span
      >`
    }

    /**
     * A label above the control, pointing at it.
     *
     * A real `<label for>`, so pressing the words focuses the field and the
     * browser does the forwarding. It resolves because `for` looks within the
     * same tree, and the control it names is in this shadow root.
     *
     * **Nothing at all when there is no label**, which is the same rule the
     * hint and the feedback follow: none of the three is always used, and an
     * element rendered empty is not free. It still generates a box, so it still
     * takes a row of the grid and a gap on either side of it, which is a field
     * that has moved down the page for a label nobody wrote. `nothing` leaves
     * comment markers rather than a node, so the gap has nothing to sit between.
     *
     * **`aria-label` names without showing**, and it is forwarded rather than
     * left where the consumer put it. A custom element has no way to delegate a
     * label to the control inside it, so an `aria-label` on the host reaches
     * nothing: measured, the inner input came back with no label and no name of
     * its own while the attribute sat on the wrapper. What happens instead is
     * that the label is rendered and clipped, so the name arrives through the
     * same `<label for>` a visible one does.
     *
     * The rule is that `label` means a label, `aria-label` means a name, and
     * neither means an unnamed field a screen reader announces as "edit text".
     */
    protected renderLabel(): TemplateResult | typeof nothing {
      const hidden = this.label === '' ? this.getAttribute('aria-label') : null
      if (this.label === '' && !hidden && !this.filledSlots.has('label')) {
        return this.bareSlot('label')
      }
      return html`<label
        part="label"
        for=${this.controlId}
        id=${this.labelId}
        ?data-hidden=${hidden !== null}
        ><slot name="label">${this.label || hidden}</slot></label
      >`
    }

    /**
     * Help under the control, unless something has gone wrong.
     *
     * The two share a place rather than stacking, so a field is one line of
     * small text either way and nothing below it moves when the message
     * changes. What the reader needs at that moment is what is wrong, and a
     * hint that survives the error it describes is a second line to read before
     * getting to the one that matters.
     */
    protected renderHint(): TemplateResult | typeof nothing {
      if (this.resolvedFeedback !== '') {
        return nothing
      }
      if (this.hint === '' && !this.filledSlots.has('hint')) {
        return this.bareSlot('hint')
      }
      return html`<p part="hint" id=${HINT_ID}
        ><slot name="hint">${this.hint}</slot></p
      >`
    }

    /**
     * The validation message, in the hint's place.
     *
     * `role="alert"` rather than a live region on the whole field, so what is
     * announced is the message and not the label and help along with it.
     */
    protected renderFeedback(): TemplateResult | typeof nothing {
      const message = this.resolvedFeedback
      if (message === '') {
        return nothing
      }
      return html`<p part="feedback" id=${FEEDBACK_ID} role="alert">
        <slot name="feedback">${message}</slot>
      </p>`
    }

    /**
     * Points the host at its own label and description nodes, for a group.
     *
     * A control's `<input>` and its hint are both in the shadow root, so a
     * plain `aria-describedby` resolves between them. A group's host is in the
     * light DOM and its hint is not, so the IDREF cannot reach and
     * `element.ariaDescribedByElements` drops the reference outright. Only the
     * `ElementInternals` form keeps it, measured in Chrome 148: two of two
     * kept through internals, zero of one through the element.
     *
     * Client only, and deliberately, because element references need the nodes
     * to exist and on the server they do not. The name is therefore also set as
     * a plain string by the component, which a server can write, and the
     * reference here overrides it wherever a consumer slotted something richer
     * than a string. A group with only a property for a label reads the same
     * either way.
     */
    protected linkHost(): void {
      const label = this.partNamed('label')
      hostAria(this.internals, {
        describedBy: [HINT_ID, FEEDBACK_ID]
          .map((id) => this.renderRoot.querySelector(`#${id}`))
          .filter((node): node is Element => node !== null),
        labelledBy: label ? [label] : [],
      })
    }

    /** What the last render put on screen, so a change can be noticed. */
    private shownFeedback = ''

    /**
     * Re-reads the platform's verdict, for a control that has just reported one.
     *
     * Validity changes through `ElementInternals` rather than through a
     * property, so nothing schedules an update for it. Worse, the order is
     * against us: this mixin sits above the control in the prototype chain, so
     * its `updated` runs before the control's own, which is where `setValidity`
     * is called. Reading the verdict here would always read the previous one,
     * which is what left a corrected field still showing the error it had
     * before. So the control says when it has reported, and this schedules the
     * one further update that needs. It converges because the second pass finds
     * nothing changed.
     */
    protected refreshFeedback(): void {
      const next = this.resolvedFeedback
      if (next !== this.shownFeedback) {
        this.shownFeedback = next
        this.requestUpdate()
      }
    }

    /**
     * Reports "required and empty" and refreshes the message, or clears both.
     *
     * Two things differ between the controls that call this, so those are the
     * arguments: whether the control is empty, which only it can say, and the
     * sentence to say about it, which is different for a box, a switch and a
     * set. The anchor is looked up here because every one of them anchors on a
     * rendered part and the browser needs somewhere to point the bubble.
     *
     * The message is not derived from the control's kind, deliberately. "Tick
     * this box" and "Choose one" are not the same instruction and a lookup
     * table would be one more thing to keep in step with the components.
     */
    protected reportRequired(empty: boolean, message: string, anchor: string): void {
      if (this.required && empty) {
        this.internals.setValidity(
          { valueMissing: true },
          this.valueMissingMessage || message,
          this.partNamed(anchor) ?? undefined,
        )
      } else {
        this.internals.setValidity({})
      }
      // Straight after, because validity moved without any property moving.
      this.refreshFeedback()
    }

    /**
     * Hands on the verdict of a native control this renders, with the page's
     * own words where it gave some.
     *
     * The browser's message otherwise, which is already in the reader's
     * language, anchored on the control so the bubble points at the text and
     * not at the host. The seven families that copy a native verdict each
     * wrote this line, and none of them could be told what to say.
     */
    protected copyValidity(
      control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    ): void {
      /* An empty sentence is no sentence: the page has not said anything, and
         a verdict with a flag and no words is one `setValidity` refuses. */
      const message =
        control.validity.valueMissing && this.valueMissingMessage
          ? this.valueMissingMessage
          : control.validationMessage
      this.internals.setValidity(control.validity, message, control)
    }

    /**
     * Records "wrong, and the reader knows it" as the custom state `invalid`.
     *
     * The styled tier selects on this rather than on `:host(:user-invalid)`,
     * which cannot match for the reason above. One state, and the message and
     * the border agree by construction.
     *
     * **A state and not `data-invalid`.** A field served with a `feedback`
     * message already failing is written invalid on its first update, which
     * would be an attribute the consumer's server never sent.
     * `HelixElement.toggleState` carries the argument.
     *
     * In `willUpdate`, which is where the resolved message is first known.
     */
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed)
      this.shownFeedback = this.resolvedFeedback
      this.toggleState('invalid', this.shownFeedback !== '')
      /* And say it to the accessibility tree. Describing a field with its
       * `feedback` message through `aria-describedby` never announces it as
       * being *wrong*: a reader hears the message as though it were help text.
       * `aria-invalid` is the one word for it, and this is the one place that
       * knows, so every field in the library gets it from here. */
      this.internals.ariaInvalid = this.shownFeedback === '' ? null : 'true'
    }

    /**
     * Clears the record of the user's edits along with the value, so the field
     * shows no error until they edit it again.
     *
     * Through the base's prototype rather than `super`, because the base this
     * grafts onto is any element and only a form element has the hook.
     */
    formResetCallback(): void {
      ;(Base.prototype as { formResetCallback?: () => void }).formResetCallback?.call(this)
      this.touched = false
    }

    /**
     * The two moments a field becomes wrong, neither of which is a property
     * change, so nothing else would schedule an update for them.
     *
     * In `firstUpdated` rather than `connectedCallback`, which SSR never calls.
     */
    protected override firstUpdated(changed: PropertyValues): void {
      super.firstUpdated(changed)
      const touch = (): void => {
        this.touched = true
      }
      this.addEventListener('invalid', touch)
      this.addEventListener('change', touch)
      this.renderRoot.addEventListener('slotchange', this.noteSlotted)
      /* **Every field is asked whether it is named**, once it has rendered,
         and told so through the runtime channel when it is not. The control is
         the element the label points at, and a group, which has none, is named
         by its label or by its host. The `value` part, where a field shows its
         value or its placeholder, names nothing. */
      auditName(
        this,
        () => this.namedControl,
        'Give it a `label`, an `aria-label`, words in its label, or a `<label for>` that names it.',
        () =>
          this.labeled ||
          [...this.children].some(
            (child) => child.slot === 'label' && (child.textContent ?? '').trim() !== '',
          ),
        () => this.partNamed('value'),
      )
    }
  }

  /* Through `unknown`, which the protected members make necessary: TypeScript
     treats two protected members as compatible only when they come from the
     same declaration, and these come from two, the class here and the declared
     interface above. Making them public would type-check without a word and put
     five render helpers on the public API page of every form control, which is
     what the interface exists to prevent.

     The contract is enforced by use rather than by the cast. Every helper is
     called from `Input` or `Checkbox`, so an interface that drifts from the
     class fails their builds. */
  return FieldElement as unknown as Constructor<MixinFieldInterface> & T
}
