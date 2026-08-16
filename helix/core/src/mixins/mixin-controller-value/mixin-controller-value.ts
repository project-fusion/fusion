import type { PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixChangeEvent } from '../../events/events.js'
import type { HelixFormElement } from '../../helix-form-element/helix-form-element.js'
import { requestControlledChange } from '../../utils/request-controlled-change/request-controlled-change.js'

// biome-ignore lint/suspicious/noExplicitAny: mixin constructors are variadic by nature
type Constructor<T> = new (...args: any[]) => T

/** The name a form control carries, which the change event reports. */
interface Named {
  name?: string
}

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
   * The consumer's callback, invoked after the value is applied.
   *
   * Not reachable from React's JSX, which reserves every `on[A-Z]` prop for its
   * own event system; the generated wrapper listens for `helix-change` instead.
   */
  onValueChange: ((value: string) => void) | undefined

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
     * does when a script assigns to it. What the write does not do is change
     * which mode the element is in.
     */
    private valueState: string | undefined = undefined

    /**
     * Whether the consumer owns the state, decided once and then fixed.
     *
     * Read off whether anything had set `value` by the first update, which is
     * where markup, a hydrating server's attributes and a framework's initial
     * properties have all landed. See `MixinControllerOpen` for why this is
     * decided once rather than continuously.
     */
    private valueMode: boolean | undefined = undefined

    private get valueIsControlled(): boolean {
      return this.valueMode === true
    }

    /**
     * Reads the mode, once, before anything else looks at it.
     *
     * Everything that declares it has arrived by the first update: attributes
     * from markup or from a server's output, and properties a framework
     * assigned on mount. Nothing after that changes it, which is what lets a
     * script assign `value` to an uncontrolled element without taking it over.
     */
    protected override willUpdate(changed: PropertyValues): void {
      super.willUpdate(changed)
      if (this.valueMode === undefined) {
        this.valueMode = this.valueState !== undefined
      }
    }

    /**
     * The consumer's callback, invoked after the value is applied.
     *
     * Not an attribute: it is a function. `onValueChange` and not `onChange`,
     * because React reserves the latter for its own synthetic system and wires
     * it to the native `change`, so a Helix event named `Change` would never
     * fire at all.
     */
    @property({ attribute: false })
    onValueChange: ((value: string) => void) | undefined = undefined

    /**
     * Requests a new value, and reports whether the request stood.
     *
     * Announces before it acts, so `preventDefault()` on the `helix-change` is
     * a refusal and nothing moves. In uncontrolled mode the control then
     * updates itself; in controlled mode it applies nothing and waits for the
     * consumer to pass a new `value`, which is what controlled means.
     */
    requestValue(next: string): boolean {
      if (this.value === next) {
        return true
      }
      return requestControlledChange({
        apply: (value) => {
          if (this.valueIsControlled) {
            return
          }
          const previous = this.value
          this.valueState = value
          this.requestUpdate('value', previous)
        },
        event: (value) => new HelixChangeEvent({ name: (this as Named).name ?? '', value }),
        host: this,
        next,
        notify: this.onValueChange,
      })
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
