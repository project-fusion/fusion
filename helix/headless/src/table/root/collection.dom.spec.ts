import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../../tree/index.js')
  await import('../index.js')
})

type Collection = HTMLElement & { loading: boolean; updateComplete: Promise<boolean> }

const settle = async (host: Collection): Promise<void> => {
  await host.updateComplete
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('a collection that is empty or still arriving', () => {
  test('and says it once the count is nothing', async () => {
    const host = (await mount(
      '<helix-headless-tree label="Files"></helix-headless-tree>',
    )) as Collection
    await settle(host)
    expect((part(host, 'empty') as HTMLElement)?.textContent?.trim()).toBe('Nothing to show')
  })

  test('nothing where there are rows', async () => {
    const host = (await mount(
      '<helix-headless-tree label="Files"><helix-headless-tree-item value="a">a</helix-headless-tree-item></helix-headless-tree>',
    )) as Collection
    await settle(host)
    expect(part(host, 'empty')).toBeNull()
  })

  test('loading wins over empty, because it has not answered yet', async () => {
    /* The commonest version of this fault is telling a reader there is nothing
       a moment before there is something. */
    const host = (await mount(
      '<helix-headless-tree label="Files" loading></helix-headless-tree>',
    )) as Collection
    await settle(host)
    expect(part(host, 'empty')).toBeNull()
    expect((part(host, 'loading') as HTMLElement)?.textContent?.trim()).toBe('Loading')
  })

  test('the region says it is changing, on itself and not on the message', async () => {
    // A live region firing on every intermediate state is a reader being read
    // a progress bar.
    const host = (await mount(
      '<helix-headless-tree label="Files" loading></helix-headless-tree>',
    )) as Collection
    await settle(host)
    expect((part(host, 'tree') as HTMLElement).getAttribute('aria-busy')).toBe('true')

    host.loading = false
    await settle(host)
    expect((part(host, 'tree') as HTMLElement).hasAttribute('aria-busy')).toBe(false)
  })

  test('the message is a status, so it is announced once and politely', async () => {
    const host = (await mount(
      '<helix-headless-tree label="Files" loading></helix-headless-tree>',
    )) as Collection
    await settle(host)
    expect((part(host, 'loading') as HTMLElement).getAttribute('role')).toBe('status')
  })

  test("both messages are the consumer's words", async () => {
    const empty = (await mount(
      '<helix-headless-table empty-text="No invoices yet" label="Invoices"></helix-headless-table>',
    )) as Collection
    await settle(empty)
    expect((part(empty, 'empty') as HTMLElement)?.textContent?.trim()).toBe('No invoices yet')

    const busy = (await mount(
      '<helix-headless-table label="Invoices" loading loading-text="Fetching invoices"></helix-headless-table>',
    )) as Collection
    await settle(busy)
    expect((part(busy, 'loading') as HTMLElement)?.textContent?.trim()).toBe('Fetching invoices')
  })

  test('every collection speaks the same two words', async () => {
    // One vocabulary. A reader meeting "Loading" in a menu and a different
    // arrangement of the same idea in a table learns it twice.
    for (const tag of ['helix-headless-tree', 'helix-headless-table']) {
      const host = (await mount(`<${tag} label="X" loading></${tag}>`)) as Collection
      await settle(host)
      expect(part(host, 'loading')).not.toBeNull()
    }
  })
})
