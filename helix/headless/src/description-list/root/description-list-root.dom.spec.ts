import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

const list = async (attrs = ''): Promise<Updatable> => {
  const host = (await mount(`<helix-headless-description-list ${attrs}>
    <helix-headless-description-list-item label="Owner">Ada</helix-headless-description-list-item>
    <helix-headless-description-list-item><span slot="label">Region</span>us-east</helix-headless-description-list-item>
  </helix-headless-description-list>`)) as Updatable
  await host.updateComplete
  for (const item of host.querySelectorAll<Updatable>('helix-headless-description-list-item')) {
    await item.updateComplete
  }
  return host
}

describe('a description list', () => {
  test('is a `<dl>`, and the items are what it holds', async () => {
    /* The items reach the list through its slot, which is how they reach the
       accessibility tree too: flattened, each pair is inside the `<dl>`. */
    const host = await list()
    const dl = part(host, 'list') as HTMLElement
    expect(dl.localName).toBe('dl')
    const slot = dl.querySelector('slot') as HTMLSlotElement
    expect(slot.assignedElements().map((item) => item.localName)).toEqual([
      'helix-headless-description-list-item',
      'helix-headless-description-list-item',
    ])
  })

  test('writes no arrangement onto markup nobody asked for one on', async () => {
    const host = await list()
    expect(host.hasAttribute('direction')).toBe(false)
  })

  test('reflects the arrangement it was given, for a stylesheet to read', async () => {
    const host = await list()
    ;(host as Updatable & { direction?: string }).direction = 'row'
    await host.updateComplete
    expect(host.getAttribute('direction')).toBe('row')
  })
})

describe('a description list item', () => {
  test('is a term and its description, in that order', async () => {
    const host = await list()
    const item = host.querySelector('helix-headless-description-list-item') as HTMLElement
    expect([part(item, 'label')?.localName, part(item, 'value')?.localName]).toEqual(['dt', 'dd'])
  })

  test('takes its label as text, or as content that replaces it', async () => {
    const host = await list()
    const [plain, rich] = host.querySelectorAll('helix-headless-description-list-item')
    const labelled = (item: Element | undefined): HTMLSlotElement =>
      part(item as HTMLElement, 'label')?.querySelector('slot') as HTMLSlotElement
    expect(labelled(plain).textContent).toBe('Owner')
    expect(labelled(rich).assignedElements()[0]?.textContent).toBe('Region')
  })
})
