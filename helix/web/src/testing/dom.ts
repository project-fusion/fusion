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
 * Only `form` is modelled with real behavior, because it is the only part the
 * components currently rely on. It resolves the nearest ancestor form, which is
 * what the platform does in the absence of a `form` attribute; the attribute
 * form of ownership is not covered. Everything else is inert, so a test that
 * starts depending on validity or form values will read as obviously empty
 * rather than quietly passing against a stub.
 */
const shimElementInternals = (): void => {
  const proto = HTMLElement.prototype as HTMLElement & {
    attachInternals?: () => ElementInternals
  }
  if (proto.attachInternals) {
    return
  }

  proto.attachInternals = function attachInternals(this: HTMLElement): ElementInternals {
    const host = this
    return {
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

/** Finds a shadow part by name. */
export const part = (host: HTMLElement, name: string): Element | null =>
  host.shadowRoot?.querySelector(`[part="${name}"]`) ?? null

/** Elements the consumer assigned to a slot, by slot name. */
export const slotted = (host: HTMLElement, name?: string): Element[] => {
  const selector = name ? `slot[name="${name}"]` : 'slot:not([name])'
  const slot = host.shadowRoot?.querySelector(selector) as HTMLSlotElement | null
  return (slot?.assignedElements?.() ?? []) as Element[]
}
