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
  run('each row is stamped with how long ago it happened', async () => {
    await example(preview)
    await idle()
    const stamps = [...document.querySelectorAll('helix-headless-notification')].map((one) =>
      one.shadowRoot
        ?.querySelector('helix-headless-format-date')
        ?.shadowRoot?.querySelector('time')
        ?.textContent?.trim(),
    )
    expect(stamps.every((one) => one !== undefined && one !== '')).toBe(true)
    expect(new Set(stamps).size).toBe(stamps.length)
  })
})
