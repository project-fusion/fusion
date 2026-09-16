import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

const item = async (attributes: string, inner: string): Promise<Updatable> => {
  const host = (await mount(
    `<helix-headless-description-list-item ${attributes}>${inner}</helix-headless-description-list-item>`,
  )) as Updatable
  await host.updateComplete
  return host
}

const slotIn = (host: HTMLElement, name: string): HTMLSlotElement =>
  part(host, name)?.querySelector('slot') as HTMLSlotElement

/**
 * One pair, and the contract that is the pair's rather than the list's.
 *
 * **The list already proves the arrangement**, which is that the items reach the
 * `<dl>` through its slot. What one item decides alone is that its label is a
 * `<dt>` and its value the `<dd>` after it, and that the label property is the
 * fallback of the label slot rather than a second thing drawn beside it.
 */
describe('one description list pair', () => {
  test('is a term and its description, in that order', async () => {
    const host = await item('label="Owner"', 'Ada')
    expect([part(host, 'label')?.localName, part(host, 'value')?.localName]).toEqual(['dt', 'dd'])
  })

  /* A content property is its slot's fallback, so the two can never show at
     once: a slotted label replaces the text rather than appearing beside it. */
  test('takes its label as text, or as content that replaces it', async () => {
    const plain = await item('label="Owner"', 'Ada')
    const rich = await item('label="Owner"', '<span slot="label">Region</span>us-east')
    expect(slotIn(plain, 'label').textContent).toBe('Owner')
    expect(slotIn(rich, 'label').assignedElements()[0]?.textContent).toBe('Region')
  })

  test('the value is the default slot, so it takes anything richer than text', async () => {
    const host = await item('label="Owner"', '<a href="/ada">Ada</a>')
    const slot = slotIn(host, 'value')
    expect(slot.name).toBe('')
    expect(slot.assignedElements().map((one) => one.localName)).toEqual(['a'])
  })

  test('writes no attribute of its own onto markup nobody asked for one on', async () => {
    const host = await item('label="Owner"', 'Ada')
    expect(host.getAttributeNames()).toEqual(['label'])
  })
})
