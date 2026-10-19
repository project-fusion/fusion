import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
  await import('../../option/index.js')
})

type Palette = HTMLElement & { open: boolean; updateComplete: Promise<boolean> }

const settle = async (host: Palette): Promise<void> => {
  await host.updateComplete
  await new Promise((resolve) => setTimeout(resolve, 0))
}

const listbox = (host: Palette): HTMLElement & { requestFilter: (next: string) => boolean } =>
  part(host, 'listbox') as HTMLElement & { requestFilter: (next: string) => boolean }

/** The rows the palette shows for controls on screen, by their words. */
const controlRows = (host: Palette): string[] =>
  [...(listbox(host).querySelectorAll('[value^="helix-control:"]') ?? [])]
    .filter((row) => !(row as HTMLElement).hidden)
    .map((row) => (row.getAttribute('text-value') ?? '').trim())

const page = async (controls = true): Promise<{ button: HTMLElement; host: Palette }> => {
  const holder = await mount(`<div>
    <nav aria-label="Report">
      <helix-headless-button id="export">Export report</helix-headless-button>
      <helix-headless-button unlisted>Hidden from the palette</helix-headless-button>
    </nav>
    <helix-headless-command ${controls ? 'controls' : ''} label="Commands">
      <helix-headless-option value="new">New report</helix-headless-option>
    </helix-headless-command>
  </div>`)
  const host = holder.querySelector('helix-headless-command') as Palette
  host.open = true
  await settle(host)
  return { button: holder.querySelector('#export') as HTMLElement, host }
}

describe('a palette with controls', () => {
  test('lists the controls on screen once the reader types, and only what matches', async () => {
    const { host } = await page()
    expect(controlRows(host)).toEqual([])
    listbox(host).requestFilter('rep')
    await settle(host)
    await settle(host)
    expect(controlRows(host)).toEqual(['Export report'])
    const group = listbox(host).querySelector('[value^="helix-control:"]')?.parentElement
    expect(group?.getAttribute('label')).toBe('On this screen')
  })

  test('closes and presses the control that is chosen', async () => {
    const { button, host } = await page()
    let pressed = 0
    button.addEventListener('click', () => {
      pressed += 1
    })
    listbox(host).requestFilter('export')
    await settle(host)
    await settle(host)
    const field = listbox(host).shadowRoot?.querySelector('[part="search-field"]') as HTMLElement
    for (const key of ['ArrowDown', 'Enter']) {
      field.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
      )
      await settle(host)
    }
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    expect(host.open).toBe(false)
    expect(pressed).toBe(1)
  })

  test('lists no controls unless asked', async () => {
    const { host } = await page(false)
    listbox(host).requestFilter('rep')
    await settle(host)
    expect(controlRows(host)).toEqual([])
  })
})

describe('an inline palette with controls', () => {
  test('reads the controls when typing starts, though it never opens', async () => {
    const holder = await mount(`<div>
      <helix-headless-button>Export report</helix-headless-button>
      <helix-headless-command controls inline label="Commands"></helix-headless-command>
    </div>`)
    const host = holder.querySelector('helix-headless-command') as Palette
    await settle(host)
    listbox(host).requestFilter('export')
    await settle(host)
    await settle(host)
    expect(controlRows(host)).toEqual(['Export report'])
  })
})
