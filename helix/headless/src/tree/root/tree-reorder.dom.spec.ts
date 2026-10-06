import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

/* A `reorderable` tree: Alt with an arrow moves the focused item among its
   siblings at once, and a grip on each row is dragged, or clicked to pick the
   item up and clicked on a sibling to drop it there. Each step is said in the
   tree's live region. The page moves the items, so the specs that move one
   answer `helix-reorder` as a page would. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Updatable = HTMLElement & { updateComplete: Promise<unknown> }

interface Tree extends Updatable {
  canceledLabel: string
  movedLabel: string
  reorderable: boolean
}

interface Item extends Updatable {
  disabled: boolean
  focusItem(): void
  open: boolean
}

interface Detail {
  from: number
  key: string
  keys: string[]
  kind: string
  to: number
  value: string
}

const trees: Tree[] = []
afterEach(() => {
  for (const one of trees.splice(0)) {
    one.remove()
  }
})

const itemsOf = (tree: Tree): Item[] =>
  [...tree.querySelectorAll('helix-headless-tree-item')] as Item[]

const settle = async (tree: Tree): Promise<void> => {
  for (let round = 0; round < 3; round += 1) {
    await tree.updateComplete
    await Promise.all(itemsOf(tree).map((item) => item.updateComplete))
  }
}

/* A branch, open, holding three files, and two items beside it at the top. */
const make = async (extra = 'reorderable'): Promise<Tree> => {
  const tree = (await mount(`<helix-headless-tree label="Files" ${extra}>
    <helix-headless-tree-item value="src" open>src
      <helix-headless-tree-item slot="children" value="a">a.ts</helix-headless-tree-item>
      <helix-headless-tree-item slot="children" value="b">b.ts</helix-headless-tree-item>
      <helix-headless-tree-item slot="children" value="c">c.ts</helix-headless-tree-item>
    </helix-headless-tree-item>
    <helix-headless-tree-item value="readme">README</helix-headless-tree-item>
    <helix-headless-tree-item value="license">LICENSE</helix-headless-tree-item>
  </helix-headless-tree>`)) as Tree
  trees.push(tree)
  await settle(tree)
  return tree
}

const item = (tree: Tree, value: string): Item => tree.querySelector(`[value="${value}"]`) as Item

const grip = (one: Item): Element | null => part(one, 'grip')

/* From the element that holds focus for the item, as a key would come. */
const press = (one: Item, key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
    ...init,
  })
  ;(part(one, 'item') as HTMLElement).dispatchEvent(event)
  return event
}

const click = (target: Element): MouseEvent => {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
  target.dispatchEvent(event)
  return event
}

/* Words land on the render after the move. */
const spoken = async (tree: Tree): Promise<string> => {
  await settle(tree)
  return part(tree, 'live')?.textContent?.trim() ?? ''
}

/** Answers each move as a page would, by putting the siblings in the new order. */
const follow = (tree: Tree): Detail[] => {
  const heard: Detail[] = []
  tree.addEventListener('helix-reorder', (event) => {
    const detail = (event as CustomEvent<Detail>).detail
    heard.push(detail)
    const moved = item(tree, detail.key)
    const parent = moved.parentElement as HTMLElement
    for (const key of detail.keys) {
      parent.append(item(tree, key))
    }
  })
  return heard
}

const order = (parent: Element): string[] =>
  [...parent.children]
    .filter((child) => child.localName === 'helix-headless-tree-item')
    .map((child) => child.getAttribute('value') ?? '')

describe('a tree that does not reorder', () => {
  test('draws no grip, and Alt with an arrow moves nothing', async () => {
    const tree = await make('')
    const heard = follow(tree)
    expect(itemsOf(tree).map((one) => grip(one))).toEqual([null, null, null, null, null, null])
    press(item(tree, 'a'), 'ArrowDown', { altKey: true })
    expect(heard).toEqual([])
    expect(order(item(tree, 'src'))).toEqual(['a', 'b', 'c'])
  })
})

