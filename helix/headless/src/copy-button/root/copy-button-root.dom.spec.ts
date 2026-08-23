import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* happy-dom has no clipboard, so one is installed. That is honest rather than a
   shortcut: what is being asserted is that the button waits for the write and
   reacts to its outcome, and a stub is the only way to make a refusal happen on
   purpose. */
const clipboard = (behaviour: 'accept' | 'refuse') => {
  const written: string[] = []
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: (value: string) => {
        if (behaviour === 'refuse') {
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
 * **Not a fixed number of microtask ticks**, which is what these did and what
 * broke the day the write moved into `CopyController`: the controller is one
 * `await` deeper than the hand-rolled write it replaced, so a single
 * `await Promise.resolve()` no longer reached the end of it and two specs
 * failed on an implementation detail rather than on behaviour. A press is done
 * when the element has settled, and a task boundary reaches past any number of
 * promises. */
const press = async (el: Awaited<ReturnType<typeof mount>>): Promise<void> => {
  const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
  button.click()
  await new Promise((done) => setTimeout(done, 0))
  await el.updateComplete
}

describe('copy button', () => {
  test('writes its value and confirms', async () => {
    const written = clipboard('accept')
    const el = await mount(
      '<helix-base-copy-button value="bun add @helix-io/web"></helix-base-copy-button>',
    )
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    await press(el)
    expect(written).toEqual(['bun add @helix-io/web'])
    expect(button.hasAttribute('data-copied')).toBe(true)
  })

  test('announces what it copied, after the write', async () => {
    clipboard('accept')
    const el = await mount('<helix-base-copy-button value="one"></helix-base-copy-button>')
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
   *
     **Both routes refused, which "the platform refuses" now means.** This
     rejected `writeText` alone and called that the platform, which was true
     while the button had only that one route. In a real browser the fallback
     then succeeds, because `document.execCommand('copy')` works there, and the
     button confirmed: the spec failed in Chromium and passed under happy-dom,
     which has no `execCommand` at all. The second route is the fix, so the test
     has to refuse it too. */
  test('says nothing when the platform refuses', async () => {
    clipboard('refuse')
    ;(document as unknown as Record<string, unknown>).execCommand = () => false
    const el = await mount('<helix-base-copy-button value="one"></helix-base-copy-button>')
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
    const el = await mount('<helix-base-copy-button value="one"></helix-base-copy-button>')
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
    const el = await mount('<helix-base-copy-button value="one"></helix-base-copy-button>')
    const tip = el.shadowRoot?.querySelector('helix-base-tooltip') as HTMLElement & {
      content: string
    }
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    expect([tip.content, button.getAttribute('aria-label')]).toEqual(['Copy', 'Copy'])
    await press(el)
    expect([tip.content, button.getAttribute('aria-label')]).toEqual(['Copied', 'Copied'])
  })
})

/**
 * The route the button did not have, in the place it matters most.
 *
 * It reached straight for `navigator.clipboard.writeText` and stopped there, so
 * in a sandboxed iframe without `allow-same-origin` it was inert: the guard on
 * the API existing does not help, because in that sandbox the object exists and
 * the write rejects. That is the sandbox every example on the docs site runs
 * in, which made a copy button that does nothing the most likely one a reader
 * would ever press.
 *
 * `CopyController` has always had both routes. This is a second, thinner
 * implementation of it going away rather than a new feature.
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
    const el = await mount('<helix-base-copy-button value="one"></helix-base-copy-button>')
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
    const el = await mount('<helix-base-copy-button value="one"></helix-base-copy-button>')
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
