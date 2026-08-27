import { property } from 'lit/decorators.js'
import { HelixBeforeChangeEvent } from '../../events/events.js'
import type { HelixFormElement } from '../../helix-form-element/helix-form-element.js'
import { requestChange } from '../../utils/request-change/request-change.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/**
 * The public surface `MixinControllerValue` adds.
 *
 * Declared separately because TypeScript cannot emit declarations for an
 * anonymous class that has private members (TS4094).
 */
export declare class MixinControllerValueInterface {
  /**
   * The value the markup declared, which is where a reset returns to.
   *
   * Separate from `value`, which is where the control is now, and gone from the
   * reader's view the moment they change anything.
   */
  defaultValue: string

  /**
   * What the control holds now, and what its form submits.
   *
   * Reading gives the real value, in either mode. Writing hands ownership to
   * the consumer: from then on the control announces changes and applies none
   * of them, and waits to be told.
   */
  value: string

  /**
   * Whether every edit is announced, rather than every settled value.
   *
   * A control the reader types or drags in moves continuously, and the platform
   * calls that `input`: `<input type="text">` fires one per keystroke and fires
   * `change` once, on commit. Five controls here are that shape, and the rest
   * change in discrete steps where a step *is* the change.
   *
   * It selects the event rather than the timing. `requestValue` is called
   * whenever the value moves either way; this decides whether the control sends
   * `input` alone or `input` and `change` together, so a consumer can read the
   * name and know how often to expect it.
   */
  protected readonly announcesInput: boolean

  /** Requests a new value, and reports whether the request stood. */

  requestValue(next: string): boolean

  /** Returns the control to the value its markup declared. */
  formResetCallback(): void

  /** Restores the value when the browser brings a form back. */
  formStateRestoreCallback(state: string | null): void
}

/**
 * Grafts `value`, `defaultValue`, and the two callbacks that answer a form.
 *
 * Every control with a value had written this, and by the third it was three
 * copies of the same four members and the same seeding rule: `Input`, then
 * `Toggle.Group`, then `Radio.Group`. The copies had not diverged, which is the
 * argument for the mixin rather than against it, because the next one would
 * have.
 *
 * **Seeded in `willUpdate`, not `connectedCallback`.** SSR never calls the
 * latter, so a control with a `default-value` would serve empty and fill itself
 * at hydration, which is a flash for a reader and a mismatch for React. Seeding
 * once, before the first render, is what makes the server and the client agree.
 *
 * **What it does not own is reporting.** `setFormValue` stays with the
 * component, because what an empty value means is the component's business: a
 * text field submits its emptiness, since `""` is an answer and the field was
 * on the form, while a group with nothing chosen submits nothing at all. One
 * mixin cannot hold both without a flag, and a flag would be this rule written
 * down twice.
 *
 * `Checkbox` deliberately does not take this. Its `value` is what it submits
 * *when it is on* rather than what it holds, so it is configuration rather than
 * state, and the state it does have is `checked`, which is
 * `MixinControllerChecked`'s.
 */
export const MixinControllerValue = <T extends Constructor<HelixFormElement>>(Base: T) => {
  // JSDoc is duplicated from the interface deliberately. The interface is what
  // TypeScript consumers see; this class is what the manifest analyzer reads
  // when resolving inherited members into dependent packages.
  class ValueElement extends Base {
    /** The value the markup declared, which is where a reset returns to. */
    @property({ attribute: 'default-value' })
    defaultValue = ''

    /**
     * What the control holds now, and what its form submits.
     *
     * One property, not two. Reading gives the real value whichever mode the
     * control is in, so `input.value` answers the question anyone asking it
     * meant. Writing hands ownership to the consumer, which is what
     * `<helix-input value="x">` says too, and matches what a controlled input
     * means in React: the value is theirs and the control waits to be told.
     * `default-value` is how markup seeds one it does not want to own.
     *
     * The same shape as the other three mixins, which is the point of them
     * being four of a kind rather than four of three kinds.
     *
     * helix-input
     */
    @property()
    get value(): string {
      return this.valueState ?? this.defaultValue
    }

    set value(next: string) {
      const previous = this.value
      this.valueState = next
      this.requestUpdate('value', previous)
    }

    /**
     * The state, whoever set it, and `undefined` until somebody has.
     *
     * One field and not two. Writing always applies, the way a native control
     * does when a script assigns to it.
     */
    private valueState: string | undefined = undefined

    /**
     * Whether a reader edits this continuously, which decides the native name.
     *
     * **It used to pick between `helix-input` and `helix-change`**, which was
     * one mechanism under two names and said *phase* where it meant
     * *granularity*. The request event is `helix-before-change` whatever the
     * answer; this decides which native event announces the result, `input`
     * while a reader is editing against `change` when they are done, which is
     * the distinction the platform already draws. See 294.
     *
     * Discrete by default: only a control the reader edits continuously says
     * otherwise.
     */
    protected readonly announcesInput: boolean = false

    /**
     * Announces the applied value under the platform's own name.
     *
     * **After `apply`, never before**, which is the whole reason this is
     * separate from the request event: a native handler reads
     * `event.target.value`, and it has to be the value that was just applied.
     *
     * **Both, for a discrete control, because that is what the platform does.**
     * A native `<select>` sends `input` and then `change` from one choice: the
     * value moved, and the reader is also done. A continuous control announces
     * `input` here and relays `change` from its inner control when the reader
     * is done, so the pair keeps the platform's timings rather than reporting a
     * commit on every keystroke.
     */
    private announceNatively(): void {
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
      if (!this.announcesInput) {
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      }
    }

    /**
     * Requests a new value, and reports whether the request stood.
     *
     * Announces before it acts, so `preventDefault()` on the `helix-before-change` is
     * a refusal and nothing moves. Nobody refusing means the control updates
     * itself, whether or not a consumer declared `value`: a declared property
     * is a seed and a correction, the way `<input value>` is, and a consumer
     * who wants the change for themselves refuses it and assigns their own.
     * See 294.
     */
    requestValue(next: string): boolean {
      if (this.value === next) {
        return true
      }
      const applied = requestChange({
        apply: (value) => {
          const previous = this.value
          this.valueState = value
          this.requestUpdate('value', previous)
        },
        event: (value) => new HelixBeforeChangeEvent({ property: 'value', value }),
        host: this,
        next,
      })
      if (applied) {
        this.announceNatively()
      }
      return applied
    }

    /**
     * Returns the control to the value its markup declared.
     *
     * Both halves are dropped, the consumer's and the control's, because a
     * reset means the form is as it was served. Clearing only the internal one
     * would leave a control that had been written to stuck at that value.
     */
    formResetCallback(): void {
      const previous = this.value
      this.valueState = undefined
      this.requestUpdate('value', previous)
    }

    /**
     * Restores the value when the browser brings a form back.
     *
     * Falling back to `defaultValue` rather than to empty, because a restore
     * with no state is a form the browser has nothing recorded for, which is
     * the same situation as a fresh one.
     */
    formStateRestoreCallback(state: string | null): void {
      const previous = this.value
      this.valueState = state ?? undefined
      this.requestUpdate('value', previous)
    }
  }

  return ValueElement as unknown as Constructor<MixinControllerValueInterface> & T
}
