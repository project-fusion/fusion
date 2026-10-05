import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, registerDom } from '@fusion.dev/helix-testing/dom'
import highlight from '../.examples/highlight.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the highlight example', () => {
  run('draws the keywords the highlighter marks, and copies the code as written', async () => {
    await example(highlight)
    const block = document.getElementById('highlighted') as HTMLElement & {
      updateComplete: Promise<boolean>
    }
    await block.updateComplete
    const code = block.shadowRoot?.querySelector('[part="code"]')
    expect([...(code?.querySelectorAll('span') ?? [])].map((span) => span.textContent)).toEqual([
      'const',
    ])
    const copy = block.shadowRoot?.querySelector('[part="copy"]') as HTMLElement & {
      value: string
    }
    expect(copy.value.startsWith("const save = document.querySelector('helix-button')")).toBe(true)
    expect(block.shadowRoot?.querySelectorAll('pre')).toHaveLength(1)
  })
})
