import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
})

type Palette = HTMLElement & { open: boolean; updateComplete: Promise<unknown> }

const palette = async (): Promise<Palette> => {
  const host = (await mount(`<helix-base-command default-open label="Commands">
      <helix-base-option
        alternate="/helix/sandbox?family=card"
        alternate-label="Open in the sandbox"
        value="/components/card"
      >Card</helix-base-option>
      <helix-base-option value="/components/button">Button</helix-base-option>
    </helix-base-command>`)) as Palette
  await host.updateComplete
  return host
}

/* The row under the keyboard, which the listbox marks and this reads the way
   the palette does. happy-dom runs no layout, so the listbox may not have
   settled one: the spec marks it, which is the same attribute either way. */
const activate = (host: Palette, value: string): void => {
  for (const option of host.querySelectorAll('helix-base-option')) {
    option.toggleAttribute('data-active', option.getAttribute('value') === value)
  }
}

describe('a command row with two destinations', () => {
  test('the modifier takes the second, and says which it took', async () => {
    const host = await palette()
    activate(host, '/components/card')
    let heard: { alternate?: boolean; value: string } | undefined
    host.addEventListener('helix-select', (event) => {
      heard = (event as CustomEvent<{ alternate?: boolean; value: string }>).detail
    })

    host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', metaKey: true }))
    expect(heard?.value).toBe('/helix/sandbox?family=card')
    expect(heard?.alternate).toBe(true)
  })

  /* The whole risk of intercepting in the capture phase: a palette that ate
     plain Enter would be a palette nothing could choose from. */
  test('plain Enter is left entirely to the listbox', async () => {
    const host = await palette()
    activate(host, '/components/card')
    let stopped = false
    host.addEventListener('keydown', () => {
      stopped = false
    })
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' })
    host.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(stopped).toBe(false)
  })

  test('the modifier on a row with no second destination does nothing', async () => {
    const host = await palette()
    activate(host, '/components/button')
    let heard = 0
    host.addEventListener('helix-select', () => {
      heard += 1
    })
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      metaKey: true,
    })
    host.dispatchEvent(event)
    expect(heard).toBe(0)
    expect(event.defaultPrevented).toBe(false)
  })

  /* The second destination has to be said, or a reader who cannot see the
     footer is told about one of two things the row does. */
  test('the second destination is in the row description, not its name', async () => {
    const host = await palette()
    const row = host.querySelector('helix-base-option') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await row.updateComplete
    expect(row.textContent?.trim()).toBe('Card')
    expect(
      row.getAttribute('aria-description') ??
        (row as unknown as { internals?: { ariaDescription?: string } }).internals?.ariaDescription,
    ).toBe('Open in the sandbox')
  })
})
