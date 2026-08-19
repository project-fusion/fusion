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
    const labelX = (item: Element): number =>
      (part(item as HTMLElement, 'label') as HTMLElement).getBoundingClientRect().x

    const laidOut = async (attrs = ''): Promise<HTMLElement[]> => {
      const tree = (await mount(`<helix-tree label="Repository" ${attrs}>
        <helix-tree-item default-open value="helix">
          helix
          <helix-tree-item slot="children" value="web">web</helix-tree-item>
        </helix-tree-item>
        <helix-tree-item value="cortex">cortex</helix-tree-item>
      </helix-tree>`)) as HTMLElement
      return [...tree.querySelectorAll('helix-tree-item')] as HTMLElement[]
    }

    const named = (items: HTMLElement[], value: string): HTMLElement => {
      const found = items.find((item) => item.getAttribute('value') === value)
      if (!found) {
        throw new Error(`the fixture no longer holds ${value}`)
      }
      return found
    }

    /* Only a browser can answer any of this. The indent is a custom property
       resolved through two shadow boundaries and multiplied by a depth the tree
       writes on the row, so anything short of laying it out and measuring would
       be asserting the same arithmetic that produced it. */
    test('a child starts where its parent does, when the chevron is on the left', async () => {
      /* The chevron column is the indent. A branch's own chevron pushes its
         label right by exactly one gutter and its children are one level
         deeper, so the two land on the same column. */
      const items = await laidOut()
      expect(labelX(named(items, 'helix'))).toBeGreaterThan(0)
      expect(labelX(named(items, 'web'))).toBe(labelX(named(items, 'helix')))
    })

    test('and is indented from it when there is no chevron on the left', async () => {
      // Nothing pushes the branch's label there, so it sits at its row's own
      // inset and its child stays one gutter in.
      const items = await laidOut('chevron-placement="end"')
      expect(labelX(named(items, 'web'))).toBeGreaterThan(labelX(named(items, 'helix')))
    })

    test('the child does not move when the chevron does, only the parent', async () => {
      /* Which is the point of reserving nothing on a leaf: depth is a fact about
         the tree and does not change because a control moved sides.

         Each tree is measured before the next is mounted. `mount` writes the
         body, so holding on to the first one's elements and reading them after
         the second arrives measures nodes that are no longer in a document, and
         every rect comes back zero. */
      const first = await laidOut()
      const before = { helix: labelX(named(first, 'helix')), web: labelX(named(first, 'web')) }
      const second = await laidOut('chevron-placement="end"')
      const after = { helix: labelX(named(second, 'helix')), web: labelX(named(second, 'web')) }
      expect(after.web).toBe(before.web)
      expect(after.helix).toBeLessThan(before.helix)
    })

    test('a leaf beside a branch sits where that branch keeps its chevron', async () => {
      /* The trade, pinned so it is a decision rather than a surprise. Lining a
         leaf up with the branch next to it and lining a child up with its
         parent cannot both be had: a branch's label is one gutter into its own
         row and a leaf's is not. Depth is the thing being read. */
      const items = await laidOut()
      expect(labelX(named(items, 'cortex'))).toBeLessThan(labelX(named(items, 'helix')))
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

describe('a tree item that is a link', () => {
  const linked = `<helix-tree label="Docs">
    <helix-tree-item default-open href="/components" value="components">
      Components
      <helix-tree-item href="/components/button" slot="children" value="button">Button</helix-tree-item>
    </helix-tree-item>
  </helix-tree>`

  const itemNamed = (tree: HTMLElement, value: string): HTMLElement =>
    tree.querySelector(`helix-tree-item[value="${value}"]`) as HTMLElement

  test('the row is the anchor, so the whole row is the target', async () => {
    /* With the link slotted into the name instead, a 240px row had a 57px
       anchor in it: everything outside the words was dead. */
    const tree = await mount(linked)
    const row = part(itemNamed(tree, 'button'), 'row') as HTMLElement
    expect(row.tagName).toBe('A')
    expect(row.getAttribute('href')).toBe('/components/button')
  })

  test('and the row is the treeitem, since an anchor cannot hold the group', async () => {
    /* The group holds more anchors and nesting them is invalid. So the row
       carries the semantics and the wrapper drops to `none`, which is the
       navigation flavour of the pattern. */
    const tree = await mount(linked)
    const item = itemNamed(tree, 'button')
    expect(part(item, 'item')?.getAttribute('role')).toBe('none')
    expect(part(item, 'item')?.hasAttribute('tabindex')).toBe(false)
    const row = part(item, 'row') as HTMLElement
    expect(row.getAttribute('role')).toBe('treeitem')
    expect(row.getAttribute('aria-level')).toBe('2')
    expect(row.hasAttribute('tabindex')).toBe(true)
  })

  test('without an href nothing moves, and the wrapper keeps the semantics', async () => {
    const tree = await mount(markup)
    const item = tree.querySelector('helix-tree-item[value="web"]') as HTMLElement
    expect(part(item, 'item')?.getAttribute('role')).toBe('treeitem')
    expect((part(item, 'row') as HTMLElement).tagName).toBe('DIV')
  })

  test('the tab stop follows the semantics onto the row', async () => {
    const tree = await mount(linked)
    const item = itemNamed(tree, 'button') as HTMLElement & { focusItem: () => void }
    item.focusItem()
    expect(item.shadowRoot?.activeElement).toBe(part(item, 'row'))
  })

  test('a linked branch goes where it points, and its chevron opens it', async () => {
    /* A branch that is not a link toggles from anywhere in its row, because
       there is nowhere else for the press to mean. One that is a link has both
       jobs and they need separate targets.

       The press is caught before the browser acts on it. These are real anchors
       with real `href`s, and in a real engine following one takes the whole page
       with it, which ends the run rather than failing a test. */
    const tree = await mount(linked)
    const stay = (event: Event) => event.preventDefault()
    document.addEventListener('click', stay)
    const branch = itemNamed(tree, 'components') as HTMLElement & { open: boolean }
    expect(branch.open).toBe(true)

    part(branch, 'row')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }),
    )
    await (tree as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete
    expect(branch.open).toBe(true)

    part(branch, 'toggle')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }),
    )
    await (branch as unknown as { updateComplete: Promise<boolean> }).updateComplete
    expect(branch.open).toBe(false)
    document.removeEventListener('click', stay)
  })

  test('an unlinked branch still toggles from anywhere in its row', async () => {
    const tree = await mount(markup)
    const branch = tree.querySelector('helix-tree-item[value="helix"]') as HTMLElement & {
      open: boolean
      updateComplete: Promise<boolean>
    }
    expect(branch.open).toBe(true)
    part(branch, 'row')?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await branch.updateComplete
    expect(branch.open).toBe(false)
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
