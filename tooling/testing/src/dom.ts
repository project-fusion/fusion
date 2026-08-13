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
 * `role` and `ariaLabel` are plain slots rather than behavior: components set
 * their semantics through internals so nothing lands on the host as an
 * attribute, and a spec reads them back through the `role` helper below.
 *
 * Only `form` is modelled with real behavior, because it is the only other part
 * the components currently rely on. It resolves the nearest ancestor form, which is
 * what the platform does in the absence of a `form` attribute; the attribute
 * form of ownership is not covered. Everything else is inert, so a test that
 * starts depending on validity or form values will read as obviously empty
 * rather than quietly passing against a stub.
 */
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
    return {
      ariaLabel: null,
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
      reportValidity: () => true,
      role: null,
      setFormValue: () => undefined,
      setValidity: () => undefined,
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
 * attribute at all, so `getAttribute('role')` reports nothing on a banner. An
 * author's `role` attribute still wins, which is the platform's own precedence
 * and the reason this checks the attribute first.
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
