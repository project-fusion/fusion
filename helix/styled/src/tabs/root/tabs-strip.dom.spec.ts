import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

/* The stylesheet the set adopts, as text. happy-dom resolves no cascade, so
   what can be held here is that a rule exists rather than that it applied. */
const sheet = (tag: string): string => {
  const declared = (customElements.get(tag) as unknown as { styles: unknown }).styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => String((one as { cssText?: string }).cssText ?? ''))
    .join('\n')
}

const strip = `
  <helix-tabs default-active="one" dismiss-marks="hover" emphasis="subtle" label="Pages">
    <helix-tab dismissible value="one">One</helix-tab>
    <helix-tab dismissible value="two">Two</helix-tab>
  </helix-tabs>`

/* Tabs inside a pane's header: a quiet mark, and close marks that wait to be
   wanted, which a browser's tabs have and Tabs drew neither of. */
describe('a strip of tabs', () => {
  test('emphasis and dismiss-marks reflect, and rest on nothing', async () => {
    const host = (await mount('<helix-tabs label="Pages"></helix-tabs>')) as Updatable & {
      dismissMarks?: string
      emphasis?: string
    }
    expect(host.hasAttribute('emphasis')).toBe(false)
    expect(host.hasAttribute('dismiss-marks')).toBe(false)
    host.emphasis = 'subtle'
    host.dismissMarks = 'hover'
    await host.updateComplete
    expect(host.getAttribute('emphasis')).toBe('subtle')
    expect(host.getAttribute('dismiss-marks')).toBe('hover')
  })

  test('subtle draws the mark as a tint, with no edge or shadow', () => {
    const css = sheet('helix-tabs')
    expect(css).toContain(':host([emphasis="subtle"]:not([variant])) [part="indicator"]')
    expect(css).toContain('--_indicator-border: 0')
    expect(css).toContain('--_indicator-shadow: none')
    expect(css).toContain(':host([dismiss-marks="hover"]) {--_tabs-dismiss-rest: 0}')
  })

  test("a tab's text and its close mark follow what the set asks", () => {
    const css = sheet('helix-tab')
    expect(css).toContain('font-size: var(--tabs-tab-font-size, var(--helix-text-control))')
    expect(css).toContain('opacity: var(--_tabs-dismiss-rest, 1)')
  })

  if (hasLayout()) {
    test('only the current tab shows its close mark at rest, and every tab keeps its room', async () => {
      const host = (await mount(strip)) as Updatable
      await host.updateComplete
      const [current, other] = [...host.querySelectorAll('helix-tab')] as HTMLElement[]
      const mark = (tab: HTMLElement) => part(tab, 'dismiss') as HTMLElement
      await new Promise((done) => setTimeout(done, 400))
      expect(getComputedStyle(mark(current as HTMLElement)).opacity).toBe('1')
      expect(getComputedStyle(mark(other as HTMLElement)).opacity).toBe('0')
      expect(mark(other as HTMLElement).getBoundingClientRect().width).toBeGreaterThan(0)
    })
  }
})

/* A page's title can run long, and a tab with one pushed the strip's plus out
   of a pane's header. */
describe("a tab's label", () => {
  test('is a part that shortens with an ellipsis once the tab is capped', () => {
    const css = sheet('helix-tab')
    expect(css).toContain('max-inline-size: var(--tabs-tab-max-inline-size, none)')
    expect(css).toContain('text-overflow: ellipsis')
  })

  if (hasLayout()) {
    test('a capped tab is no wider than its cap, however long its label', async () => {
      const host = (await mount(`
        <helix-tabs label="Pages" style="--tabs-tab-max-inline-size: 8rem">
          <helix-tab value="one">A page whose title runs much longer than any tab should be</helix-tab>
        </helix-tabs>`)) as Updatable
      await host.updateComplete
      const tab = host.querySelector('helix-tab') as HTMLElement
      expect(tab.getBoundingClientRect().width).toBeLessThanOrEqual(128.5)
      const label = part(tab, 'label') as HTMLElement
      expect(label.scrollWidth).toBeGreaterThan(label.clientWidth)
    })
  }
})
