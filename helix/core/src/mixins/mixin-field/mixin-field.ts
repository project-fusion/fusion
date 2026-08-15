import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { HelixElement } from '../../helix-element/helix-element.js'
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
   * Help under the control, shown while there is nothing wrong.
   *
   * Fallback content for the `hint` slot, so anything richer replaces it.
   */
  hint: string

  /**
   * Ids of the description nodes, for `aria-describedby` on the control.
   *
   * `undefined` when there is nothing to point at, so the attribute is absent
   * rather than pointing at an id that renders nothing.
   */
  readonly describedBy: string | undefined

  /**
   * What is wrong, in the reader's words rather than the browser's.
   *
   * Overrides the platform's message. Left empty, the platform's own is shown
   * once the reader has had a go at the field, never before. Either way it
   * takes the hint's place rather than appearing under it.
   */
  feedback: string

  /**
   * Whether the label names the control without being shown.
   *
   * For a field whose purpose is already obvious from where it sits: a filter
   * over the list it filters, a search box under a magnifier. The label is
   * still rendered and still read, it is only taken off the screen, which is
   * the difference between a control a screen reader can name and one it
   * cannot.
   */
  hideLabel: boolean

  /**
   * The accessible name, and the fallback for the `label` slot.
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

  /** Whether the form refuses to submit without it. */
  required: boolean

  /**
   * Re-reads the platform's verdict, for a control that has just reported one.
   *
   * Call it straight after `setValidity`. Nothing else can: validity changes
   * through `ElementInternals` rather than through a property, so no update is
   * scheduled for it and the message on screen would be the one from before.
   */
  protected refreshFeedback(): void

  /** The message actually shown: the consumer's, or the platform's, or none. */
  readonly resolvedFeedback: string
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
 * attribute and a text node has none. It is the platform's behaviour rather
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
 */
export const MixinField = <T extends Constructor<HelixElement>>(Base: T) => {
  // JSDoc is duplicated from MixinFieldInterface deliberately. The interface is
  // what TypeScript consumers see; this class is what the manifest analyzer
  // reads when resolving inherited members into dependent packages.
  class FieldElement extends Base {
    /** Help under the control, shown while there is nothing wrong. */
    @property()
    hint = ''

    /** What is wrong, in the reader's words rather than the browser's. */
    @property()
    feedback = ''

    /** Whether the label names the control without being shown. */
    @property({ attribute: 'hide-label', reflect: true, type: Boolean })
    hideLabel = false

    /** The accessible name, and the fallback for the `label` slot. */
    @property()
    label = ''

    /** Whether the form refuses to submit without it. */
    @property({ reflect: true, type: Boolean })
    required = false

    /**
     * Whether the reader has had a go at the field yet.
     *
     * This was `:user-invalid`, which is the platform's own answer to "is this
     * field wrong *yet*" and is the right idea. It does not work here, and the
     * reason is structural rather than a browser bug: `:user-invalid` tracks
     * interaction with the element it is on, and nobody interacts with this
     * element. The reader types into an `<input>` inside its shadow root, so
     * the host's interaction flag is never set and the selector never matches.
     * Measured after submitting an invalid required field and again after
     * editing one and leaving it: false both times, while `:invalid` matched
     * both times.
     *
     * So the moments are listened for instead, and both of them demonstrably
     * reach the host: `invalid` when a form is submitted with this control
     * failing, and `change` when the reader has edited and committed. Focus
     * alone is deliberately not one of them. Tabbing past an empty required
     * field should not be answered with an error.
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

    /** The message actually shown: the consumer's, or the platform's, or none. */
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
     * Id of the description node, for `aria-describedby` on the control.
     *
     * One at a time, because only one of the two is ever rendered. Naming both
     * would point a screen reader at an id that resolves to nothing, which it
     * reads as a description it cannot find.
     */
    get describedBy(): string | undefined {
      if (this.resolvedFeedback !== '') {
        return FEEDBACK_ID
      }
      return this.hint === '' ? undefined : HINT_ID
    }

    /**
     * A label over a set rather than beside a control.
     *
     * A plain element and not a `<label for>`, because a group is not a single
     * control and there is nothing for `for` to point at. What names the group
     * is `linkHost`, pointing the host's internals at this element.
     */
    protected renderGroupLabel(): TemplateResult | typeof nothing {
      if (this.label === '') {
        return nothing
      }
      return html`<span part="label"><slot name="label">${this.label}</slot></span>`
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
     * Naming a control without showing the label is `hide-label`, not an empty
     * one: an unnamed field is a field a screen reader announces as "edit text".
     */
    protected renderLabel(): TemplateResult | typeof nothing {
      if (this.label === '') {
        return nothing
      }
      return html`<label part="label" for="control"><slot name="label">${this.label}</slot></label>`
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
      if (this.hint === '' || this.resolvedFeedback !== '') {
        return nothing
      }
      return html`<p part="hint" id=${HINT_ID}><slot name="hint">${this.hint}</slot></p>`
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
      const label = this.renderRoot.querySelector('[part="label"]')
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
     * Mirrors "wrong, and the reader knows it" onto the host as `data-invalid`.
     *
     * The styled tier selects on this rather than on `:host(:user-invalid)`,
     * which cannot match for the reason above, so the invalid border never
     * arrived either. One state, and the message and the border agree by
     * construction.
     *
     * In `willUpdate` rather than `connectedCallback`, which SSR never calls.
     */
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed)
      this.shownFeedback = this.resolvedFeedback
      this.toggleAttribute('data-invalid', this.shownFeedback !== '')
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
     class fails their builds, which is exactly how the missing declarations
     were found. */
  return FieldElement as unknown as Constructor<MixinFieldInterface> & T
}
