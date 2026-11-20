import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* A dialog longer than the window scrolls its body alone, so the title and the
   actions stay on the screen however long the words or large the text. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const run = hasLayout() ? test : (): void => {}

const WORDS = Array.from({ length: 80 }, (_, index) => `<p>Line ${index + 1} of the terms.</p>`)

describe('a Dialog longer than the window', () => {
  run('keeps its title and its actions in the panel, and scrolls its body', async () => {
    const root = await mount(
      `<div><helix-dialog label="Terms" open>
        <h2 slot="header">Terms</h2>
        ${WORDS.join('')}
        <div slot="footer"><button>Accept</button></div>
      </helix-dialog></div>`,
    )
    const host = root.querySelector('helix-dialog') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await host.updateComplete
    const surface = host.shadowRoot?.querySelector('[part="surface"]') as HTMLElement
    const body = host.shadowRoot?.querySelector('[part="body"]') as HTMLElement
    const panel = surface.getBoundingClientRect()
    const title = (root.querySelector('[slot="header"]') as HTMLElement).getBoundingClientRect()
    const action = (root.querySelector('button') as HTMLElement).getBoundingClientRect()
    /* The panel is no taller than the window, and holds still. */
    expect(panel.height).toBeLessThanOrEqual(window.innerHeight)
    expect(surface.scrollHeight).toBeLessThanOrEqual(surface.clientHeight)
    /* The body scrolls, between the title and the action, which stay inside the panel. */
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
    expect(title.top).toBeGreaterThanOrEqual(panel.top)
    expect(action.bottom).toBeLessThanOrEqual(panel.bottom)
    expect(action.height).toBeGreaterThan(0)
  })
})
