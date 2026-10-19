import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, part, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* An example runs its script only in a browser, so this runs there. */
const run = hasLayout() ? test : (): void => {}

describe('the preview example', () => {
  run('lists the problems the page gives it, by their lines', async () => {
    await example(preview)
    const editor = document.getElementById('base-editor-preview') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await editor.updateComplete
    expect(part(editor, 'diagnostic')?.textContent?.trim()).toBe(
      'Line 10: Unexpected console statement.',
    )
  })
})
