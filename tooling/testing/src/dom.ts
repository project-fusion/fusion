import { GlobalRegistrator } from '@happy-dom/global-registrator'

let registered = false

/**
 * Installs happy-dom's globals, once per process.
 *
 * `bun test dom.spec` runs every DOM spec in one process, and
 * `GlobalRegistrator.register()` throws on the second call. Each spec still
 * asks for the DOM it needs rather than depending on a preload it cannot see,
 * and the flag makes the second ask a no-op.
 */
export const registerDom = (): void => {
  if (registered) {
    return
  }
  registered = true
  GlobalRegistrator.register()
  shimElementInternals()
}

/**
 * Fills in `attachInternals`, which happy-dom does not implement.
 *
 * Lit's server shim does implement it, so this gap is the test double's alone
 * and the fix belongs here rather than as a guard in `HelixFormElement`. A
 * runtime check there would make production code defensive about a browser
 * capability every browser has, and would swallow a real failure.
 *
 * The aria slots are plain values rather than behavior: components set
 * their semantics through internals so nothing lands on the host as an
 * attribute, and a spec reads them back through the `role` helper below.
 *
 * `form` and `setFormValue` are modelled with real behavior, because they are
 * the parts the components rely on. `form` resolves the nearest ancestor form,
 * which is what the platform does in the absence of a `form` attribute; the
 * attribute form of ownership is not covered. `setFormValue` records what it
 * was given, readable through `formValue` below.
 *
 * Recording rather than submitting, and the distinction is the point. Getting a
 * reported value into `new FormData(form)` is the platform's job and happy-dom
 * does not do it; what belongs to a component is reporting the right value at
 * the right moment, and that is what the recording proves. A spec that needs
 * the whole path from a press to a submitted field wants a real browser.
 *
 * `states` is modelled as a real set, because a component that reports a fact
 * through `ElementInternals.states` has no other channel for it: the whole
 * point of a custom state is that it reaches a stylesheet and never the DOM, so
 * there is no attribute a spec could read instead. Feature-tested by its users
 * (`'states' in internals`), so leaving it out did not break anything; it made
 * the behavior untestable outside a browser, which is how it went in.
 *
 * `setValidity` is modelled too, for the same reason `setFormValue` is: a
 * control reads its own verdict back to decide whether to show a message, so a
 * `setValidity` that records nothing leaves `internals.validity` undefined and
 * the component throws rather than the spec failing. What is modelled is the
 * bookkeeping and nothing more: the flags given are the flags returned, and
 * `valid` is true when none of them is set. Deciding what counts as a valid
 * email is the platform's job and is not attempted here.
 *
 * Everything else is inert, so a test that starts depending on it will read as
 * obviously empty rather than quietly passing against a stub.
 */
/** What a control may report: a field's value, a set of them, or nothing. */
type FormValue = File | FormData | string | null

/* Keyed by host and weak, so a mounted-and-discarded element in one spec does
   not keep its value alive for the next. */
const reported = new WeakMap<HTMLElement, FormValue>()

/**
 * The value a control last reported to its form.
 *
 * `undefined` means it never reported at all, which is a different failure from
 * reporting `null`: the first is a control that is not wired to a form, the
 * second is one that is wired and has nothing to submit.
 */
export const formValue = (host: HTMLElement): FormValue | undefined => reported.get(host)

