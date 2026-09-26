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
   * The value the control starts with. A form reset returns it to this value.
   *
   * Separate from `value`, which is where the control is now, and gone from the
   * reader's view the moment they change anything.
   */
  defaultValue: string

  /**
   * The control's current value, which its form submits.
   *
   * Reading gives the real value. Writing always applies, and is a seed and a
   * correction rather than a claim of ownership: a consumer who wants the
   * decision refuses the `helix-before-change`.
   */
  value: string

  /**
   * Whether every edit is announced, rather than every settled value.
   *
   * A control the reader types or drags in moves continuously, and the platform
   * calls that `input`: `<input type="text">` fires one per keystroke and fires
   * `change` once, on commit. A few of the controls here are that shape, and
   * the rest change in discrete steps where a step *is* the change.
   *
   * It selects the event rather than the timing. `requestValue` is called
   * whenever the value moves either way; this decides whether the control sends
   * `input` alone or `input` and `change` together.
   */
  protected readonly announcesInput: boolean

  /** Requests a new value, and returns whether the change was applied. */

  requestValue(next: string): boolean

  /** Returns the control to its `defaultValue`. */
  formResetCallback(): void

  /** Restores the value when the browser brings a form back. */
  formStateRestoreCallback(state: string | File | FormData | null): void
}

/**
 * Grafts `value`, `defaultValue`, and the two callbacks that answer a form.
 *
 * **Derived on read, never seeded in a lifecycle hook.** `value` falls back to
 * `defaultValue`, so the server and the client agree without either running a
 * hook. Seeding in `connectedCallback` is the trap: SSR never calls it, so a
 * control with a `default-value` would serve empty and fill itself at
 * hydration, a flash for a reader and a mismatch for React.
 *
 * **What it does not own is reporting.** `setFormValue` stays with the
 * component, because what an empty value means is the component's business: a
 * text field submits its emptiness, since `""` is an answer and the field was
 * on the form, while a group with nothing chosen submits nothing at all.
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
    /**
     * The value the control starts with. A form reset returns it to this value.
     */
    @property({ attribute: 'default-value' })
    defaultValue = ''

    /**
     * The control's current value, which its form submits.
     *
     * One property, not two, so `input.value` answers the question anyone
     * asking it meant. Writing always applies; `<helix-input value="x">` is the
     * same statement in markup, and `default-value` is how markup seeds a value
     * a reset should return to.
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
     * The request event is `helix-before-change` whatever the answer; this
     * decides which native event announces the result, `input` while a reader
     * is editing against `change` when they are done, which is the distinction
     * the platform already draws.
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
    protected announceNatively(): void {
      this.announceInput()
      if (!this.announcesInput) {
        this.announceChange()
      }
    }

    /**
     * Requests a new value, and returns whether the change was applied.
     *
     * Announces before it acts, so `preventDefault()` on the `helix-before-change` is
     * a refusal and nothing moves. Nobody refusing means the control updates
     * itself, whether or not a consumer declared `value`: a declared property
     * is a seed and a correction, the way `<input value>` is, and a consumer
     * who wants the change for themselves refuses it and assigns their own.
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
        event: (value) => new HelixBeforeChangeEvent({ value }),
        host: this,
        next,
      })
      if (applied) {
        this.announceNatively()
      }
      return applied
    }

    /**
     * Returns the control to its `defaultValue`.
     *
     * Both halves are dropped, the consumer's and the control's, because a
     * reset means the form is as it was served. Clearing only the internal one
     * would leave a control that had been written to stuck at that value.
     */
    override formResetCallback(): void {
      super.formResetCallback()
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
    formStateRestoreCallback(state: string | File | FormData | null): void {
      const previous = this.value
      /* A string or nothing. A control that submits several entries saves its
         form data as the state unless it names one, and a value that is not a
         string throws the first time anything splits it. */
      this.valueState = typeof state === 'string' ? state : undefined
      this.requestUpdate('value', previous)
    }
  }

  return ValueElement as unknown as Constructor<MixinControllerValueInterface> & T
}
