import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const markup = `<helix-tree label="Repository" default-active="web">
  <helix-tree-item default-open value="helix">
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
    const started = host.active

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

    expect(host.active).toBe(started)
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

      const branch = items.find((item) => item.hasAttribute('default-open'))
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

describe('a tree used as navigation follows its links', () => {
  const nav = `<helix-tree label="Docs">
    <helix-tree-item default-open value="components">
      Components
      <helix-tree-item slot="children" value="button"><a href="#button">Button</a></helix-tree-item>
      <helix-tree-item slot="children" value="plain">No link</helix-tree-item>
    </helix-tree-item>
  </helix-tree>`

  const itemNamed = (tree: HTMLElement, value: string): HTMLElement =>
    tree.querySelector(`helix-tree-item[value="${value}"]`) as HTMLElement

  const clicksOn = (tree: HTMLElement, value: string): string[] => {
    const seen: string[] = []
    for (const link of tree.querySelectorAll('a')) {
      link.addEventListener('click', (event) => {
        event.preventDefault()
        seen.push(link.getAttribute('href') ?? '')
      })
    }
    return seen
  }

  test('pressing the row anywhere follows the link in the name', async () => {
    /* A row is wider than the words in it. The indent, the padding, and with
       the chevron at the far end most of the row's width are all outside the
       anchor, so a reader who pressed anywhere but the text got nothing. */
    const tree = await mount(nav)
    const seen = clicksOn(tree, 'button')
    const item = itemNamed(tree, 'button')
    part(item, 'row')?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(seen).toEqual(['#button'])
  })

  test('pressing the words themselves follows it once, not twice', async () => {
    // Following again on a press that already landed on the anchor would route
    // twice wherever a consumer's router is listening.
    const tree = await mount(nav)
    const seen = clicksOn(tree, 'button')
    itemNamed(tree, 'button').querySelector('a')?.click()
    expect(seen).toEqual(['#button'])
  })

  test('Enter follows it too, which is what the keyboard could not do', async () => {
    /* The tree announced the choice and stopped there, so a tree used as
       navigation could be walked with the arrows and never entered: the pointer
       had a link under it to press and the keyboard had nothing. */
    const tree = await mount(nav)
    const seen = clicksOn(tree, 'button')
    const item = itemNamed(tree, 'button')
    ;(item as HTMLElement & { focusItem: () => void }).focusItem()
    part(item, 'item')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'Enter',
      }),
    )
    expect(seen).toEqual(['#button'])
  })

  test('an item with no link is chosen and nothing else happens', async () => {
    const tree = await mount(nav)
    const chosen: string[] = []
    tree.addEventListener('helix-select', (event) =>
      chosen.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    const item = itemNamed(tree, 'plain')
    part(item, 'row')?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(chosen).toEqual(['plain'])
  })

  test('a branch does not follow a link belonging to one of its children', async () => {
    // Its own name is what it follows, not the first anchor in its subtree.
    const tree = await mount(nav)
    const seen = clicksOn(tree, 'button')
    const branch = itemNamed(tree, 'components')
    part(branch, 'row')?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(seen).toEqual([])
  })
})

describe('a branch opening is announced, and can be owned', () => {
  /* It was a bare `this.expanded = !this.expanded`: no event, so a consumer
     could not know a branch had opened, and no mode, so they could not hold it
     either. `AccordionItem` has been on `MixinControllerOpen` all along, and a
     branch showing its children is the same state a disclosure holds. */
  const branch = async (
    attrs = 'default-open',
  ): Promise<
    HTMLElement & { open: boolean; toggleOpen(): boolean; updateComplete: Promise<boolean> }
  > => {
    const tree = (await mount(
      `<helix-tree label="R">
        <helix-tree-item ${attrs} value="a">A
          <helix-tree-item slot="children" value="b">B</helix-tree-item>
        </helix-tree-item>
      </helix-tree>`,
    )) as HTMLElement
    const item = tree.querySelector('helix-tree-item') as HTMLElement & {
      open: boolean
      toggleOpen(): boolean
      updateComplete: Promise<boolean>
    }
    await item.updateComplete
    return item
  }

  test('closing a branch is announced before it happens', async () => {
    const item = await branch()
    let told = true
    item.addEventListener('helix-close', () => {
      told = true
    })
    item.toggleOpen()
    await item.updateComplete
    expect(told).toBe(true)
    expect(item.open).toBe(false)
  })

  test('a refusal leaves the branch as it was', async () => {
    const item = await branch()
    item.addEventListener('helix-close', (event) => event.preventDefault())
    item.toggleOpen()
    await item.updateComplete
    expect(item.open).toBe(true)
  })

  test('open in the markup is the consumer’s, and the branch does not move it', async () => {
    const item = await branch('open')
    item.toggleOpen()
    await item.updateComplete
    expect(item.open).toBe(true)
  })

  test('default-open seeds one that owns itself', async () => {
    const item = await branch()
    item.toggleOpen()
    await item.updateComplete
    expect(item.open).toBe(false)
  })
})
