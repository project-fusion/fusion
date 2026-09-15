import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Inspector = HTMLElement & {
  defaultDepth: number
  updateComplete: Promise<unknown>
  value: unknown
}

const VALUE = {
  meta: { branch: 'main' },
  name: 'dpl',
  ok: true,
  size: 42,
  tags: ['a', 'b'],
  target: null,
}

const inspector = async (attrs = '', value: unknown = VALUE): Promise<Inspector> => {
  const host = (await mount(
    `<helix-headless-object-inspector ${attrs}></helix-headless-object-inspector>`,
  )) as Inspector
  host.value = value
  await host.updateComplete
  return host
}

const rows = (host: HTMLElement): HTMLElement[] => [
  ...(host.shadowRoot?.querySelectorAll<HTMLElement>('[part~="row"]') ?? []),
]
const tree = (host: HTMLElement): HTMLElement =>
  host.shadowRoot?.querySelector('[part="tree"]') as HTMLElement
const press = async (host: Inspector, key: string, init: KeyboardEventInit = {}): Promise<void> => {
  tree(host).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key, ...init }))
  await host.updateComplete
}
const active = (host: HTMLElement): HTMLElement | undefined =>
  rows(host).find((row) => row.hasAttribute('data-active'))

describe('an object inspector', () => {
  test('opens the root and nothing under it, so the shape shows before the contents', async () => {
    const host = await inspector()
    expect(rows(host)).toHaveLength(7)
    expect(rows(host)[0]?.getAttribute('aria-expanded')).toBe('true')
    const meta = rows(host).find((row) => row.textContent?.includes('meta'))
    expect(meta?.getAttribute('aria-expanded')).toBe('false')
  })

  test('draws each type as its own part, and a string keeps its quotes', async () => {
    const host = await inspector()
    const part = (name: string): string | undefined =>
      host.shadowRoot?.querySelector(`[part="${name}"]`)?.textContent ?? undefined
    expect([part('string'), part('number'), part('boolean'), part('null')]).toEqual([
      '"dpl"',
      '42',
      'true',
      'null',
    ])
  })

  test('says how many entries a branch holds, open or closed', async () => {
    const host = await inspector()
    const counts = [...(host.shadowRoot?.querySelectorAll('[part="count"]') ?? [])].map((count) =>
      count.textContent?.trim(),
    )
    expect(counts).toEqual(['6 keys', '1 key', '2 items'])
  })

  test('is a tree whose rows say their real level, position and set size', async () => {
    const host = await inspector()
    expect(tree(host).getAttribute('role')).toBe('tree')
    const name = rows(host)[2]
    expect([
      name?.getAttribute('role'),
      name?.getAttribute('aria-level'),
      name?.getAttribute('aria-posinset'),
      name?.getAttribute('aria-setsize'),
    ]).toEqual(['treeitem', '2', '2', '6'])
  })

  test('points the tree at the row the keys are on, and moves it with the arrows', async () => {
    const host = await inspector()
    expect(tree(host).getAttribute('aria-activedescendant')).toBe(active(host)?.id ?? null)
    await press(host, 'ArrowDown')
    await press(host, 'ArrowDown')
    expect(active(host)?.textContent).toContain('name')
    await press(host, 'End')
    expect(active(host)?.textContent).toContain('target')
    await press(host, 'Home')
    expect(active(host)).toBe(rows(host)[0])
  })

  test('the row the keys are on is a part of its own, and the name moves with it', async () => {
    const host = await inspector()
    const named = (): HTMLElement[] =>
      rows(host).filter((row) => (row.getAttribute('part') ?? '').split(' ').includes('row-active'))
    expect(named()).toEqual([active(host) as HTMLElement])
    await press(host, 'ArrowDown')
    expect(named()).toEqual([rows(host)[1] as HTMLElement])
  })

  test('opens a branch with Right, enters it with Right, and goes back up with Left', async () => {
    const host = await inspector()
    await press(host, 'ArrowDown')
    await press(host, 'ArrowRight')
    expect(active(host)?.getAttribute('aria-expanded')).toBe('true')
    await press(host, 'ArrowRight')
    expect(active(host)?.textContent).toContain('branch')
    await press(host, 'ArrowLeft')
    expect(active(host)?.textContent).toContain('meta')
    await press(host, 'ArrowLeft')
    expect(active(host)?.getAttribute('aria-expanded')).toBe('false')
  })

  /* A shut row's caret points along the line, so on a right-to-left page it
     points left and the left arrow is the one that opens. The right arrow had
     opened a row whose caret pointed away from it. */
  describe('on a right-to-left page', () => {
    afterEach(() => {
      document.documentElement.removeAttribute('dir')
    })

    test('opens and enters with Left, and goes back up with Right', async () => {
      document.documentElement.dir = 'rtl'
      const host = await inspector()
      await press(host, 'ArrowDown')
      await press(host, 'ArrowLeft')
      expect(active(host)?.getAttribute('aria-expanded')).toBe('true')
      await press(host, 'ArrowLeft')
      expect(active(host)?.textContent).toContain('branch')
      await press(host, 'ArrowRight')
      expect(active(host)?.textContent).toContain('meta')
      await press(host, 'ArrowRight')
      expect(active(host)?.getAttribute('aria-expanded')).toBe('false')
      await press(host, 'ArrowRight')
      expect(active(host)).toBe(rows(host)[0])
    })
  })

  test('copies the active row: a branch as JSON, a string as itself', async () => {
    const written: string[] = []
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => void written.push(text) },
    })
    const host = await inspector()
    await press(host, 'ArrowDown')
    await press(host, 'c', { metaKey: true })
    await press(host, 'ArrowDown')
    await press(host, 'c', { ctrlKey: true })
    await Promise.resolve()
    expect(written).toEqual([JSON.stringify({ branch: 'main' }, null, 2), 'dpl'])
  })

  test('opens as many levels as it is asked to', async () => {
    const host = await inspector('default-depth="2"')
    expect(rows(host)).toHaveLength(10)
  })

  test('reads its value from the JSON a page holds, by id', async () => {
    const host = (await mount(`<div>
      <script type="application/json" id="source">{"a": [1, 2]}</script>
      <helix-headless-object-inspector for="source"></helix-headless-object-inspector>
    </div>`)) as HTMLElement
    const element = host.querySelector('helix-headless-object-inspector') as Inspector
    await element.updateComplete
    await element.updateComplete
    expect(rows(element).map((row) => row.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      '{…} 1 key',
      'a: […] 2 items',
    ])
  })

  test('leaves a source that does not parse empty rather than throwing', async () => {
    const host = (await mount(`<div>
      <script type="application/json" id="broken">{"a": </script>
      <helix-headless-object-inspector for="broken"></helix-headless-object-inspector>
    </div>`)) as HTMLElement
    const element = host.querySelector('helix-headless-object-inspector') as Inspector
    await element.updateComplete
    expect(rows(element)).toHaveLength(0)
  })
})
