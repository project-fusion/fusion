import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

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

/* Each of these guards a bug only a browser could find: a leaf that started 20px
   left of the branch beside it, a link 57px wide inside a 240px row, and a
   chevron that came to rest halfway along because two auto margins split the
   free space. Guarded rather than deleted, so the file is honest under `bun
   test` too.

   Where a row's label sits and how much of it a slotted link covers, both of
   which this tier's stylesheet decides. On the headless tier there is no gutter to
   indent by, so parent and child measure the same left edge, and the row has no
   padding or gap to read: `parseFloat('')` is `NaN` and the comparison against
   it can only fail. The structure these rows have, the chevron and the slots,
   is behavior and stays on the base. */
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

    /* The row's own inset stays the row's; everything else is the target. Asked
       of the row rather than written as a number, because the number is not one
       thing: 28 of leading inset where a chevron column is reserved, 8 of
       trailing, and 4 of gap that the empty `end` slot spends by being a flex
       item at all. Any figure hardcoded here is wrong at the next row shape. */
    const style = getComputedStyle(row)
    const inset =
      Number.parseFloat(style.paddingInlineStart) +
      Number.parseFloat(style.paddingInlineEnd) +
      Number.parseFloat(style.columnGap)
    expect(Math.round(uncovered)).toBeLessThanOrEqual(Math.ceil(inset))
  })
})

/* A shut branch's chevron points along its row into what it holds, which is
   toward its own label: the right on a left-to-right page and the left on a
   right-to-left one. The sheet stands a downward caret on its side, so the
   sheet is what turns it; it had turned it the one way whatever the page. */
describe('a shut branch', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
  })

  for (const dir of ['ltr', 'rtl'] as const) {
    geometry(`points its chevron at its own label, ${dir}`, async () => {
      document.documentElement.dir = dir
      const tree = await mount(`<helix-tree label="Files">
        <helix-tree-item value="branch">Branch
          <helix-tree-item slot="children" value="child">Child</helix-tree-item>
        </helix-tree-item>
      </helix-tree>`)
      const branch = items(tree)[0] as HTMLElement
      const toggle = part(branch, 'toggle') as HTMLElement
      /* The glyph points down, so where down lands once the sheet has turned it
         is where it points. */
      const turned = new DOMMatrix(getComputedStyle(toggle).transform).transformPoint(
        new DOMPoint(0, 1),
      )
      const box = toggle.getBoundingClientRect()
      const label = (part(branch, 'label') as HTMLElement).getBoundingClientRect()
      const towardLabel = Math.sign(label.left + label.width / 2 - (box.left + box.width / 2))
      expect(Math.sign(Math.round(turned.x))).toBe(towardLabel)
      expect(towardLabel).toBe(dir === 'rtl' ? -1 : 1)
    })
  }
})
