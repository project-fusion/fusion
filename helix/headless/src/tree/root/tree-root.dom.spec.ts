import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

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

/* What this family says where there is nothing in it, and while it is fetching.
 *
 * **The words, the moment they appear and which of the two beats the other
 * belong to `MixinCollection`**, which has its own spec beside it in
 * `helix/core`. What belongs here is the one thing the mixin cannot decide,
 * which is what *this* family counts as having rows: every host passes a
 * different expression, so one that got it wrong says "Nothing to show" over a
 * full set, or says nothing at all over an empty one, with the mixin behaving
 * perfectly either way.
 *
 * Words the mixin does not default to, since it holds "Nothing to show" and
 * "Loading": read against those, the assertion is satisfied by the mixin alone
 * and says nothing about the string reaching it from here. */
describe('an empty tree', () => {
  test('says the consumer’s words where there is nothing in it', async () => {
    const host = await mount(
      '<helix-headless-tree label="Files" empty-text="Nothing here yet"></helix-headless-tree>',
    )
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(part(host, 'empty')?.textContent?.trim()).toBe('Nothing here yet')
  })

  test('and says it is fetching instead, which beats being empty', async () => {
    /* A set that has not arrived is not a set that is empty, so a reader is
       never told there is nothing while a request is still in flight. */
    const host = await mount(
      '<helix-headless-tree label="Files" loading loading-text="Still fetching"></helix-headless-tree>',
    )
    await (host as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete
    expect(part(host, 'loading')?.textContent?.trim()).toBe('Still fetching')
    expect(part(host, 'empty')).toBeNull()
  })
})

describe('what a tree acts on', () => {
  test('a choice from content in a row leaves the tree where it is', async () => {
    const { branch } = await tree()
    const host = branch.parentElement as Tree & { active: string }
    const inside = document.createElement('span')
    inside.slot = 'end'
    branch.append(inside)
    inside.dispatchEvent(
      new CustomEvent('helix-select', {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: { value: 'rename' },
      }),
    )
    await host.updateComplete
    expect(host.active).toBe('')
  })

  test('a branch with a value is chosen as it opens, by the pointer and by Enter', async () => {
    const { branch } = await tree()
    const host = branch.parentElement as Tree & { active: string }
    ;(part(branch, 'row') as HTMLElement).click()
    await host.updateComplete
    expect(host.active).toBe('branch')
    expect(branch.open).toBe(true)
    host.active = 'leaf'
    await host.updateComplete
    await press(branch, 'Enter')
    await host.updateComplete
    expect(host.active).toBe('branch')
    expect(branch.open).toBe(false)
  })

  test('and a branch that heads its list only opens', async () => {
    const { branch } = await tree()
    const host = branch.parentElement as Tree & { active: string }
    host.nesting = 'heading'
    await host.updateComplete
    await branch.updateComplete
    ;(part(branch, 'row') as HTMLElement).click()
    await host.updateComplete
    expect(host.active).toBe('')
    expect(branch.open).toBe(true)
  })

  test('takes its name from an aria-label on the host', async () => {
    const host = await mount(
      '<helix-headless-tree aria-label="Project files"><helix-headless-tree-item value="a">A</helix-headless-tree-item></helix-headless-tree>',
    )
    expect(part(host, 'tree')?.getAttribute('aria-label')).toBe('Project files')
  })
})

describe('the tab stop and the keys that find a row', () => {
  /* The tree heard only `helix-before-open` and `helix-before-close`, which do
     not bubble, so a pointer collapse left the one stop inside a hidden group
     and Tab passed over the tree. */
  test('a branch shut by the pointer takes back a stop that was inside it', async () => {
    const { branch, child } = await tree()
    await press(branch, 'ArrowRight')
    await press(branch, 'ArrowDown')
    expect(child.focusable).toBe(true)
    ;(part(branch, 'toggle') ?? (part(branch, 'row') as HTMLElement)).dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    )
    await branch.updateComplete
    await (branch.parentElement as Tree).updateComplete
    expect(branch.open).toBe(false)
    expect([branch.focusable, child.focusable]).toEqual([true, false])
  })

  test('a typed letter moves to the next row whose name starts with it', async () => {
    const { branch } = await tree()
    const leaf = branch.parentElement?.querySelector('[value="leaf"]') as Item
    await press(branch, 'l')
    expect(leaf.focusable).toBe(true)
  })

  test('* opens every branch beside the focused row', async () => {
    const host = await mount(`
      <helix-headless-tree label="Files">
        <helix-headless-tree-item value="a">A
          <helix-headless-tree-item slot="children" value="a1">A1</helix-headless-tree-item>
        </helix-headless-tree-item>
        <helix-headless-tree-item value="b">B
          <helix-headless-tree-item slot="children" value="b1">B1</helix-headless-tree-item>
        </helix-headless-tree-item>
      </helix-headless-tree>`)
    const [a, , b] = [...host.querySelectorAll('helix-headless-tree-item')] as Item[]
    await a?.updateComplete
    await b?.updateComplete
    await press(a as Item, '*')
    expect([a?.open, b?.open]).toEqual([true, true])
  })
})

const settleTree = async (host: HTMLElement): Promise<Item[]> => {
  const rows = [...host.querySelectorAll('helix-headless-tree-item')] as Item[]
  for (let turn = 0; turn < 3; turn += 1) {
    await (host as Tree).updateComplete
    await Promise.all(rows.map((row) => row.updateComplete))
    await new Promise((resolve) => setTimeout(resolve))
  }
  return rows
}

