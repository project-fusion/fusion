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
  select(): void
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
describe('a choice the item refuses', () => {
  test('leaves the selection where it was', async () => {
    /* `helix-select` is cancelable and the item documents it as refusable. The
       tree is the one thing that acts on it, so a refusal it ignored was a veto
       that did nothing anywhere: valid code, no error, and the selection
       happening regardless. Bound on the item, which is the position that can
       refuse a bubbling event before the tree sees it. */
    const { branch, child } = await tree()
    const host = branch.parentElement as Tree & { active: string }
    branch.select()
    await host.updateComplete
    expect(host.active).toBe('branch')

    child.addEventListener('helix-select', (event) => event.preventDefault())
    child.select()
    await host.updateComplete
    expect(host.active).toBe('branch')
  })
})

describe('depth is published, not drawn', () => {
  for (const answer of ['heading', 'subordinate'] as const) {
    test(`the tree carries ${answer}, and carries nothing until it is asked`, async () => {
      const host = (await mount(`
        <helix-headless-tree label="Files" nesting="${answer}">
          <helix-headless-tree-item value="branch">Branch</helix-headless-tree-item>
        </helix-headless-tree>`)) as Tree
      expect(host.getAttribute('nesting')).toBe(answer)
      /* Cleared by taking the attribute off rather than by assigning undefined,
         which the repository's strict optional types refuse. Lit hands the
         property null for an attribute that has gone, which is the resting
         state a sheet selects on the absence of. */
      host.removeAttribute('nesting')
      await host.updateComplete
      expect(host.hasAttribute('nesting')).toBe(false)
      expect(host.nesting).toBeNull()
    })
  }

  test('and every row says how deep it is, in a property a rule can read', async () => {
    const { branch, child } = await tree()
    await child.updateComplete
    expect([branch.level, child.level]).toEqual([1, 2])
    expect(part(child, 'row')?.getAttribute('style')).toContain('--tree-level: 2')
  })

  /* And the tree is the only one counting. `level` was an attribute with an
     example setting it across a flat list, and the tree overwrote all four
     before the first paint: the depth a consumer could state was never the
     depth any row drew at. Nesting is the statement, and it is also what
     decides which rows a shut branch hides and where the outward arrow goes. */
  test('a depth declared on a row does not survive, because the tree counts it', async () => {
    const host = await mount(`
      <helix-headless-tree label="Packages">
        <helix-headless-tree-item level="1" value="cortex">cortex</helix-headless-tree-item>
        <helix-headless-tree-item level="2" value="core">core</helix-headless-tree-item>
      </helix-headless-tree>`)
    const rows = [...host.querySelectorAll('helix-headless-tree-item')] as Item[]
    for (const row of rows) {
      await row.updateComplete
    }
    expect(rows.map((row) => row.level)).toEqual([1, 1])
    expect(rows.map((row) => part(row, 'row')?.getAttribute('style'))).toEqual([
      '--tree-level: 1',
      '--tree-level: 1',
    ])
  })
})
