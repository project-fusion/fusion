import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import colors from '../.examples/colors.html' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../flex/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the confetti examples', () => {
  for (const [name, markup, press, words] of [
    ['preview', preview, 'publish', 'Your page is published.'],
    ['colors', colors, 'finish', 'Your workspace is ready.'],
  ] as const) {
    run(`${name}: the press says the action is done in words, and bursts`, async () => {
      await example(markup)
      const confetti = document.getElementById('confetti') as HTMLElement & {
        burst: () => Promise<void>
      }
      let burst = 0
      const own = confetti.burst.bind(confetti)
      confetti.burst = () => {
        burst += 1
        return own()
      }
      ;(document.getElementById(press) as HTMLElement).click()
      await idle()
      expect(document.getElementById('said')?.textContent).toBe(words)
      expect(burst).toBe(1)
    })
  }
})
