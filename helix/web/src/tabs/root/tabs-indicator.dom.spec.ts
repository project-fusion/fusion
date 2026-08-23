import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

const markup = `
  <helix-tabs default-active="one">
    <helix-tabs-tab value="one">One</helix-tabs-tab>
    <helix-tabs-tab value="two">Two</helix-tabs-tab>
    <helix-tabs-tab disabled value="three">Three</helix-tabs-tab>
    <helix-tabs-panel slot="panels" value="one">First</helix-tabs-panel>
    <helix-tabs-panel slot="panels" value="two">Second</helix-tabs-panel>
    <helix-tabs-panel slot="panels" value="three">Third</helix-tabs-panel>
  </helix-tabs>`

/* Where the mark lands, which is the stylesheet's answer and so stays on this
   tier. The staging rule below selects `helix-tabs::part()`, so it reaches the
   styled element and nothing else, and the rest of Tabs, selection, keyboard,
   refusal and the controlled contract, is behaviour and moved to the base. */
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