describe('a disabled item', () => {
  /* Web Awesome's and Ark's disabled tree items: seen and reached, chosen and
     opened by nothing a reader does. */
  test('is reached by the arrows, says it is unavailable, and opens and chooses nothing', async () => {
    const host = await mount(`
      <helix-headless-tree label="Files">
        <helix-headless-tree-item value="a">A</helix-headless-tree-item>
        <helix-headless-tree-item value="b" disabled>B
          <helix-headless-tree-item slot="children" value="c">C</helix-headless-tree-item>
        </helix-headless-tree-item>
      </helix-headless-tree>`)
    const [a, b] = await settleTree(host)
    await press(a as Item, 'ArrowDown')
    expect(document.activeElement).toBe(b ?? null)
    expect(part(b as Item, 'item')?.getAttribute('aria-disabled')).toBe('true')
    await press(b as Item, 'Enter')
    await press(b as Item, 'ArrowRight')
    part(b as Item, 'row')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    )
    await settleTree(host)
    expect((b as Item).open).toBe(false)
    expect((host as Tree & { active: string }).active).not.toBe('b')
  })
})

describe('a lazy item', () => {
  /* Web Awesome's lazy item: a branch with nothing in it yet, whose children
     are fetched when it opens. */
  test('is a branch before it has children, and asks for them when it opens', async () => {
    const host = await mount(`
      <helix-headless-tree label="Files">
        <helix-headless-tree-item value="remote" lazy>Remote</helix-headless-tree-item>
      </helix-headless-tree>`)
    const [remote] = (await settleTree(host)) as [Item]
    let asked = 0
    host.addEventListener('helix-load', () => {
      asked += 1
    })
    expect(part(remote, 'item')?.getAttribute('aria-expanded')).toBe('false')
    await press(remote, 'ArrowRight')
    await remote.updateComplete
    expect(asked).toBe(1)
    expect(part(remote, 'item')?.getAttribute('aria-busy')).toBe('true')
  })
})

describe('a tree of check marks', () => {
  const files = `
    <helix-headless-tree label="Files" selection-mode="multiple">
      <helix-headless-tree-item value="docs">Docs
        <helix-headless-tree-item slot="children" value="a">A</helix-headless-tree-item>
        <helix-headless-tree-item slot="children" value="b">B</helix-headless-tree-item>
      </helix-headless-tree-item>
      <helix-headless-tree-item value="c">C</helix-headless-tree-item>
    </helix-headless-tree>`

  /* Web Awesome's multiple selection and Ark's checkbox tree: a branch checks
     what it holds, and says when it holds a mix. */
  test('says it is multiselectable, and a branch checks every item under it', async () => {
    const host = await mount(files)
    const [docs, a, b, c] = (await settleTree(host)) as Item[]
    expect(part(host, 'tree')?.getAttribute('aria-multiselectable')).toBe('true')
    expect(part(c as Item, 'item')?.getAttribute('aria-checked')).toBe('false')
    expect(part(c as Item, 'item')?.hasAttribute('aria-selected')).toBe(false)
    part(docs as Item, 'checkbox')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    )
    await settleTree(host)
    expect((host as Tree & { values: string[] }).values).toEqual(['a', 'b'])
    expect(part(docs as Item, 'item')?.getAttribute('aria-checked')).toBe('true')
    expect((docs as Item).open).toBe(false)
    ;(a as Item).select()
    await settleTree(host)
    expect(part(docs as Item, 'item')?.getAttribute('aria-checked')).toBe('mixed')
    expect(part(docs as Item, 'checkbox')?.getAttribute('part')).toBe('checkbox checkbox-mixed')
    expect(part(b as Item, 'item')?.getAttribute('aria-checked')).toBe('true')
  })

  test('Space checks the row and Enter opens a branch', async () => {
    const host = await mount(files)
    const [docs, , , c] = (await settleTree(host)) as Item[]
    await press(c as Item, ' ')
    await settleTree(host)
    expect((host as Tree & { values: string[] }).values).toEqual(['c'])
    await press(docs as Item, 'Enter')
    await settleTree(host)
    expect((docs as Item).open).toBe(true)
    expect((host as Tree & { values: string[] }).values).toEqual(['c'])
  })

  test('says which rows are checked and which are partly, where a sheet can read it', async () => {
    const host = await mount(files)
    const [docs, a] = (await settleTree(host)) as Item[]
    ;(a as Item).select()
    await settleTree(host)
    expect(hasState(a as Item, 'checked')).toBe(true)
    expect(hasState(docs as Item, 'mixed')).toBe(true)
    expect(hasState(docs as Item, 'checked')).toBe(false)
  })

  test('a single-choice tree is not multiselectable', async () => {
    const { branch } = await tree()
    expect(
      part(branch.parentElement as HTMLElement, 'tree')?.hasAttribute('aria-multiselectable'),
    ).toBe(false)
  })
})

describe('a tree that chooses only the items at the ends', () => {
  /* Web Awesome's leaf mode: a branch opens and closes, and only a leaf is
     chosen, even where the branch carries a value. */
  test('opens a branch on a press and chooses only its leaves', async () => {
    const host = await mount(`
      <helix-headless-tree label="Files" selection-mode="leaf">
        <helix-headless-tree-item value="docs">Docs
          <helix-headless-tree-item slot="children" value="a">A</helix-headless-tree-item>
        </helix-headless-tree-item>
      </helix-headless-tree>`)
    const [docs, a] = (await settleTree(host)) as Item[]
    await press(docs as Item, 'Enter')
    await settleTree(host)
    expect((docs as Item).open).toBe(true)
    expect((host as Tree & { active: string }).active).not.toBe('docs')
    expect(part(host, 'tree')?.hasAttribute('aria-multiselectable')).toBe(false)
    await press(a as Item, 'Enter')
    await settleTree(host)
    expect((host as Tree & { active: string }).active).toBe('a')
  })
})
