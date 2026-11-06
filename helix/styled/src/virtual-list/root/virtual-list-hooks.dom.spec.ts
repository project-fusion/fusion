import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* What the hooks change, and the viewport's own scrollbar, which only a browser
   computes. Run them with `bun run specs:browser virtual-list`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const geometry = hasLayout() ? test : (): void => {}

type List = HTMLElement & Updatable & Record<string, unknown>

const list = async (style = ''): Promise<List> => {
  const host = (await mount(
    `<helix-virtual-list label="People" selection-mode="multiple" value="b" loading style="${style}"></helix-virtual-list>`,
  )) as List
  host.renderItem = (item: string) => item
  host.items = ['a', 'b', 'c']
  await settle(host)
  return host
}

describe('virtual list hooks', () => {
  geometry('a chosen row takes the selected fill, and the hook replaces it', async () => {
    const plain = await list()
    const chosen = plain.querySelector('[aria-selected="true"]') as HTMLElement
    const other = plain.querySelector('[aria-selected="false"]') as HTMLElement
    expect(getComputedStyle(chosen).backgroundColor).not.toBe(
      getComputedStyle(other).backgroundColor,
    )
    const hooked = await list('--virtual-list-selected-background-color: rgb(1, 2, 3)')
    const row = hooked.querySelector('[aria-selected="true"]') as HTMLElement
    expect(getComputedStyle(row).backgroundColor).toBe('rgb(1, 2, 3)')
  })

  geometry('the loading row takes its color and padding from the hooks', async () => {
    const host = await list(
      '--virtual-list-loading-color: rgb(4, 5, 6); --virtual-list-loading-padding: 7px',
    )
    const row = host.shadowRoot?.querySelector('[part="loading"]') as HTMLElement
    expect(getComputedStyle(row).color).toBe('rgb(4, 5, 6)')
    expect(getComputedStyle(row).paddingTop).toBe('7px')
  })
})

describe('the viewport', () => {
  geometry('draws the thin scrollbar Scroll Area and Chat draw, with no track', async () => {
    const host = await list()
    const viewport = host.shadowRoot?.querySelector('[part="viewport"]') as HTMLElement
    expect(getComputedStyle(viewport).scrollbarWidth).toBe('thin')
    expect(getComputedStyle(viewport).scrollbarColor).toMatch(/ (transparent|rgba\(0, 0, 0, 0\))$/)
  })

  const TOKENS =
    '--helix-scrollbar-thumb-color: rgb(1, 2, 3); --helix-scrollbar-track-color: rgb(4, 5, 6)'

  geometry('takes the shared scrollbar tokens for its thumb and track', async () => {
    const host = await list(TOKENS)
    const viewport = host.shadowRoot?.querySelector('[part="viewport"]') as HTMLElement
    expect(getComputedStyle(viewport).scrollbarColor).toBe('rgb(1, 2, 3) rgb(4, 5, 6)')
  })

  geometry('takes the family hooks before the tokens', async () => {
    const host = await list(`${TOKENS}; --virtual-list-scrollbar-thumb-color: rgb(7, 8, 9)`)
    const viewport = host.shadowRoot?.querySelector('[part="viewport"]') as HTMLElement
    expect(getComputedStyle(viewport).scrollbarColor).toBe('rgb(7, 8, 9) rgb(4, 5, 6)')
  })
})

/* The stylesheets the element adopts, as text, with a broken fallback joined.
   happy-dom resolves no cascade, so this holds that the rule exists. */
const sheet = (): string => {
  const declared = (customElements.get('helix-virtual-list') as unknown as { styles: unknown })
    .styles
  return (Array.isArray(declared) ? declared : [declared])
    .flat(Number.POSITIVE_INFINITY)
    .map((one) => {
      const styles = one as { cssRules?: ArrayLike<{ cssText: string }>; cssText?: string }
      return styles.cssText ?? Array.from(styles.cssRules ?? [], (rule) => rule.cssText).join('\n')
    })
    .join('\n')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/,\s+/g, ', ')
}

describe("the viewport's scrollbar colors", () => {
  test('fall back from the hooks to the shared scrollbar tokens', () => {
    const text = sheet()
    expect(text).toContain(
      'var(--virtual-list-scrollbar-thumb-color, var(--helix-scrollbar-thumb-color))',
    )
    expect(text).toContain(
      'var(--virtual-list-scrollbar-thumb-hover-color, var(--helix-scrollbar-thumb-hover-color))',
    )
    expect(text).toContain(
      'var(--virtual-list-scrollbar-track-color, var(--helix-scrollbar-track-color))',
    )
    expect(text).not.toContain('scrollbar-color: var(--helix-color-border)')
  })

  test('step up while the pointer is over the list', () => {
    const hovered = sheet().split('[part="viewport"]:where(:hover) {')[1]?.split('}')[0] ?? ''
    expect(hovered).toContain('scrollbar-color')
    expect(hovered).toContain('--helix-scrollbar-thumb-hover-color')
  })
})
