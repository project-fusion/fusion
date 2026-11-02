import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* The composer's sheet does not take `field.css`, so its placeholder took the
   browser's #757575 until it named the muted ink. Measured November 1, 2026: 4.25:1
   on the dark composer, and 7.57:1 with the ink. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const run = hasLayout() ? test : (): void => {}

describe('the composer placeholder', () => {
  for (const mode of ['light', 'dark']) {
    run(`takes the muted ink in ${mode}`, async () => {
      const root = await mount(
        `<div data-color-mode="${mode}">
          <span id="ink" style="color: var(--helix-color-foreground-muted)"></span>
          <helix-chat-composer placeholder="Write a message"></helix-chat-composer>
        </div>`,
      )
      const host = root.querySelector('helix-chat-composer') as HTMLElement & {
        updateComplete: Promise<unknown>
      }
      await host.updateComplete
      const field = host.shadowRoot?.querySelector('[part="field"]') as Element
      const ink = getComputedStyle(root.querySelector('#ink') as Element).color
      expect(getComputedStyle(field, '::placeholder').color).toBe(ink)
    })
  }
})
