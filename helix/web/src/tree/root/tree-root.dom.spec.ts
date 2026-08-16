import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

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

if (hasLayout()) {
  describe('tree alignment', () => {
    test('a leaf and a branch at one depth start their labels in one place', async () => {
      /* The gutter a leaf leaves where a chevron would be was sent down from
         the tree as a whole measurement, and the tree named a different token
         from the one the item draws with: `--helix-size-icon` against
         `--helix-size-icon-sm`. Four pixels, which is small enough to look like
         nothing and large enough that the eye reads two columns where there is
         one list.

         Only a browser can answer it. The values are custom properties resolved
         through two shadow boundaries, and the fault was that two resolutions
         disagreed, so anything short of laying it out and measuring would have
         been asserting the same arithmetic that was already wrong. */
      const tree = (await mount(markup)) as HTMLElement
      const items = [...tree.querySelectorAll('helix-tree-item')]
      const labelX = (item: Element): number =>
        (part(item as HTMLElement, 'label') as HTMLElement).getBoundingClientRect().x

      const branch = items.find((item) => item.hasAttribute('expanded'))
      const leaf = items.find((item) => item.getAttribute('value') === 'cortex')
      if (!branch || !leaf) {
        throw new Error('the fixture no longer holds a branch and a leaf at the top level')
      }

      expect(labelX(branch)).toBeGreaterThan(0)
      expect(labelX(leaf)).toBe(labelX(branch))
    })

    test('a child is indented from its parent, so depth is still visible', async () => {
      /* The other half. Reserving the gutter on every leaf lines the columns up
         and would line them up just as well if the indent had gone missing
         entirely, which is a tree that has stopped being one. */
      const tree = (await mount(markup)) as HTMLElement
      const items = [...tree.querySelectorAll('helix-tree-item')]
      const labelX = (item: Element): number =>
        (part(item as HTMLElement, 'label') as HTMLElement).getBoundingClientRect().x

      const parent = items.find((item) => item.getAttribute('value') === 'helix')
      const child = items.find((item) => item.getAttribute('value') === 'web')
      if (!parent || !child) {
        throw new Error('the fixture no longer holds a parent and a child')
      }
      expect(labelX(child)).toBeGreaterThan(labelX(parent))
    })
  })
}
