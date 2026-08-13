import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../../index.js')
})

const wired = `
  <helix-sandbox>
    <helix-sandbox-source slot="source" value="<p>one</p>"></helix-sandbox-source>
    <helix-sandbox-preview slot="preview"></helix-sandbox-preview>
  </helix-sandbox>`

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

describe('sandbox coordination', () => {
  test('an edit in the source reaches the preview', async () => {
    // By event, like the accordion. Neither child knows the other exists.
    const sandbox = await mount(wired)
    const source = sandbox.querySelector('helix-sandbox-source') as Updatable
    const preview = sandbox.querySelector('helix-sandbox-preview') as Updatable & { source: string }

    const field = source.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
    field.value = '<p>two</p>'
    field.dispatchEvent(new Event('input'))
    await preview.updateComplete

    expect(preview.source).toBe('<p>two</p>')
    expect(preview.innerHTML).toContain('two')
  })

  test('the preview renders into the light DOM, under the page stylesheets', async () => {
    // A shadow root would cut the preview off from the base layer, so a heading
    // would render at the browser default and the preview would stop being a
    // likeness of a real page.
    const sandbox = await mount(wired)
    const preview = sandbox.querySelector('helix-sandbox-preview') as Updatable & { source: string }
    preview.source = '<h2>Heading</h2>'
    await preview.updateComplete

    expect(preview.shadowRoot).toBeNull()
    expect(preview.querySelector('h2')?.textContent).toBe('Heading')
  })
})

describe('sandbox divider', () => {
  const press = (host: HTMLElement, key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
    part(host, 'separator')?.dispatchEvent(event)
    return event
  }

  test('is a separator that reports where it is', async () => {
    const sandbox = await mount(wired)
    const separator = part(sandbox, 'separator')
    expect(separator?.getAttribute('role')).toBe('separator')
    expect(separator?.getAttribute('aria-valuenow')).toBe('45')
    // Focusable, because a divider only a mouse can move is unusable without one.
    expect(separator?.getAttribute('tabindex')).toBe('0')
  })

  test('arrow keys move the split', async () => {
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    press(sandbox, 'ArrowRight')
    await sandbox.updateComplete
    expect(sandbox.split).toBe(47)

    press(sandbox, 'ArrowLeft')
    press(sandbox, 'ArrowLeft')
    await sandbox.updateComplete
    expect(sandbox.split).toBe(43)
  })

  test('the split cannot be driven to nothing', async () => {
    const sandbox = (await mount(wired)) as Updatable & { split: number }
    press(sandbox, 'Home')
    await sandbox.updateComplete
    expect(sandbox.split).toBe(15)

    press(sandbox, 'End')
    await sandbox.updateComplete
    expect(sandbox.split).toBe(85)
  })

  test('an unrelated key is left alone', async () => {
    const sandbox = await mount(wired)
    expect(press(sandbox, 'PageDown').defaultPrevented).toBe(false)
  })
})

describe('sandbox source editing', () => {
  test('Tab indents rather than leaving the field', async () => {
    const sandbox = await mount(wired)
    const source = sandbox.querySelector('helix-sandbox-source') as Updatable & { value: string }
    const field = source.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
    field.value = 'x'
    field.selectionStart = 0
    field.selectionEnd = 0

    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' })
    field.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(field.value).toBe('  x')
  })

  test('Escape then Tab moves focus out, which is the way back to the page', async () => {
    const sandbox = await mount(wired)
    const source = sandbox.querySelector('helix-sandbox-source') as Updatable
    const field = source.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement
    field.value = 'x'

    field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    const tab = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' })
    field.dispatchEvent(tab)

    expect(tab.defaultPrevented).toBe(false)
    expect(field.value).toBe('x')
  })
})
