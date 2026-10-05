import { beforeAll, describe, expect, test } from 'bun:test'
import { label, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

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

/**
 * A `<dl>` takes no name in ARIA 1.2, so a name written on the host landed on
 * a generic wrapper and was dropped. Named, the host is a group and carries
 * the name; unnamed, it adds nothing to the tree.
 */
describe('a named description list', () => {
  test('is a group named by its label', async () => {
    const host = await list('label="Server details"')
    expect(role(host)).toBe('group')
    expect(label(host)).toBe('Server details')
    expect(host.hasAttribute('role')).toBe(false)
  })

  test('is a group when the name is written on it as aria-label or aria-labelledby', async () => {
    expect(role(await list('aria-label="Server details"'))).toBe('group')
    expect(role(await list('aria-labelledby="heading"'))).toBe('group')
  })

  test('a name added later makes it a group, and one taken off undoes it', async () => {
    const host = await list()
    expect(role(host)).toBeNull()
    host.setAttribute('aria-label', 'Server details')
    await host.updateComplete
    expect(role(host)).toBe('group')
    host.removeAttribute('aria-label')
    await host.updateComplete
    expect(role(host)).toBeNull()
  })
})
