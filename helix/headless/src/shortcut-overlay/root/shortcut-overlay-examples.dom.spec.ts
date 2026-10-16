import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../kbd/index.js')
})

/* An example runs its script only in a browser, so these run there. */
const run = hasLayout() ? test : (): void => {}

describe('the preview example', () => {
  run('shows a badge for each button once the Kbds have written their shortcuts', async () => {
    await example(preview)
    for (let at = 0; at < 3; at += 1) {
      await new Promise((done) => requestAnimationFrame(() => done(undefined)))
    }
    const overlay = document.getElementById('base-overlay') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await overlay.updateComplete
    expect(overlay.shadowRoot?.querySelectorAll('[part="badge"]').length).toBe(3)
  })
})
