import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* The frame, after hydration. The floor's sharing out and the order of
 * painting are held by `blocks.pure.spec.ts`; what is here is what the frame
 * publishes, what it draws until a renderer has, and the keys. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

interface Plot extends HTMLElement {
  active: number
  field: {
    blocks: { label: string; row: number }[]
    groups: string[]
    height: string
    size: string
  }
  rendererDrawn(on?: boolean): void
  updateComplete: Promise<unknown>
}

const table = `<table id="services" data-hidden-visually>
  <caption>Services</caption>
  <thead><tr><th>Service</th><th>Team</th><th>Requests</th><th>Errors</th></tr></thead>
  <tbody>
    <tr><th scope="row">Search</th><td>Platform</td><td>40</td><td>2</td></tr>
    <tr><th scope="row">Billing</th><td>Payments</td><td>25</td><td>9</td></tr>
    <tr><th scope="row">Auth</th><td>Platform</td><td>20</td><td>1</td></tr>
    <tr><th scope="row">Refunds</th><td>Payments</td><td>5</td><td>3</td></tr>
  </tbody>
</table>`

const plot = async (attributes = '') => {
  const host = (await mount(
    `<div>${table}<helix-headless-spatial-treemap for="services" group-by="Team" ${attributes}><div></div></helix-headless-spatial-treemap></div>`,
  )) as HTMLElement
  const element = host.querySelector('helix-headless-spatial-treemap') as Plot
  await element.updateComplete
  return element
}

const key = (element: HTMLElement, name: string) =>
  part(element, 'plot')?.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: name }),
  )

describe('the frame', () => {
  test('publishes a block for each row, its size, its height, and its group', async () => {
    const element = await plot()
    expect(element.field.blocks.map((block) => block.label)).toEqual([
      'Search',
      'Billing',
      'Auth',
      'Refunds',
    ])
    expect(element.field.groups).toEqual(['Platform', 'Payments'])
    expect([element.field.size, element.field.height]).toEqual(['Requests', 'Errors'])
  })

  test("draws each block in its group's color until a renderer has drawn", async () => {
    const element = await plot()
    const blocks = [...(element.shadowRoot?.querySelectorAll('[part~="block"]') ?? [])]
    expect(blocks).toHaveLength(4)
    const colorOf = (label: string) => {
      const index = element.field.blocks.findIndex((block) => block.label === label)
      const block = blocks.find((one) => one.getAttribute('data-index') === String(index))
      return /--chart-series-(\d+)/.exec(block?.getAttribute('style') ?? '')?.[1]
    }
    expect(colorOf('Search')).toBe('1')
    expect(colorOf('Auth')).toBe('1')
    expect(colorOf('Billing')).toBe('2')
    for (const face of element.shadowRoot?.querySelectorAll('[part="face"]') ?? []) {
      expect(face.getAttribute('style')).toMatch(/--spatial-treemap-shade: [\d.]+/)
    }
    element.rendererDrawn()
    await element.updateComplete
    expect(part(element, 'fallback')?.hasAttribute('hidden')).toBe(true)
  })

  test('says what it shows in a sentence', async () => {
    const element = await plot()
    expect(part(element, 'summary')?.textContent).toBe('4 items in 2 groups, sized from 5 to 40.')
  })

  test('the keys walk the items in the table’s order, and the item is ringed', async () => {
    const element = await plot()
    key(element, 'Home')
    key(element, 'ArrowRight')
    await element.updateComplete
    expect(element.active).toBe(1)
    expect(part(element, 'live')?.textContent).toContain('Billing')
    expect(part(element, 'ring')?.previousElementSibling?.getAttribute('data-index')).toBe('1')
    key(element, 'End')
    await element.updateComplete
    expect(part(element, 'live')?.textContent).toContain('Refunds')
  })

  test('a press names the row it was read from', async () => {
    const element = await plot()
    const pressed: number[] = []
    element.addEventListener('helix-reading-press', (event) =>
      pressed.push((event as CustomEvent<{ index: number }>).detail.index),
    )
    key(element, 'Home')
    key(element, 'ArrowRight')
    key(element, 'Enter')
    await element.updateComplete
    expect(pressed).toEqual([1])
  })

  test('with no box, draws the blocks alone', async () => {
    const element = await plot('no-box')
    expect(part(element, 'grid')).toBeNull()
    expect(element.shadowRoot?.querySelectorAll('[part~="block"]')).toHaveLength(4)
  })
})
