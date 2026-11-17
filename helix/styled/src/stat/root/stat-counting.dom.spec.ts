import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import counting from '../.examples/counting.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the counting example', () => {
  run('Refresh sets new figures, and each comes to rest on its new value', async () => {
    await example(counting)
    const readers = document.getElementById('readers') as HTMLElement & { value: number }
    ;(document.getElementById('refresh') as HTMLElement).click()
    await idle()
    expect(Number.isInteger(readers.value)).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(part(readers, 'value')?.textContent).toBe(readers.value.toLocaleString('en-US'))
  })
})
