import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  mount,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'

/* Options drawn as tiles, an image above each label, in a listbox laid out in
   a grid. Where each box lands only a browser computes, so run these with
   `bun run specs:browser listbox`. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
})

const geometry = hasLayout() ? test : (): void => {}

type List = HTMLElement & Updatable & { value: string }

/** A photo of `width` by `height`, drawn as a flat SVG so no request is made. */
const photo = (width: number, height: number): string =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="teal"/></svg>`)}`

const tiles = async (count = 7, width = 400): Promise<List> => {
  const options = Array.from(
    { length: count },
    (_, at) =>
      `<helix-option value="t${at}"><img slot="media" alt="" src="${photo(width, 300)}">Tile ${at}</helix-option>`,
  ).join('')
  const host = (await mount(
    `<helix-listbox label="Cover photo" layout="grid" default-value="t1" style="inline-size: 30rem; --listbox-column-min-inline-size: 8rem; --listbox-max-block-size: none">${options}</helix-listbox>`,
  )) as List
  await settle(host)
  for (const option of host.querySelectorAll('helix-option')) {
    await settle(option as unknown as Updatable)
  }
  return host
}

const rect = (element: Element | null | undefined): DOMRect =>
  (element as Element).getBoundingClientRect()

const item = (option: Element): Element | null | undefined =>
  option.shadowRoot?.querySelector('[part~="item"]')

const label = (option: Element): Element | null | undefined =>
  option.shadowRoot?.querySelector('[part="label"]')

describe('an option with an image', () => {
  geometry('draws the image across the tile, above a label on one line', async () => {
    const host = await tiles()
    for (const option of host.querySelectorAll('helix-option')) {
      const image = rect(option.querySelector('img'))
      const row = rect(item(option))
      const words = rect(label(option))
      expect(image.bottom).toBeLessThanOrEqual(words.top)
      expect(image.left).toBeGreaterThanOrEqual(row.left)
      expect(image.right).toBeLessThanOrEqual(row.right)
      expect(image.width).toBeGreaterThan(row.width * 0.75)
      expect(image.width / image.height).toBeCloseTo(4 / 3, 1)
      expect(words.height).toBeLessThan(image.height / 2)
    }
  })

  geometry('a photo wider than its column stays in it', async () => {
    const host = await tiles(3, 2400)
    const first = host.querySelector('helix-option[value="t0"]') as Element
    const second = host.querySelector('helix-option[value="t1"]') as Element
    expect(rect(first).right).toBeLessThanOrEqual(rect(second).left + 1)
    expect(rect(first.querySelector('img')).width).toBeLessThanOrEqual(rect(first).width)
  })

  geometry('Right moves along a row of tiles, and Down to the tile below', async () => {
    const host = await tiles()
    const options = [...host.querySelectorAll('helix-option')]
    const columns = options.filter((one) => rect(one).top === rect(options[0]).top).length
    expect(columns).toBeGreaterThan(1)
    const key = async (name: string): Promise<void> => {
      host.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: name }),
      )
      await settle(host)
    }
    await key('ArrowRight')
    expect(host.value).toBe('t2')
    await key('ArrowDown')
    expect(host.value).toBe(`t${2 + columns}`)
  })

  geometry('the highlight and the check are drawn on the tile', async () => {
    const host = await tiles()
    const chosen = host.querySelector('helix-option[value="t1"]') as Element
    const other = host.querySelector('helix-option[value="t4"]') as Element
    ;(chosen as unknown as { active: boolean }).active = true
    await settle(chosen as unknown as Updatable)
    expect(getComputedStyle(item(chosen) as Element).backgroundColor).not.toBe(
      getComputedStyle(item(other) as Element).backgroundColor,
    )
    const check = getComputedStyle(item(chosen) as Element, '::after')
    expect(check.content).not.toBe('none')
    expect(getComputedStyle(item(other) as Element, '::after').content).toBe('none')
  })

  geometry('an option with no image keeps a long label on its one line', async () => {
    const host = (await mount(
      `<helix-listbox label="Size" layout="grid" style="inline-size: 20rem"><helix-option value="a">${'A very long label that has to be cut '.repeat(3)}</helix-option></helix-listbox>`,
    )) as List
    await settle(host)
    const option = host.querySelector('helix-option') as Element
    await settle(option as unknown as Updatable)
    const words = label(option) as HTMLElement
    expect(words.scrollWidth).toBeGreaterThan(words.clientWidth)
    expect(rect(words).height).toBeLessThan(
      2 * Number.parseFloat(getComputedStyle(words).fontSize) + 1,
    )
  })
})
