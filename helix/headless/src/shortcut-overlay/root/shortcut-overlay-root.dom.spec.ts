import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { onApple } from '@fusion.dev/helix-core'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'
import type { HelixHeadlessShortcutOverlay } from './shortcut-overlay-root.js'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../command/index.js')
})

/** A page with an overlay held by Control, a button with a shortcut, and one without. */
const page = async (): Promise<HelixHeadlessShortcutOverlay> => {
  const holder = await mount(`<div>
    <helix-headless-shortcut-overlay hold="ctrl" delay="10"></helix-headless-shortcut-overlay>
    <helix-headless-button aria-keyshortcuts="Control+S">Save</helix-headless-button>
    <helix-headless-button>Cancel</helix-headless-button>
  </div>`)
  return holder.querySelector('helix-headless-shortcut-overlay') as HelixHeadlessShortcutOverlay
}

const press = (type: 'keydown' | 'keyup', key: string, extra: KeyboardEventInit = {}): void => {
  document.dispatchEvent(new KeyboardEvent(type, { bubbles: true, key, ...extra }))
}

const wait = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms))

const badges = (overlay: HelixHeadlessShortcutOverlay): string[] =>
  [...(overlay.shadowRoot?.querySelectorAll('[part="badge"]') ?? [])].map((badge) =>
    (badge.textContent ?? '').replace(/\s+/g, ' ').trim(),
  )

describe('shortcut overlay', () => {
  test('draws a badge for each control with a shortcut while the key is held, and hides on release', async () => {
    const overlay = await page()
    press('keydown', 'Control')
    await wait(30)
    await overlay.updateComplete
    expect(badges(overlay)).toEqual([onApple() ? '⌃S Save' : 'Ctrl+S Save'])
    expect(overlay.shadowRoot?.querySelector('[part="badges"]')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
    press('keyup', 'Control')
    await overlay.updateComplete
    expect(badges(overlay)).toEqual([])
  })

  test('draws nothing when another key is pressed during the hold', async () => {
    const overlay = await page()
    press('keydown', 'Control')
    press('keydown', 'k', { ctrlKey: true })
    await wait(30)
    await overlay.updateComplete
    expect(overlay.showing).toBe(false)
  })

  test('opens the sheet on ?, listing the controls’ shortcuts and the page’s own', async () => {
    const overlay = await page()
    const command = document.createElement('helix-headless-command')
    document.body.append(command)
    press('keydown', '?', { shiftKey: true })
    await overlay.updateComplete
    const rows = [...(overlay.shadowRoot?.querySelectorAll('[part="row"]') ?? [])].map((row) => [
      row.querySelector('[part="name"]')?.textContent,
      row.querySelector('[part="keys"]')?.textContent,
    ])
    /* Named as the keyboard in front of the reader names them: WebKit's agent says Apple. */
    expect(rows).toEqual(
      onApple()
        ? [
            ['Save', '⌃S'],
            ['Open Commands', '⌘K'],
          ]
        : [
            ['Save', 'Ctrl+S'],
            ['Open Commands', 'Ctrl+K'],
          ],
    )
    command.remove()
  })

  test('leaves ? to a text field, and to the page when sheet-keys is empty', async () => {
    const overlay = await page()
    overlay.sheetKeys = ''
    await overlay.updateComplete
    press('keydown', '?', { shiftKey: true })
    await overlay.updateComplete
    expect(overlay.shadowRoot?.querySelector('[part="row"]')).toBeNull()
  })

  test('says so when the page has no shortcuts', async () => {
    const overlay = (await mount(
      '<helix-headless-shortcut-overlay></helix-headless-shortcut-overlay>',
    )) as HelixHeadlessShortcutOverlay
    overlay.showSheet()
    await overlay.updateComplete
    expect(overlay.shadowRoot?.querySelector('[part="empty"]')?.textContent).toBe(
      'No shortcuts on this screen.',
    )
  })
})
