import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { HelixFormElement } from '../../helix-form-element/helix-form-element.js'

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
   * Points the host at its own description nodes, for a group.
   *
   * Client only. A group's name can be served; its description cannot, because
   * element references need the nodes to exist.
   */
  protected describeHost(): void

  /** Help under the control, unless something has gone wrong. */
  protected renderHint(): TemplateResult | typeof nothing

  /** The validation message, in the hint's place. */
  protected renderFeedback(): TemplateResult | typeof nothing

  /** A label above the control, pointing at it with a real `for`. */
  protected renderLabel(): TemplateResult | typeof nothing

  /** Whether the form refuses to submit without it. */
  required: boolean

  /** The message actually shown: the consumer's, or the platform's, or none. */
  readonly resolvedFeedback: string
}

/**
 * Grafts a label, help text, and a validation message onto a form control.
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
export const MixinField = <T extends Constructor<HelixFormElement>>(Base: T) => {
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
     * Whether the reader has been given a chance to get it wrong.
     *
     * `:user-invalid` is the platform's answer to "is this field wrong *yet*",
     * and it is the whole reason an empty required field is not shouted at
     * before anyone has reached it.
     */
    @state()
    private userInvalid = false

    /** The message actually shown: the consumer's, or the platform's, or none. */
    get resolvedFeedback(): string {
      if (this.feedback !== '') {
        return this.feedback
      }
      return this.userInvalid ? this.internals.validationMessage : ''
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
     * Points the host at its own description nodes, for a group.
     *
     * Client only, and deliberately: `ElementInternals` element references need
     * the nodes to exist, and on the server they do not. A group's accessible
     * description is therefore an enhancement, while its name is not, because
     * that is an attribute the server can write.
     */
    protected describeHost(): void {
      const described = [HINT_ID, FEEDBACK_ID]
        .map((id) => this.renderRoot.querySelector(`#${id}`))
        .filter((node): node is Element => node !== null)
      this.internals.ariaDescribedByElements = described.length > 0 ? described : null
    }

    /**
     * Re-reads the platform's verdict after every update.
     *
     * `:user-invalid` changes without anything here changing: the reader blurs
     * a bad field, or submits and the form marks every control at once. Read in
     * `updated` and written to state, so a change schedules exactly one more
     * update and settles, rather than looping.
     */
    protected override updated(changed: PropertyValues): void {
      super.updated(changed)
      const invalid = this.matches(':user-invalid')
      if (invalid !== this.userInvalid) {
        this.userInvalid = invalid
      }
    }

    /**
     * The moments the platform decides, which no property change announces.
     *
     * `invalid` fires at submission for every control that fails. `blur` is
     * when a field the reader has left becomes `:user-invalid`. In
     * `firstUpdated` rather than `connectedCallback`, which SSR never calls.
     */
    protected override firstUpdated(changed: PropertyValues): void {
      super.firstUpdated(changed)
      this.addEventListener('invalid', () => this.requestUpdate())
      this.addEventListener('blur', () => this.requestUpdate())
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
