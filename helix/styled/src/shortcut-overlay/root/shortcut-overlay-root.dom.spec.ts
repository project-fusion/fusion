import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, mount, registerDom } from '@fusion.dev/helix-testing/dom'
import preview from '../.examples/preview.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../kbd/index.js')
  await import('../../toolbar/index.js')
})

const frames = async (count: number): Promise<void> => {
  for (let at = 0; at < count; at += 1) {
    await new Promise((done) => requestAnimationFrame(() => done(undefined)))
  }
}

/* An example runs its script only in a browser, so these run there. */
const run = hasLayout() ? test : (): void => {}

describe('the preview example', () => {
  run('shows a badge for each button, with its keys and its name', async () => {
    await example(preview)
    await frames(3)
    const overlay = document.getElementById('overlay') as HTMLElement & {
      updateComplete: Promise<unknown>
    }
    await overlay.updateComplete
    const names = [...(overlay.shadowRoot?.querySelectorAll('[part="badge-name"]') ?? [])].map(
      (name) => name.textContent,
    )
    expect(names).toEqual(['Bold', 'Italic', 'Link'])
  })
})

describe('shortcut overlay', () => {
  test('opens the sheet in this tier’s dialog', async () => {
    const overlay = (await mount(
      '<helix-shortcut-overlay></helix-shortcut-overlay>',
    )) as HTMLElement & {
      showSheet: () => void
      updateComplete: Promise<unknown>
    }
    overlay.showSheet()
    await overlay.updateComplete
    expect(overlay.shadowRoot?.querySelector('helix-dialog[part="sheet"]')).not.toBeNull()
  })
})