describe('a reorderable tree', () => {
  test('draws a grip on every row, hidden from screen readers, and none on a disabled item', async () => {
    const tree = await make()
    item(tree, 'b').disabled = true
    await settle(tree)
    expect(grip(item(tree, 'a'))?.getAttribute('aria-hidden')).toBe('true')
    expect(grip(item(tree, 'src'))).not.toBeNull()
    expect(grip(item(tree, 'b'))).toBeNull()
    /* A disabled sibling is in the order, and the others move past it. */
    const heard = follow(tree)
    press(item(tree, 'a'), 'ArrowDown', { altKey: true })
    expect(heard.map((one) => one.keys)).toEqual([['b', 'a', 'c']])
    press(item(tree, 'b'), 'ArrowDown', { altKey: true })
    expect(heard).toHaveLength(1)
  })

  test('Alt with Down moves the focused item a place among its siblings, asking first', async () => {
    const tree = await make()
    const asked: Detail[] = []
    tree.addEventListener('helix-before-reorder', (event) =>
      asked.push((event as CustomEvent<Detail>).detail),
    )
    const heard = follow(tree)
    const down = press(item(tree, 'a'), 'ArrowDown', { altKey: true })
    expect(down.defaultPrevented).toBe(true)
    const detail = { from: 0, key: 'a', keys: ['b', 'a', 'c'], kind: 'item', to: 1, value: 'b,a,c' }
    expect(asked).toEqual([detail])
    expect(heard).toEqual([detail])
    expect(order(item(tree, 'src'))).toEqual(['b', 'a', 'c'])
    expect(await spoken(tree)).toBe('a.ts moved to position 2 of 3')
  })

  test('moves an item only among its siblings, never into another branch', async () => {
    const tree = await make()
    const heard = follow(tree)
    press(item(tree, 'src'), 'End', { altKey: true })
    expect(heard.map((one) => one.keys)).toEqual([['readme', 'license', 'src']])
    press(item(tree, 'c'), 'ArrowDown', { altKey: true })
    expect(heard).toHaveLength(1)
  })

  test('gives focus back to the moved item once the page has moved it', async () => {
    const tree = await make()
    follow(tree)
    const moving = item(tree, 'a')
    moving.focusItem()
    press(moving, 'ArrowDown', { altKey: true })
    await settle(tree)
    await new Promise((done) => setTimeout(done, 0))
    expect(moving.shadowRoot?.activeElement).toBe(part(moving, 'item'))
  })

  test('a refused move is said as canceled, and nothing moves', async () => {
    const tree = await make()
    tree.addEventListener('helix-before-reorder', (event) => event.preventDefault())
    const heard = follow(tree)
    press(item(tree, 'readme'), 'ArrowUp', { altKey: true })
    expect(heard).toEqual([])
    expect(await spoken(tree)).toBe('Canceled')
  })

  test('a click on a grip picks the item up without choosing it, and a click on a sibling drops it there', async () => {
    const tree = await make()
    const heard = follow(tree)
    const chosen: string[] = []
    tree.addEventListener('helix-select', (event) =>
      chosen.push((event as CustomEvent<{ value: string }>).detail.value),
    )
    click(grip(item(tree, 'c')) as Element)
    expect(await spoken(tree)).toBe('Picked up c.ts')
    expect(hasState(item(tree, 'c'), 'dragging')).toBe(true)
    click(part(item(tree, 'a'), 'row') as Element)
    expect(heard.map((one) => one.keys)).toEqual([['c', 'a', 'b']])
    expect(chosen).toEqual([])
    expect(await spoken(tree)).toBe('Dropped')
    expect(hasState(item(tree, 'c'), 'dragging')).toBe(false)
  })

  test('the arrows move an item picked up by its grip, and mark where it lands', async () => {
    const tree = await make()
    const heard = follow(tree)
    click(grip(item(tree, 'a')) as Element)
    press(item(tree, 'a'), 'ArrowDown')
    await settle(tree)
    expect(hasState(item(tree, 'b'), 'drop-after')).toBe(true)
    expect(await spoken(tree)).toBe('a.ts moved to position 2 of 3')
    press(item(tree, 'a'), 'Escape')
    await settle(tree)
    expect(heard).toEqual([])
    expect(hasState(item(tree, 'b'), 'drop-after')).toBe(false)
    expect(await spoken(tree)).toBe('Canceled')
  })

  test('the words are the page’s to change', async () => {
    const tree = await make('reorderable moved-label="{name} is now {position} of {count}"')
    follow(tree)
    press(item(tree, 'license'), 'Home', { altKey: true })
    expect(await spoken(tree)).toBe('LICENSE is now 1 of 3')
  })
})
