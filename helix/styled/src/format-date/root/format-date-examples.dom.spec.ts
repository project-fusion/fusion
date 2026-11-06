import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }
import relative from '../.examples/relative.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../text/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the preview example', () => {
  run('the page stamps the elapsed time, and it reads as time since', async () => {
    await example(preview)
    await idle()
    const [stamp] = document.querySelectorAll('.stamp')
    const text = stamp?.shadowRoot?.querySelector('time')?.textContent ?? ''
    expect(text).toMatch(/42/)
  })
})

describe('the relative example', () => {
  run('the page dates each reading, which read three hours ago and in two days', async () => {
    await example(relative)
    await idle()
    const words = [...document.querySelectorAll('helix-format-date')].map(
      (stamp) => stamp.shadowRoot?.querySelector('time')?.getAttribute('aria-label') ?? '',
    )
    expect(words).toEqual(['3 hours ago', '3 hours ago', '3 hours ago', 'in 2 days'])
  })
})
