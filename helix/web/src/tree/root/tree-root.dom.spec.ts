import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const markup = `<helix-tree label="Repository" value="web">
  <helix-tree-item expanded value="helix">
    helix
    <helix-tree-item slot="children" value="web">web</helix-tree-item>
    <helix-tree-item slot="children" value="headless">headless</helix-tree-item>
  </helix-tree-item>
  <helix-tree-item value="cortex">cortex</helix-tree-item>
</helix-tree>`

describe('tree', () => {
  test('is a named tree wrapping its items', async () => {
    const tree = await mount(markup)
    expect(part(tree, 'tree')?.getAttribute('role')).toBe('tree')
    expect(part(tree, 'tree')?.getAttribute('aria-label')).toBe('Repository')
  })

  test('a branch reports its children, a leaf reports none', async () => {
    const tree = await mount(markup)
    const items = [...tree.querySelectorAll('helix-tree-item')] as (HTMLElement & {
      isBranch: boolean
      value: string
    })[]
    const branch = items.find((item) => item.value === 'helix')
    const leaf = items.find((item) => item.value === 'cortex')
    expect(branch?.isBranch).toBe(true)
    expect(leaf?.isBranch).toBe(false)
  })

  test('selecting an item reports its value from the tree', async () => {
    // The item dispatches, the tree listens, because the tree is what a
    // consumer holds a reference to.
    const tree = await mount(markup)
    let seen = ''
    tree.addEventListener('helix-select', (event) => {
      seen = (event as CustomEvent<{ value: string }>).detail.value
    })

    const leaf = [...tree.querySelectorAll('helix-tree-item')].find(
      (item) => item.getAttribute('value') === 'cortex',
    ) as HTMLElement & { select: () => void }
    leaf.select()
    await Promise.resolve()

    expect(seen).toBe('cortex')
  })
})

describe('tree selection can be refused', () => {
  test('a listener that refuses keeps the selection where it was', async () => {
    /* It could not be refused before: the value was written straight from the
       item's event, so `helix-change` was an announcement nobody could answer.
       Tabs had the same hole and both are closed by the same mixin. */
    const host = (await mount(markup)) as Updatable & { value: string }
    await host.updateComplete
    const started = host.value

    host.addEventListener('helix-change', (event) => event.preventDefault())
    const other = [...host.querySelectorAll('helix-tree-item')].find(
      (item) => item.getAttribute('value') !== started && item.getAttribute('value'),
    ) as HTMLElement
    other.dispatchEvent(
      new CustomEvent('helix-select', {
        bubbles: true,
        composed: true,
        detail: { value: other.getAttribute('value') },
      }),
    )
    await host.updateComplete

    expect(host.value).toBe(started)
  })
})
