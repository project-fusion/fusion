import { beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

/** A tree of one branch holding one leaf, plus a leaf beside the branch. */
const mixed = `
  <helix-tree label="Files">
    <helix-tree-item default-open value="branch">Branch
      <helix-tree-item slot="children" value="child">Child</helix-tree-item>
    </helix-tree-item>
    <helix-tree-item value="leaf">Leaf</helix-tree-item>
  </helix-tree>`

const items = (host: HTMLElement): HTMLElement[] => [
  ...host.querySelectorAll<HTMLElement>('helix-tree-item'),
]

const labelLeft = (item: HTMLElement): number =>
  (part(item, 'label') as HTMLElement).getBoundingClientRect().left

/**
 * Registers a test only where there is layout to measure.
 *
 * Not `test.skipIf`, which the browser harness does not have: it exports `test`
 * as a plain function with no skip of any kind, so `skipIf` threw and took the
 * whole family's specs down with it. Measured in the spec frame, which is the
 * only place that could have said so.
 *
 * Registration-time, so a geometry block is honestly *absent* under `bun test`
 * rather than passing without checking anything, which is what `hasLayout` asks
 * for in its own comment.
 */
const geometry = hasLayout() ? test : (): void => {}

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
      `<helix-tree label="Nav"><helix-tree-item href="/a" value="a">A</helix-tree-item></helix-tree>`,
    )
    const [item] = items(tree)
    const row = part(item as HTMLElement, 'row')
    expect(row?.tagName).toBe('A')
    expect(part(item as HTMLElement, 'item')?.getAttribute('role')).toBe('none')
  })

  test('writes target and rel only when asked', async () => {
    const tree = await mount(
      `<helix-tree label="Nav"><helix-tree-item href="/a" value="a">A</helix-tree-item></helix-tree>`,
    )
    const row = part(items(tree)[0] as HTMLElement, 'row') as HTMLElement
    expect([row.hasAttribute('target'), row.hasAttribute('rel')]).toEqual([false, false])
  })
})

/**
 * Geometry, which is the half of this component that kept breaking.
 *
 * Every one of these was a real bug found by measuring in a browser, and not one
 * of them was reachable from `bun test`: a leaf that started 20px left of the
 * branch beside it, a link 57px wide inside a 240px row, and a chevron that
 * came to rest halfway along because two auto margins split the free space.
 * They are guarded rather than deleted so the same file is honest in both
 * harnesses.
 */
describe('tree item geometry', () => {
  geometry('siblings share a column, whatever they are', async () => {
    const tree = await mount(mixed)
    const [branch, , leaf] = items(tree)
    expect(labelLeft(leaf as HTMLElement)).toBe(labelLeft(branch as HTMLElement))
  })

  geometry('a child is one gutter in from its parent', async () => {
    const tree = await mount(mixed)
    const [branch, child] = items(tree)
    expect(labelLeft(child as HTMLElement)).toBeGreaterThan(labelLeft(branch as HTMLElement))
  })

  /* With the chevron at the end nothing pushes a branch's label, so a leaf must
     reserve nothing: written unconditionally it put every child of a navigation
     two gutters in. */
  geometry('a leaf reserves nothing when the chevron is at the end', async () => {
    const tree = await mount(
      mixed.replace('label="Files"', 'label="Files" chevron-placement="end"'),
    )
    const [branch, , leaf] = items(tree)
    expect(labelLeft(leaf as HTMLElement)).toBe(labelLeft(branch as HTMLElement))
  })

  /* A row advertises itself as a target with a pointer and a full-width hover,
     so a link inside one has to be the whole row or the advertisement lies. */
  geometry('a slotted link fills its row', async () => {
    const tree = await mount(
      `<helix-tree label="Nav">
        <helix-tree-item value="a"><a href="/a" data-link="quiet">A</a></helix-tree-item>
      </helix-tree>`,
    )
    const item = items(tree)[0] as HTMLElement
    const link = item.querySelector('a') as HTMLElement
    const row = part(item, 'row') as HTMLElement
    const uncovered = row.getBoundingClientRect().width - link.getBoundingClientRect().width
    // The row's own inset stays the row's; everything else is the target.
    expect(uncovered).toBeLessThan(32)
  })
})
