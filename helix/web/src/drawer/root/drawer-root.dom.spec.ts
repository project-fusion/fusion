import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../button/index.js')
})

type Updatable = HTMLElement & {
  updateComplete: Promise<unknown>
  open: boolean
  requestOpen(next: boolean): void
}

const markup = `
  <helix-drawer label="Examples">
    <helix-button>Inside</helix-button>
  </helix-drawer>`

describe('drawer', () => {
  test('is a modal dialog by default', async () => {
    const drawer = await mount(markup)
    const panel = part(drawer, 'panel')
    expect(panel?.getAttribute('role')).toBe('dialog')
    expect(panel?.getAttribute('aria-modal')).toBe('true')
    expect(panel?.getAttribute('aria-label')).toBe('Examples')
  })

  test('content stays mounted and inert while closed', async () => {
    // Mounted so it is in the served markup and can animate; inert so it is
    // out of the tab order and the accessibility tree without losing its box.
    const drawer = await mount(markup)
    expect(part(drawer, 'panel')?.hasAttribute('inert')).toBe(true)
    expect(drawer.textContent).toContain('Inside')
  })

  test('opening clears inert and shows the scrim', async () => {
    const drawer = (await mount(markup)) as Updatable
    drawer.requestOpen(true)
    await drawer.updateComplete

    expect(drawer.open).toBe(true)
    expect(part(drawer, 'panel')?.hasAttribute('inert')).toBe(false)
    expect(part(drawer, 'scrim')?.hasAttribute('hidden')).toBe(false)
  })

  test('modal off drops the scrim and the dialog role together', async () => {
    // One decision, not two: trapping without covering strands the reader, and
    // covering without trapping lets them tab behind the cover.
    const drawer = (await mount(
      markup.replace('<helix-drawer ', '<helix-drawer modal="false" '),
    )) as Updatable
    drawer.modal = false
    drawer.requestOpen(true)
    await drawer.updateComplete

    expect(part(drawer, 'panel')?.getAttribute('role')).toBe('region')
    expect(part(drawer, 'scrim')?.hasAttribute('hidden')).toBe(true)
  })

  test('announces its own open changes, like every other open component', async () => {
    const drawer = (await mount(markup)) as Updatable
    let seen: boolean | null = null
    drawer.addEventListener('helix-open', (event) => {
      seen = (event as CustomEvent<{ open: boolean }>).detail.open
    })
    drawer.requestOpen(true)
    expect(seen).toBe(true)
  })

  test('opening moves focus into the panel', async () => {
    // The trap engages on `open`, not on which property changed: uncontrolled
    // state does not live on `open`, so watching that property meant the trap
    // never engaged for the common case.
    const drawer = (await mount(markup)) as Updatable
    drawer.requestOpen(true)
    await drawer.updateComplete
    await new Promise((resolve) => requestAnimationFrame(resolve))

    const inside = drawer.querySelector('helix-button')
    expect(drawer.contains(document.activeElement) || document.activeElement === inside).toBe(true)
  })

  test('Escape closes it', async () => {
    const drawer = (await mount(markup)) as Updatable
    drawer.requestOpen(true)
    await drawer.updateComplete

    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    await drawer.updateComplete
    expect(drawer.open).toBe(false)
  })
})
