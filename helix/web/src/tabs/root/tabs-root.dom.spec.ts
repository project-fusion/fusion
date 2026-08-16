import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

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

describe('tabs selection can be refused', () => {
  test('a listener that refuses keeps the tab where it was', async () => {
    /* It could not be refused before: the value was written straight from the
       item's event, so `helix-change` was an announcement nobody could answer,
       while `Radio.Group` two folders away could be. Whether a selection can be
       refused should not depend on which component is being looked at. */
    const host = (await mount(markup)) as Updatable & { value: string }
    await host.updateComplete
    const started = host.value

    host.addEventListener('helix-change', (event) => event.preventDefault())
    const other = [...host.querySelectorAll('helix-tabs-tab')].find(
      (tab) => tab.getAttribute('value') !== started,
    ) as HTMLElement
    other.dispatchEvent(
      new CustomEvent('helix-select', {
        bubbles: true,
        composed: true,
        detail: { value: other.getAttribute('value') },
      }),
    )
    await host.updateComplete

    expect(host.value).toBe(started)
  })

  test('a disabled first tab is not made current by default', async () => {
    // The hand-written fallback was `?? tabs[0]`, which took whatever was
    // first, so a set opening on a disabled tab showed it as current and
    // brought its panel with it.
    document.body.innerHTML = `<helix-tabs label="Set">
      <helix-tabs-tab disabled value="a">A</helix-tabs-tab>
      <helix-tabs-tab value="b">B</helix-tabs-tab>
      <helix-tabs-panel slot="panels" value="a">A</helix-tabs-panel>
      <helix-tabs-panel slot="panels" value="b">B</helix-tabs-panel>
    </helix-tabs>`
    const host = document.body.firstElementChild as Updatable
    await host.updateComplete

    const tabs = [...host.querySelectorAll('helix-tabs-tab')] as (HTMLElement & {
      selected: boolean
    })[]
    expect(tabs[0]?.selected).toBe(false)
    expect(tabs[1]?.selected).toBe(true)
  })
})

if (hasLayout()) {
  describe('tabs indicator geometry', () => {
    /* Taller than its tabs, which is the case every example misses. A strip
       that is only tabs is exactly as tall as they are, so a mark pinned to the
       top of the strip sits on the tab by accident and the bug is invisible.
       The sandbox's panel puts 32px tabs in a 48px row and the mark drew seven
       and a half pixels above the label it was marking.

       The transition is off because what is being asserted is where the mark
       goes, not how it gets there: read while it is animating, every one of
       these is the value it started from. */
    const stage = (): HTMLStyleElement => {
      const style = document.createElement('style')
      style.textContent = `
        helix-tabs::part(tabs) { align-items: center; min-block-size: 64px; }
        helix-tabs::part(indicator) { transition: none; }`
      document.head.append(style)
      return style
    }

    test('the mark covers the selected tab rather than the top of the strip', async () => {
      const style = stage()
      try {
        const tabs = (await mount(markup)) as Updatable
        await tabs.updateComplete
        const indicator = part(tabs, 'indicator') as HTMLElement
        const selected = tabs.querySelector('[value="one"]') as HTMLElement

        const mark = indicator.getBoundingClientRect()
        const tab = selected.getBoundingClientRect()

        /* Greater than zero first. Every assertion below is an equality, and a
           mark that was never placed is zero by zero at the strip's origin,
           which would satisfy an equality against a tab that had also failed to
           lay out. */
        expect(tab.height).toBeGreaterThan(0)
        expect(Math.round(mark.top)).toBe(Math.round(tab.top))
        expect(Math.round(mark.left)).toBe(Math.round(tab.left))
        expect(Math.round(mark.width)).toBe(Math.round(tab.width))
        expect(Math.round(mark.height)).toBe(Math.round(tab.height))
      } finally {
        style.remove()
      }
    })

    test('the mark is placed at all, without anything having to update it', async () => {
      /* `tabs` filters `this.children` on `instanceof`, so it is empty until the
         tab elements upgrade, and the host measured before that: no selected
         tab, so `place` refused. The ResizeObserver's one initial callback
         landed in the same gap, the host never resized again, and the mark
         stayed unplaced for the life of the page. `slotchange` now measures as
         well as pairing. */
      const style = stage()
      try {
        const tabs = (await mount(markup)) as Updatable
        await tabs.updateComplete
        expect((part(tabs, 'indicator') as HTMLElement).hasAttribute('data-placed')).toBe(true)
      } finally {
        style.remove()
      }
    })
  })
}
