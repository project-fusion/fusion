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
    'the dismiss button takes the callout away, and focus moves on to the button after it',
    async () => {
      await example(dismissible)
      const tip = document.getElementById('tip') as HTMLElement
      const dismiss = part(tip, 'dismiss') as HTMLElement
      dismiss.focus()
      dismiss.click()
      await idle()
      await new Promise((done) => requestAnimationFrame(() => done(undefined)))
      expect(document.getElementById('tip')).toBeNull()
      expect(document.activeElement?.localName).toBe('helix-button')
    },
  )
})
