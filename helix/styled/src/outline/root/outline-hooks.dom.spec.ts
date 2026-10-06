import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* What the outline's hooks change, which only a browser computes. Run them
   with `bun run specs:browser outline`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const geometry = hasLayout() ? test : (): void => {}

const outline = async (style = ''): Promise<HTMLElement & Updatable> => {
  const host = (await mount(
    `<helix-outline style="${style}"><a href="#one">One</a><a href="#two" data-level="2">Two</a></helix-outline>`,
  )) as HTMLElement & Updatable
  await settle(host)
  return host
}

describe('outline hooks', () => {
  geometry(
    'the links, the rule and the mark take the hooks, and keep their look without them',
    async () => {
      const plain = await outline()
      const before = getComputedStyle(plain.querySelector('a') as HTMLElement)
      expect(before.color).not.toBe('rgb(2, 2, 2)')
      const hooked = await outline(
        '--outline-link-color: rgb(2, 2, 2); --outline-link-font-size: 20px; --outline-link-padding-inline: 6px; --outline-link-radius: 7px; --outline-rule-color: rgb(4, 4, 4); --outline-indicator-color: rgb(1, 1, 1)',
      )
      const [one, two] = [...hooked.querySelectorAll('a')] as HTMLElement[]
      expect(getComputedStyle(one as HTMLElement).color).toBe('rgb(2, 2, 2)')
      expect(getComputedStyle(one as HTMLElement).fontSize).toBe('20px')
      expect(getComputedStyle(one as HTMLElement).borderTopLeftRadius).toBe('7px')
      // The second level is the inline padding and one indent of 12 pixels.
      expect(getComputedStyle(two as HTMLElement).paddingInlineStart).toBe('18px')
      const nav = hooked.shadowRoot?.querySelector('[part="nav"]') as HTMLElement
      expect(getComputedStyle(nav).backgroundImage).toContain('rgb(4, 4, 4)')
      const mark = hooked.shadowRoot?.querySelector('[part="indicator"]') as HTMLElement
      expect(getComputedStyle(mark).backgroundColor).toBe('rgb(1, 1, 1)')
    },
  )
})
