import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, type Updatable } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* happy-dom has no clipboard, so one is installed. That is honest rather than a
   shortcut: what is being asserted is that the button waits for the write and
   reacts to its outcome, and a stub is the only way to make a refusal happen on
   purpose. */
const clipboard = (behavior: 'accept' | 'refuse') => {
  const written: string[] = []
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: (value: string) => {
        if (behavior === 'refuse') {
          return Promise.reject(new Error('denied'))
        }
        written.push(value)
        return Promise.resolve()
      },
    },
  })
  return written
}

/* A press, and everything it sets off.
 *
 * **Not a fixed number of microtask ticks.** Counting them ties the spec to how
 * many `await`s deep the write happens, so a single `await Promise.resolve()`
 * stops reaching the end of it the moment that changes. A press is done when the
 * element has settled, and a task boundary reaches past any number of
 * promises. */
const press = async (el: Updatable): Promise<void> => {
  const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
  button.click()
  await new Promise((done) => setTimeout(done, 0))
  await el.updateComplete
}

describe('copy button', () => {
  test('writes its value and confirms', async () => {
    const written = clipboard('accept')
    const el = await mount(
      '<helix-headless-copy-button value="bun add @fusion.dev/helix"></helix-headless-copy-button>',
    )
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    await press(el)
    expect(written).toEqual(['bun add @fusion.dev/helix'])
    expect(button.hasAttribute('data-copied')).toBe(true)
  })

  test('announces what it copied, after the write', async () => {
    clipboard('accept')
    const el = (await mount(
      '<helix-headless-copy-button value="one"></helix-headless-copy-button>',
    )) as Updatable
    let detail: unknown
    el.addEventListener('helix-copy', (event) => {
      detail = (event as CustomEvent).detail
    })
    await press(el)
    expect(detail).toEqual({ value: 'one' })
  })

  /* The one that matters. A refused clipboard is the common case on an insecure
     origin, and a button that confirms anyway is lying about the one thing it
     exists to report.

     **Both routes have to be refused.** Rejecting `writeText` alone passes under
     happy-dom, which has no `execCommand` at all, and fails in Chromium, where
     `document.execCommand('copy')` succeeds and the button confirms. */
  test('says nothing when the platform refuses', async () => {
    clipboard('refuse')
    ;(document as unknown as Record<string, unknown>).execCommand = () => false
    const el = (await mount(
      '<helix-headless-copy-button value="one"></helix-headless-copy-button>',
    )) as Updatable
    let fired = false
    el.addEventListener('helix-copy', () => {
      fired = true
    })
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    await press(el)
    delete (document as unknown as Record<string, unknown>).execCommand
    expect(fired).toBe(false)
    expect(button.hasAttribute('data-copied')).toBe(false)
  })
})

describe('what it says and shows', () => {
  test('draws both icons itself, so a bare button is a copy button', async () => {
    const el = (await mount(
      '<helix-headless-copy-button value="one"></helix-headless-copy-button>',
    )) as Updatable
    const slots = [...(el.shadowRoot?.querySelectorAll('slot') ?? [])]
    /* Read off the slot's own children rather than through
       `assignedNodes({ flatten: true })`. That call is the one that answers
       "what actually renders", and happy-dom returns an empty list for it even
       when the fallback is present and correct: measured here, both slots hold
       an `<svg>` and both report zero. Asserting through it tests the test
       double, and it fails on a component that is right. */
    expect(slots.map((slot) => slot.querySelector('svg') !== null)).toEqual([true, true])
  })

  /* The tooltip is the visible confirmation and the accessible name is the
     spoken one. Letting them disagree tells a sighted reader it worked and
     leaves a screen reader user on a button that never acknowledges the press. */
  test('moves its name and its tooltip together', async () => {
    clipboard('accept')
    const el = (await mount(
      '<helix-headless-copy-button value="one"></helix-headless-copy-button>',
    )) as Updatable
    const tip = el.shadowRoot?.querySelector('helix-headless-tooltip') as HTMLElement & {
      content: string
    }
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    expect([tip.content, button.getAttribute('aria-label')]).toEqual(['Copy', 'Copy'])
    await press(el)
    expect([tip.content, button.getAttribute('aria-label')]).toEqual(['Copied', 'Copied'])
  })
})

/**
 * The fallback route, in the place it matters most.
 *
 * `navigator.clipboard.writeText` alone is inert in a sandboxed iframe without
 * `allow-same-origin`, and guarding on the API existing does not help: in that
 * sandbox the object exists and the write rejects. That is the sandbox every
 * example on the docs site runs in, so it is the copy button a reader is most
 * likely to press.
 */
describe('a context that refuses the modern clipboard', () => {
  const legacy = (answers: boolean) => {
    const written: string[] = []
    ;(document as unknown as Record<string, unknown>).execCommand = () => {
      const carrier = document.querySelector('textarea')
      if (carrier) {
        written.push(carrier.value)
      }
      return answers
    }
    return written
  }

  test('copies anyway, and confirms', async () => {
    clipboard('refuse')
    const written = legacy(true)
    const el = (await mount(
      '<helix-headless-copy-button value="one"></helix-headless-copy-button>',
    )) as Updatable
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    await press(el)
    expect(written).toEqual(['one'])
    expect(button.hasAttribute('data-copied')).toBe(true)
    delete (document as unknown as Record<string, unknown>).execCommand
  })

  /* Where neither route is allowed the failure is silence: no confirmation and
     no event. A message about a clipboard is worse than a mark that did not
     flash, and there is nothing a reader could do about a permission policy. */
  test('and says nothing at all where that route is refused too', async () => {
    clipboard('refuse')
    legacy(false)
    const el = (await mount(
      '<helix-headless-copy-button value="one"></helix-headless-copy-button>',
    )) as Updatable
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    let heard = 0
    el.addEventListener('helix-copy', () => {
      heard += 1
    })
    await press(el)
    expect([button.hasAttribute('data-copied'), heard]).toEqual([false, 0])
    delete (document as unknown as Record<string, unknown>).execCommand
  })
})
