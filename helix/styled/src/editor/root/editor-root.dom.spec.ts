import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* An example runs its script only in a browser, so this runs there. */
const run = hasLayout() ? test : (): void => {}

describe('editor', () => {
  test('draws the frame in the code face, with the field’s shared stack', async () => {
    const element = await mount('<helix-editor label="Code"></helix-editor>')
    expect(part(element, 'field')).not.toBeNull()
    expect(part(element, 'control')?.getAttribute('spellcheck')).toBe('false')
  })
})

describe('the preview example', () => {
  run('lists the problem the page gives it, by its line', async () => {
    await example(preview)
    const editor = document.getElementById('editor-preview') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await editor.updateComplete
    expect(part(editor, 'diagnostic')?.textContent).toBe(
      'Line 2: Cannot find name totl. Did you mean total?',
    )
  })
})
