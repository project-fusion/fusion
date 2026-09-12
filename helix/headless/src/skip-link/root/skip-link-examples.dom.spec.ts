import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the preview example', () => {
  run('the page focuses the link, so it is the one thing shown over the header', async () => {
    await example(preview)
    await idle()
    expect(document.activeElement?.localName).toBe('helix-headless-skip-link')
  })
})
