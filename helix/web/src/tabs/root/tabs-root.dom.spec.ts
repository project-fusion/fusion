import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

const markup = `
  <helix-tabs value="one">
    <helix-tabs-tab value="one">One</helix-tabs-tab>
    <helix-tabs-tab value="two">Two</helix-tabs-tab>
    <helix-tabs-tab disabled value="three">Three</helix-tabs-tab>
    <helix-tabs-panel slot="panels" value="one">First</helix-tabs-panel>
    <helix-tabs-panel slot="panels" value="two">Second</helix-tabs-panel>
    <helix-tabs-panel slot="panels" value="three">Third</helix-tabs-panel>
  </helix-tabs>`

const tabs = (host: HTMLElement) => [...host.querySelectorAll('helix-tabs-tab')] as Updatable[]
const panels = (host: HTMLElement) => [...host.querySelectorAll('helix-tabs-panel')] as Updatable[]

describe('tabs selection', () => {
  test('shows the panel matching the selected tab', async () => {
    const host = await mount(markup)
    expect(tabs(host)[0]?.hasAttribute('selected')).toBe(true)
    expect(panels(host)[0]?.hasAttribute('selected')).toBe(true)
    expect(panels(host)[1]?.hasAttribute('selected')).toBe(false)
  })

  test('choosing a tab moves the panel with it', async () => {
    const host = (await mount(markup)) as Updatable
    const second = tabs(host)[1] as Updatable & { select(): void }
    second.select()
    await host.updateComplete

    expect(second.hasAttribute('selected')).toBe(true)
    expect(panels(host)[1]?.hasAttribute('selected')).toBe(true)
    expect(panels(host)[0]?.hasAttribute('selected')).toBe(false)
  })

  test('a disabled tab cannot be chosen', async () => {
    const host = (await mount(markup)) as Updatable
    const third = tabs(host)[2] as Updatable & { select(): void }
    third.select()
    await host.updateComplete
    expect(third.hasAttribute('selected')).toBe(false)
  })

  test('pairing is by value, so ids survive server rendering', async () => {
    // Derived rather than generated: a generated id differs between the
    // server's render and the client's, and aria-controls pointing at nothing
    // is worse than not being there.
    const host = await mount(markup)
    const tab = part(tabs(host)[0] as HTMLElement, 'tab')
    const panel = part(panels(host)[0] as HTMLElement, 'panel')
    expect(tab?.getAttribute('aria-controls')).toBe('panel-one')
    expect(panel?.id).toBe('panel-one')
    expect(panel?.getAttribute('aria-labelledby')).toBe('tab-one')
    expect(tab?.id).toBe('tab-one')
  })

  test('content stays mounted when its tab is not the current one', async () => {
    // So anything typed into a panel is still there on return, and so the
    // content is in the markup for a crawler whichever tab is open.
    const host = await mount(markup)
    expect(host.textContent).toContain('Second')
  })
})

describe('tabs keyboard', () => {
  const press = (host: HTMLElement, key: string) => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
    ;(tabs(host).find((tab) => tab.hasAttribute('selected')) as HTMLElement).dispatchEvent(event)
    return event
  }

  test('arrows move selection and wrap past the ends', async () => {
    const host = (await mount(markup)) as Updatable
    press(host, 'ArrowRight')
    await host.updateComplete
    expect(tabs(host)[1]?.hasAttribute('selected')).toBe(true)

    // Three is disabled, so right from two wraps to one rather than stopping.
    press(host, 'ArrowRight')
    await host.updateComplete
    expect(tabs(host)[0]?.hasAttribute('selected')).toBe(true)
  })

  test('Home and End reach the ends', async () => {
    const host = (await mount(markup)) as Updatable
    press(host, 'End')
    await host.updateComplete
    expect(tabs(host)[1]?.hasAttribute('selected')).toBe(true)

    press(host, 'Home')
    await host.updateComplete
    expect(tabs(host)[0]?.hasAttribute('selected')).toBe(true)
  })

  test('manual holds selection until the tab is chosen', async () => {
    const host = (await mount(markup.replace('<helix-tabs ', '<helix-tabs manual '))) as Updatable
    press(host, 'ArrowRight')
    await host.updateComplete
    // Focus moved; selection did not.
    expect(tabs(host)[0]?.hasAttribute('selected')).toBe(true)
  })

  test('an unrelated key is left to the page', async () => {
    const host = await mount(markup)
    expect(press(host, 'PageDown').defaultPrevented).toBe(false)
  })
})
