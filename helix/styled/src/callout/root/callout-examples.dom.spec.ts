import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, part, registerDom } from '@fusion.dev/helix-testing/dom'
import dismissible from '../.examples/dismissible.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../flex/index.js')
  await import('../../button/index.js')
})

/* Browser only: happy-dom does not run a script inserted by script. */
const run = hasLayout() ? test : (): void => {}

describe('the dismissible example', () => {
  run(
    'the dismiss button folds the callout away, focus moves on, and Show tip brings it back',
    async () => {
      await example(dismissible)
      const tip = document.getElementById('tip') as HTMLElement & { open: boolean }
      const dismiss = part(tip, 'dismiss') as HTMLElement
      dismiss.focus()
      dismiss.click()
      for (let wait = 0; wait < 40 && !tip.hidden; wait += 1) {
        await new Promise((done) => setTimeout(done, 50))
      }
      expect(tip.hidden).toBe(true)
      expect(document.activeElement?.localName).toBe('helix-button')
      ;(document.getElementById('show-tip') as HTMLElement).click()
      await idle()
      expect(tip.open).toBe(true)
      expect(tip.hidden).toBe(false)
    },
  )
})
