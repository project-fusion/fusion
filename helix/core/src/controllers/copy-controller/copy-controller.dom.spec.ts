import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * Putting text on the clipboard, and holding a confirmation for a moment.
 *
 * A controller rather than a component, because copying is a behavior and not
 * a shape: Color's chip is a swatch that copies and a copy button is a button
 * that copies, and those have nothing in common to look at. What they share is
 * the write, the confirmation, the timer that ends it and the event that
 * announces it. Written twice, the second would get the failure case wrong.
 *
 * **Both routes are exercised, and the second one is why this is not inline.**
 * The async API is gated in more places than it looks: an insecure origin, an
 * unfocused document, and a Permissions Policy defaulting to `self`, which a
 * sandboxed iframe without `allow-same-origin` is not. `execCommand` is
 * deprecated and more widely permitted, because it rides the user gesture
 * rather than asking for a permission.
 *
 * happy-dom has `navigator.clipboard.writeText` and no `document.execCommand`
 * at all, so each is installed per test. What is being asserted is the order
 * they are tried in and what happens when each says no, which is a decision
 * this file owns.
 */
type Module = typeof import('./copy-controller.js')
let CopyController: Module['CopyController']

beforeAll(async () => {
  registerDom()
  ;({ CopyController } = await import('./copy-controller.js'))
})

interface Routes {
  /** What `execCommand('copy')` answers, or absent to leave it unimplemented. */
  legacy?: boolean
  /** Whether the async API resolves. */
  modern: boolean
}

const realClipboard = navigator.clipboard

const routes = ({ legacy, modern }: Routes): { carriers: string[] } => {
  const carriers: string[] = []
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: async (text: string) => {
        if (!modern) {
          throw new DOMException('refused', 'NotAllowedError')
        }
        carriers.push(text)
      },
    },
  })
  if (legacy !== undefined) {
    ;(document as unknown as Record<string, unknown>).execCommand = () => {
      const carrier = document.querySelector('textarea')
      if (carrier) {
        carriers.push(carrier.value)
      }
      return legacy
    }
  }
  return { carriers }
}

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: realClipboard })
  delete (document as unknown as Record<string, unknown>).execCommand
})

interface Host extends HTMLElement {
  addController(): void
  requestUpdate(): void
  updates: number
}

const host = (attached = true): Host => {
  const made = document.createElement('span') as Host
  Object.assign(made, {
    addController: () => {},
    requestUpdate: () => {
      made.updates += 1
    },
    updates: 0,
  })
  if (attached) {
    document.body.append(made)
  }
  return made
}

const announced = (one: Host): { values: unknown[] } => {
  const values: unknown[] = []
  one.addEventListener('helix-copy', (event) => {
    values.push((event as CustomEvent<{ value: string }>).detail.value)
  })
  return { values }
}

describe('the route a write takes', () => {
  test('is the modern one, which is the only one that reports failure', async () => {
    const { carriers } = routes({ modern: true })
    const one = host()
    await new CopyController(one as never).copy('ada')
    expect(carriers).toEqual(['ada'])
  })

  /* A textarea rather than the selection, because the text being copied is not
     on the page: it is a value. Focused as well as selected, since
     `execCommand('copy')` copies the *document's* selection, so an unfocused
     textarea copies whatever was selected on the page instead. */
  test('and the deprecated one where the modern is refused', async () => {
    const { carriers } = routes({ legacy: true, modern: false })
    const one = host()
    await new CopyController(one as never).copy('ada')
    expect(carriers).toEqual(['ada'])
  })

  /* `fixed` and `opacity: 0` rather than off-screen, because scrolling to a
     focused element is what a negative offset causes, and a copy that jumps the
     page is worse than one that does not happen. */
  test('leaving nothing behind on the page either way', async () => {
    routes({ legacy: true, modern: false })
    await new CopyController(host() as never).copy('ada')
    expect(document.querySelector('textarea')).toBeNull()
  })
})

