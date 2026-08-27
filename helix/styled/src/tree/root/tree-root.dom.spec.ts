import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@helix-io/testing/dom'

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
  describe('a link inside a branch row', () => {
    /* Browser-only, and why is the point of it.
     *
     * The first version sat with the other tree tests and passed against a
     * component that was broken: happy-dom does not carry a click on slotted
     * light-DOM content up to the shadow element holding the slot, so the row
     * handler never ran and nothing was asserted. In Chrome it runs, and the
     * branch collapsed on the way out of the link.
     *
     * A spec that cannot see the fault it names is worse than none, because it
     * reads as coverage. */
    test('goes where it points and leaves the branch as it was', async () => {
      const tree = (await mount(
        `<helix-tree label="R">
          <helix-tree-item default-open value="a">A
            <a href="#elsewhere" id="aside" slot="end">Docs</a>
            <helix-tree-item slot="children" value="b">B</helix-tree-item>
          </helix-tree-item>
        </helix-tree>`,
      )) as HTMLElement
      const item = tree.querySelector('helix-tree-item') as HTMLElement & {
        open: boolean
        updateComplete: Promise<boolean>
      }
      await item.updateComplete
      expect(item.open).toBe(true)

      const link = tree.querySelector('#aside') as HTMLAnchorElement
      link.addEventListener('click', (event) => event.preventDefault())
      link.click()
      await item.updateComplete
      expect(item.open).toBe(true)
    })
  })
}

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
    test('a child is one gutter in from its parent, wherever the chevron sits', async () => {
      /* Depth is the thing being read, and it reads the same on both sides.
         Measured: 28 and 48 with the chevron on the left, 8 and 28 with it at
         the end. */
      for (const attrs of ['', 'chevron-placement="end"']) {
        const items = await laidOut(attrs)
        const parent = labelX(named(items, 'helix'))
        const child = labelX(named(items, 'web'))
        expect(parent).toBeGreaterThan(0)
        expect(child).toBeGreaterThan(parent)
      }
    })

    test('and a leaf beside a branch shares its column', async () => {
      /* This used to be a trade, and the spec here pinned it as one: lining a
         leaf up with the branch next to it and lining a child up with its
         parent could not both be had, because a branch's label was one gutter
         into its own row and a leaf's was not. A leaf reserves nothing it does
         not have now, so both are true at once and the trade is gone. */
      for (const attrs of ['', 'chevron-placement="end"']) {
        const items = await laidOut(attrs)
        expect(labelX(named(items, 'cortex'))).toBe(labelX(named(items, 'helix')))
      }
    })

    test('moving the chevron moves the whole tree, and nothing within it', async () => {
      /* The chevron on the left is a column before the first level, so taking it
         away shifts every row by that one column and leaves every relationship
         inside the tree where it was. It used to be the parent alone that moved,
         which is what made a leaf and a branch disagree.

         Each tree is measured before the next is mounted. `mount` writes the
         body, so holding on to the first one's elements and reading them after
         the second arrives measures nodes that are no longer in a document, and
         every rect comes back zero. */
      const first = await laidOut()
      const before = {
        cortex: labelX(named(first, 'cortex')),
        helix: labelX(named(first, 'helix')),
        web: labelX(named(first, 'web')),
      }
      const second = await laidOut('chevron-placement="end"')
      const after = {
        cortex: labelX(named(second, 'cortex')),
        helix: labelX(named(second, 'helix')),
        web: labelX(named(second, 'web')),
      }
      const shift = before.helix - after.helix
      expect(shift).toBeGreaterThan(0)
      expect(before.web - after.web).toBe(shift)
      expect(before.cortex - after.cortex).toBe(shift)
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

  const clicksOn = (tree: HTMLElement, _value: string): string[] => {
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
       navigation flavor of the pattern. */
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
    item.addEventListener('helix-before-close', () => {
      told = true
    })
    item.toggleOpen()
    await item.updateComplete
    expect(told).toBe(true)
    expect(item.open).toBe(false)
  })

  test('a refusal leaves the branch as it was', async () => {
    const item = await branch()
    item.addEventListener('helix-before-close', (event) => event.preventDefault())
    item.toggleOpen()
    await item.updateComplete
    expect(item.open).toBe(true)
  })

  test('open in the markup is a seed, and the branch still closes', async () => {
    /* Asserted the opposite until 26 Aug 2026, when declaring the property was a
       claim of ownership and the element announced without moving. Control is
       an action now: it applies, and a consumer refuses to take the decision.
       See 294. */
    const item = await branch('open')
    item.toggleOpen()
    await item.updateComplete
    expect(item.open).toBe(false)
  })

  test('and refusing the close is what holds it open', async () => {
    const item = await branch('open')
    item.addEventListener('helix-before-close', (event: Event) => {
      event.preventDefault()
    })
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

  /* The documentation nav, which is where this was reported twice.
   *
   * `active` on the tree *is* controlled, answered by navigating, and the
   * branch below it is seeded with `default-open` and owns itself. Those are
   * two different properties on two different elements and the suspicion in
   * #119 was that the first was reaching the second: a branch that would not
   * close after a client route change, and did after a refresh.
   *
   * It does not reproduce, measured six ways on the running site, and the
   * reason it cannot is worth pinning rather than leaving to a paragraph.
   * `MixinControllerOpen` decides ownership from whether anything set `open`
   * by the first update, and nothing here ever sets `open`: the nav writes
   * `default-open`, which is a different property with a different name. A
   * tree's `active` moving cannot make an item's `open` controlled. */
  test('a controlled `active` on the tree leaves a seeded branch its own', async () => {
    const tree = (await mount(
      `<helix-tree active="b" label="R">
        <helix-tree-item default-open value="a">A
          <helix-tree-item slot="children" value="b">B</helix-tree-item>
        </helix-tree-item>
      </helix-tree>`,
    )) as HTMLElement & { active: string; updateComplete: Promise<boolean> }
    await tree.updateComplete
    const item = tree.querySelector('helix-tree-item') as HTMLElement & {
      open: boolean
      toggleOpen(): boolean
      updateComplete: Promise<boolean>
    }
    await item.updateComplete

    item.toggleOpen()
    await item.updateComplete
    expect(item.open).toBe(false)
  })

  test('a branch a reader closed stays closed when the route moves under it', async () => {
    /* The second half of the same report, and the one a fresh-load test cannot
       see: `active` changing is what a client navigation looks like from the
       tree's side, and it must not re-open what somebody collapsed. */
    const tree = (await mount(
      `<helix-tree active="b" label="R">
        <helix-tree-item default-open value="a">A
          <helix-tree-item slot="children" value="b">B</helix-tree-item>
          <helix-tree-item slot="children" value="c">C</helix-tree-item>
        </helix-tree-item>
      </helix-tree>`,
    )) as HTMLElement & { active: string; updateComplete: Promise<boolean> }
    await tree.updateComplete
    const item = tree.querySelector('helix-tree-item') as HTMLElement & {
      open: boolean
      toggleOpen(): boolean
      updateComplete: Promise<boolean>
    }
    item.toggleOpen()
    await item.updateComplete
    expect(item.open).toBe(false)

    tree.active = 'c'
    await tree.updateComplete
    await item.updateComplete
    expect(item.open).toBe(false)
  })
})
