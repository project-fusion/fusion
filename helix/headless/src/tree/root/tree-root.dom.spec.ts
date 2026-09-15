import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Item = HTMLElement & {
  focusable: boolean
  open: boolean
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