describe('focus around the deprecated route', () => {
  /* The carrier takes focus to be copied from and then leaves the page, which
     dropped a keyboard reader on the body. */
  test('goes back to where it was', async () => {
    routes({ legacy: true, modern: false })
    const button = document.createElement('button')
    document.body.append(button)
    button.focus()
    await new CopyController(host() as never).copy('ada')
    expect(document.activeElement).toBe(button)
    button.remove()
  })
})

describe('a write that succeeded', () => {
  test('is confirmed, and the host is asked to show it', async () => {
    routes({ modern: true })
    const one = host()
    const copy = new CopyController(one as never)
    await copy.copy('ada')
    expect(copy.copied).toBe(true)
    expect(one.updates).toBeGreaterThan(0)
  })

  /* Announced after the write, not before it, and not cancelable for the same
     reason: by the time anything could be said the text is already on the
     clipboard, and an event that cannot prevent what it describes should not
     pretend otherwise. */
  test('and announced, with what was written', async () => {
    routes({ modern: true })
    const one = host()
    const { values } = announced(one)
    await new CopyController(one as never).copy('ada')
    expect(values).toEqual(['ada'])
  })

  test('for as long as the caller asked, and then not', async () => {
    routes({ modern: true })
    const copy = new CopyController(host() as never, { after: 10 })
    await copy.copy('ada')
    expect(copy.copied).toBe(true)
    await new Promise((done) => setTimeout(done, 25))
    expect(copy.copied).toBe(false)
  })

  /* On a timer rather than on the pointer leaving, so it survives a hand that
     has already moved on: the press and the reading of it are two moments, and
     a mark that vanishes with the cursor is one a fast reader never sees. */
  test('restarting the clock rather than letting the first one end it', async () => {
    routes({ modern: true })
    const copy = new CopyController(host() as never, { after: 30 })
    await copy.copy('ada')
    await new Promise((done) => setTimeout(done, 20))
    await copy.copy('grace')
    await new Promise((done) => setTimeout(done, 20))
    expect(copy.copied).toBe(true)
  })
})

describe('a write neither route was allowed', () => {
  /* Nothing is confirmed. The controller holds `failed` for the moment a
     confirmation would last, and the component decides whether to say so. */
  test('confirms nothing, and holds failed for a component that says so', async () => {
    routes({ legacy: false, modern: false })
    const one = host()
    const { values } = announced(one)
    const copy = new CopyController(one as never, { after: 5 })
    expect(await copy.copy('ada')).toBe(false)
    expect([copy.copied, copy.failed, values.length]).toEqual([false, true, 0])
    await new Promise((done) => setTimeout(done, 20))
    expect(copy.failed).toBe(false)
  })

  test('including where the platform has no second route at all', async () => {
    routes({ modern: false })
    const copy = new CopyController(host() as never)
    await copy.copy('ada')
    expect(copy.copied).toBe(false)
  })
})

describe('an empty copy', () => {
  test('is not made, because an empty clipboard is not a thing anyone asks for', async () => {
    const { carriers } = routes({ modern: true })
    const one = host()
    const { values } = announced(one)
    const copy = new CopyController(one as never)
    expect(await copy.copy('')).toBe(false)
    expect([carriers.length, values.length, copy.copied, copy.failed]).toEqual([0, 0, false, true])
  })
})

describe('a host that left while the clipboard was being written', () => {
  /* Writing is asynchronous and `hostDisconnected` runs the moment the element
     leaves, clearing a timer that does not exist yet, so everything after the
     write has to check the host is still on the page: otherwise it starts a
     fresh timer on a detached host and calls `requestUpdate` on it a second
     later. */
  test('is not confirmed, and not asked to re-render', async () => {
    routes({ modern: true })
    const one = host()
    const { values } = announced(one)
    const copy = new CopyController(one as never)
    const writing = copy.copy('ada')
    one.remove()
    await writing
    expect([copy.copied, values.length, one.updates]).toEqual([false, 0, 0])
  })
})

describe('a host leaving after a confirmation', () => {
  test('takes the confirmation and its clock with it', async () => {
    routes({ modern: true })
    const copy = new CopyController(host() as never, { after: 10 })
    await copy.copy('ada')
    copy.hostDisconnected()
    expect(copy.copied).toBe(false)
  })
})