const shimElementInternals = (): void => {
  const proto = HTMLElement.prototype as HTMLElement & {
    attachInternals?: () => ElementInternals
  }
  // Read through an index rather than testing the member directly. The DOM lib
  // types `attachInternals` as always present, so TypeScript narrows the guard
  // away entirely; happy-dom is the environment where it genuinely is not.
  if (typeof (proto as unknown as Record<string, unknown>).attachInternals === 'function') {
    return
  }

  proto.attachInternals = function attachInternals(this: HTMLElement): ElementInternals {
    const host = this
    let validity: ValidityState = { valid: true } as ValidityState
    let validationMessage = ''
    return {
      ariaCurrent: null,
      /* Declared, not merely assignable: a component that guards on
         `'ariaDescribedByElements' in internals` skips the link entirely when
         the slot is absent, which is the browser's own feature test.
 
         Both of them, and the second was missing. `hostAria` feature-tests each
         one separately, so a shim carrying only the description silently
         dropped every name written by reference, and the groups' own specs read
         that as the component failing to name itself. */
      ariaDescribedByElements: null,
      ariaLabel: null,
      ariaLabelledByElements: null,
      checkValidity: () => true,
      get form(): HTMLFormElement | null {
        // The platform grants form ownership only to form-associated elements,
        // so the stub checks the same flag rather than handing a form to
        // anything that asks.
        const declared = (host.constructor as { formAssociated?: boolean }).formAssociated
        return declared ? host.closest('form') : null
      },
      get labels(): NodeList {
        return document.querySelectorAll(host.id ? `label[for="${host.id}"]` : 'nothing-matches')
      },
      reportValidity: () => validity.valid,
      role: null,
      setFormValue: (value: unknown) => {
        reported.set(host, value as FormValue)
      },
      setValidity: (flags: ValidityStateFlags = {}, message = '') => {
        const failed = Object.entries(flags).filter(([, set]) => set === true)
        validity = { ...flags, valid: failed.length === 0 } as ValidityState
        validationMessage = failed.length === 0 ? '' : message
      },
      /* A `Set` rather than a `CustomStateSet`. The interface a component uses
         is `add`, `delete` and `has`, which a `Set` already is, and the real
         one differs only in being observed by the selector engine, which
         happy-dom has no `:state()` support for anyway. A spec asserts on the
         set; whether a rule matched is a browser's question. */
      states: new Set<string>(),
      get validationMessage(): string {
        return validationMessage
      },
      get validity(): ValidityState {
        return validity
      },
      get willValidate(): boolean {
        return true
      },
    } as unknown as ElementInternals
  }
}

/** An element with Lit's update barrier, for tests that mount it themselves. */
export type Updatable = HTMLElement & { updateComplete?: Promise<unknown> }

/** Renders markup and waits for the first element in it to finish updating. */
export const mount = async (markup: string): Promise<HTMLElement> => {
  document.body.innerHTML = markup
  const root = document.body.firstElementChild as Updatable
  await root.updateComplete
  return root
}

/**
 * The role a screen reader sees on the host.
 *
 * Components set their semantics through `ElementInternals`, which writes no
 * attribute at all, so `getAttribute('role')` reports nothing on an
 * announcement. An author's `role` attribute still wins, which is the
 * platform's own precedence and the reason this checks the attribute first.
 */
export const role = (host: HTMLElement): string | null =>
  host.getAttribute('role') ??
  (host as unknown as { internals?: ElementInternals }).internals?.role ??
  null

/** Finds a shadow part by name. */
export const part = (host: HTMLElement, name: string): Element | null =>
  host.shadowRoot?.querySelector(`[part="${name}"]`) ?? null

/** Elements the consumer assigned to a slot, by slot name. */
export const slotted = (host: HTMLElement, name?: string): Element[] => {
  const selector = name ? `slot[name="${name}"]` : 'slot:not([name])'
  const slot = host.shadowRoot?.querySelector(selector) as HTMLSlotElement | null
  return (slot?.assignedElements?.() ?? []) as Element[]
}

/**
 * Whether this environment lays anything out.
 *
 * happy-dom has no layout engine, so every rectangle in it is zero and every
 * computed length is whatever was written rather than what resolved. An
 * assertion about where something sits does not fail there, which is worse: it
 * passes against nothing, and a spec that cannot fail is a spec that is lying.
 *
 * Guard a geometry block with it and the same file says something true in both
 * places: measured for real in the browser, and honestly absent under `bun
 * test` rather than quietly green.
 *
 * A constant, not a probe. It was a probe once, appending a sized div and
 * asking how wide it came out, which is the more careful looking of the two and
 * was wrong: the runner's frame had not had its first layout when the module
 * evaluated, the probe measured zero in a real browser, and every geometry
 * block was skipped in silence. A skip that reports nothing is the failure this
 * was written to prevent, so the answer is the one thing that cannot race.
 * There is a harness per environment; the file you imported already knows.
 */
export const hasLayout = (): boolean => false
