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
  run('the page stamps the elapsed time, and it reads as time since', async () => {
    await example(preview)
    await idle()
    const [stamp] = document.querySelectorAll('.stamp')
    expect(stamp?.shadowRoot?.querySelector('time')?.textContent ?? '').toMatch(/42/)
  })
})
