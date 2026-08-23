import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/** A tree of one branch holding one leaf, plus a leaf beside the branch. */
const mixed = `
  <helix-base-tree label="Files">
    <helix-base-tree-item default-open value="branch">Branch
      <helix-base-tree-item slot="children" value="child">Child</helix-base-tree-item>
    </helix-base-tree-item>
    <helix-base-tree-item value="leaf">Leaf</helix-base-tree-item>
  </helix-base-tree>`

const items = (host: HTMLElement): HTMLElement[] => [
  ...host.querySelectorAll<HTMLElement>('helix-base-tree-item'),
]

const _labelLeft = (item: HTMLElement): number =>
  (part(item, 'label') as HTMLElement).getBoundingClientRect().left

describe('tree item structure', () => {
  test('a branch draws a chevron and a leaf does not', async () => {
    const tree = await mount(mixed)
    const [branch, , leaf] = items(tree)
    expect([
      !!part(branch as HTMLElement, 'toggle'),
      !!part(leaf as HTMLElement, 'toggle'),
    ]).toEqual([true, false])
  })

  test('the row is the treeitem, and the group is inside it', async () => {
    const tree = await mount(mixed)
    const [branch] = items(tree)
    const row = part(branch as HTMLElement, 'item')
    expect(row?.getAttribute('role')).toBe('treeitem')
    expect(row?.querySelector('[part="group"]')).not.toBeNull()
  })

  /* `href` hands the row to an anchor and the wrapper drops to `none`: an anchor
     cannot contain the group, because the group holds more anchors and nesting
     them is markup no assistive technology reads the way it looks. */
  test('a link row is an anchor, and stops claiming to be the treeitem', async () => {
    const tree = await mount(
      `<helix-base-tree label="Nav"><helix-base-tree-item href="/a" value="a">A</helix-base-tree-item></helix-base-tree>`,
    )
    const [item] = items(tree)
    const row = part(item as HTMLElement, 'row')
    expect(row?.tagName).toBe('A')
    expect(part(item as HTMLElement, 'item')?.getAttribute('role')).toBe('none')
  })

  test('writes target and rel only when asked', async () => {
    const tree = await mount(
      `<helix-base-tree label="Nav"><helix-base-tree-item href="/a" value="a">A</helix-base-tree-item></helix-base-tree>`,
    )
    const row = part(items(tree)[0] as HTMLElement, 'row') as HTMLElement
    expect([row.hasAttribute('target'), row.hasAttribute('rel')]).toEqual([false, false])
  })
})
