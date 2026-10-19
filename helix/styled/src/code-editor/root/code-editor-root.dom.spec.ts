import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* An example runs its script only in a browser, so this runs there. */
const run = hasLayout() ? test : (): void => {}

describe('code editor', () => {
  test('draws a header, the code and a status line in one frame', async () => {
    const element = await mount('<helix-code-editor label="orders.ts"></helix-code-editor>')
    const field = part(element, 'field')
    expect(field?.contains(part(element, 'header') ?? null)).toBe(true)
    expect(field?.contains(part(element, 'status') ?? null)).toBe(true)
    expect(part(element, 'control')?.getAttribute('spellcheck')).toBe('false')
  })

  test('draws its controls in the styled tier’s own elements', async () => {
    const element = await mount('<helix-code-editor label="orders.ts"></helix-code-editor>')
    expect(part(element, 'find')?.localName).toBe('helix-icon-button')
    expect(part(element, 'controls')?.localName).toBe('helix-toolbar')
  })
})

describe('the preview example', () => {
  run('lists the problems the page gives it, by their lines', async () => {
    await example(preview)
    const editor = document.getElementById('code-editor-preview') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await editor.updateComplete
    const listed = [...(editor.shadowRoot?.querySelectorAll('[part~="diagnostic"]') ?? [])]
    expect(listed.map((one) => one.textContent?.trim())).toEqual([
      'Line 10: Unexpected console statement.',
      'Line 11: Cannot find name totl. Did you mean total?',
    ])
  })
})
