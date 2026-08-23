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

describe('copy button', () => {
  test('writes its value and confirms', async () => {
    const written = clipboard('accept')
    const el = await mount(
      '<helix-base-copy-button value="bun add @helix-io/web"></helix-base-copy-button>',
    )
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    button.click()
    await Promise.resolve()
    await el.updateComplete
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
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    button.click()
    await Promise.resolve()
    await el.updateComplete
    expect(detail).toEqual({ value: 'one' })
  })

  /* The one that matters. A refused clipboard is the common case on an insecure
     origin, and a button that confirms anyway is lying about the one thing it
     exists to report. */
  test('says nothing when the platform refuses', async () => {
    clipboard('refuse')
    const el = await mount('<helix-base-copy-button value="one"></helix-base-copy-button>')
    let fired = false
    el.addEventListener('helix-copy', () => {
      fired = true
    })
    const button = el.shadowRoot?.querySelector('[part="button"]') as HTMLButtonElement
    button.click()
    await Promise.resolve()
    await Promise.resolve()
    await el.updateComplete
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
    button.click()
    await Promise.resolve()
    await el.updateComplete
    expect([tip.content, button.getAttribute('aria-label')]).toEqual(['Copied', 'Copied'])
  })
})
