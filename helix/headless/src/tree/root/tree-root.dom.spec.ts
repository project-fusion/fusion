import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Item = HTMLElement & {
  focusable: boolean
  level: number
  open: boolean
  updateComplete: Promise<unknown>
}

type Tree = HTMLElement & {
  nesting?: 'heading' | 'peer' | 'subordinate'
  updateComplete: Promise<unknown>
}

/** A shut branch holding one leaf, and a leaf beside it. */
const tree = async (): Promise<{ branch: Item; child: Item }> => {
  const host = await mount(`
    <helix-headless-tree label="Files">
      <helix-headless-tree-item value="branch">Branch
        <helix-headless-tree-item slot="children" value="child">Child</helix-headless-tree-item>
      </helix-headless-tree-item>
      <helix-headless-tree-item value="leaf">Leaf</helix-headless-tree-item>
    </helix-headless-tree>`)
  const [branch, child] = [...host.querySelectorAll('helix-headless-tree-item')] as Item[]
  await branch?.updateComplete
  return { branch: branch as Item, child: child as Item }
}

const press = async (item: Item, key: string): Promise<void> => {
  item.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
  await item.updateComplete
}

/* In and out are the horizontal pair, and which of the two is in is where a
   shut branch's chevron points: along the line. */
describe('the horizontal arrows', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
  })

  test('open a shut branch with the right arrow and shut it with the left', async () => {
    const { branch } = await tree()
    await press(branch, 'ArrowRight')
    expect(branch.open).toBe(true)
    await press(branch, 'ArrowLeft')
    expect(branch.open).toBe(false)
  })

  /* The chevron points left on a right-to-left page, and the right arrow had
     opened a branch whose chevron pointed the other way. */
  test('on a right-to-left page the left arrow goes in and the right comes out', async () => {
    document.documentElement.dir = 'rtl'
    const { branch, child } = await tree()
    await press(branch, 'ArrowRight')
    expect(branch.open).toBe(false)
    await press(branch, 'ArrowLeft')
    expect(branch.open).toBe(true)
    await press(branch, 'ArrowLeft')
    expect(child.focusable).toBe(true)
    await press(child, 'ArrowRight')
    expect([branch.focusable, child.focusable]).toEqual([true, false])
    await press(branch, 'ArrowRight')
    expect(branch.open).toBe(false)
  })
})

/* The base tier ships no stylesheet, so everything it owes somebody drawing
   depth is a fact they can select on: what the tree says depth means, and how
   deep each row sits. Neither is drawn here and both are readable. */
describe('depth is published, not drawn', () => {
  for (const answer of ['heading', 'subordinate'] as const) {
    test(`the tree carries ${answer}, and carries nothing until it is asked`, async () => {
      const host = (await mount(`
        <helix-headless-tree label="Files" nesting="${answer}">
          <helix-headless-tree-item value="branch">Branch</helix-headless-tree-item>
        </helix-headless-tree>`)) as Tree
      expect(host.getAttribute('nesting')).toBe(answer)
      host.nesting = undefined
      await host.updateComplete
      expect(host.hasAttribute('nesting')).toBe(false)
    })
  }

  test('and every row says how deep it is, in a property a rule can read', async () => {
    const { branch, child } = await tree()
    await child.updateComplete
    expect([branch.level, child.level]).toEqual([1, 2])
    expect(part(child, 'row')?.getAttribute('style')).toContain('--tree-level: 2')
  })
})
