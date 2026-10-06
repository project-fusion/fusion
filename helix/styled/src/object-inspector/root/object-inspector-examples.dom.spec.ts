import { beforeAll, describe, expect, test } from 'bun:test'
import { example, hasLayout, idle, registerDom } from '@fusion.dev/helix-testing/dom'
import filter from '../.examples/filter.html' with { type: 'text' }
import preview from '../.examples/preview.html' with { type: 'text' }
import windowed from '../.examples/windowed.html' with { type: 'text' }

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/* Browser only: happy-dom lays nothing out, and runs no script inserted by script. */
const run = hasLayout() ? test : (): void => {}

const inspector = (): HTMLElement => document.querySelector('helix-object-inspector') as HTMLElement
const rows = (): HTMLElement[] => [
  ...(inspector().shadowRoot?.querySelectorAll<HTMLElement>('[part~="row"]') ?? []),
]
const tree = (): HTMLElement =>
  inspector().shadowRoot?.querySelector('[part="tree"]') as HTMLElement
const press = async (key: string): Promise<void> => {
  tree().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }))
  await idle()
}

describe('the preview example', () => {
  run('reads the page’s JSON and opens two levels of it', async () => {
    await example(preview)
    await idle()
    expect(rows().length).toBeGreaterThan(10)
    expect(rows()[0]?.getAttribute('aria-expanded')).toBe('true')
  })

  run('indents each level further than the one it is under', async () => {
    await example(preview)
    await idle()
    const keyAt = (level: string): number => {
      const row = rows().find(
        (one) => one.getAttribute('aria-level') === level && one.querySelector('[part="key"]'),
      )
      return row?.querySelector('[part="key"]')?.getBoundingClientRect().left ?? 0
    }
    expect(keyAt('3')).toBeGreaterThan(keyAt('2'))
  })

  run('every row is one line, so a windowed tree can place them without measuring', async () => {
    await example(preview)
    await idle()
    expect(new Set(rows().map((row) => Math.round(row.getBoundingClientRect().height))).size).toBe(
      1,
    )
  })

  run('a string, a number and a null are three different inks', async () => {
    await example(preview)
    await idle()
    const ink = (part: string): string =>
      getComputedStyle(inspector().shadowRoot?.querySelector(`[part="${part}"]`) as Element).color
    expect(new Set([ink('string'), ink('number'), ink('null')]).size).toBe(3)
  })
})

describe('the windowed example', () => {
  run(
    'draws a box of ten thousand entries and tells each row where it is in all of them',
    async () => {
      await example(windowed)
      await idle()
      await press('ArrowRight')
      const drawn = rows()
      expect(drawn.length).toBeGreaterThan(0)
      expect(drawn.length).toBeLessThan(200)
      expect(
        drawn.find((row) => row.getAttribute('aria-level') === '2')?.getAttribute('aria-setsize'),
      ).toBe('10000')
    },
  )

  run('End reaches the last entry, drawn and focused', async () => {
    await example(windowed)
    await idle()
    rows()[0]?.focus()
    await press('End')
    await idle()
    const focused = inspector().shadowRoot?.activeElement
    expect(focused?.getAttribute('aria-posinset')).toBe('10000')
    expect(focused?.getAttribute('tabindex')).toBe('0')
  })

  /* A jump kept the row it went to drawn beside the window, after it, and
     scrolled to that place: the focused row sat below the box. */
  run('a jump leaves the focused row inside the box', async () => {
    await example(windowed)
    await idle()
    rows()[0]?.focus()
    for (const key of ['PageDown', 'PageDown', 'PageDown', 'End']) {
      await press(key)
      await idle()
      await idle()
      const focused = inspector().shadowRoot?.activeElement as HTMLElement
      const box = tree().getBoundingClientRect()
      const row = focused.getBoundingClientRect()
      expect(focused.getAttribute('part')).toContain('row-active')
      expect(row.top).toBeGreaterThanOrEqual(box.top - 2)
      expect(row.bottom).toBeLessThanOrEqual(box.bottom + 2)
    }
  })

  run('keeps the focused row drawn when it scrolls out of the window', async () => {
    await example(windowed)
    await idle()
    await press('ArrowRight')
    await press('ArrowDown')
    await idle()
    const focused = inspector().shadowRoot?.activeElement as HTMLElement
    tree().scrollTop = 40_000
    tree().dispatchEvent(new Event('scroll'))
    await idle()
    await idle()
    expect(focused.isConnected).toBe(true)
    expect(inspector().shadowRoot?.activeElement === focused).toBe(true)
  })
})

describe('the filter example', () => {
  run('opens on the entries that hold the filter, each on a tinted ground', async () => {
    await example(filter)
    await idle()
    const field = inspector().shadowRoot?.querySelector<HTMLInputElement>('[part="search-field"]')
    expect(field?.value).toBe('sfo1')
    const matched = rows().filter((row) =>
      row.getAttribute('part')?.split(' ').includes('row-match'),
    )
    expect(matched.map((row) => row.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      '1: "sfo1"',
      'region: "sfo1"',
    ])
    const ground = (row: HTMLElement): string => getComputedStyle(row).backgroundColor
    const plain = rows().find((row) => !matched.includes(row)) as HTMLElement
    expect(ground(matched[0] as HTMLElement)).not.toBe(ground(plain))
  })
})
