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

/* What depth means, which the tree answers once for every row under it. The
   default is a file explorer, where every row is the same kind of thing;
   `subordinate` is a categorization, where a step inward is a change of kind;
   and `heading` is a documentation sidebar, where the branch is the name of the
   list under it. All three are the sheet's to draw, so all three are measured
   here. */
describe('depth and the type scale', () => {
  /** Three levels, plus a top-level leaf to compare the first one against. */
  const deep = (attrs = ''): string => `
    <helix-tree label="Docs" ${attrs}>
      <helix-tree-item default-open value="one">One
        <helix-tree-item default-open slot="children" value="two">Two
          <helix-tree-item slot="children" value="three">Three</helix-tree-item>
        </helix-tree-item>
      </helix-tree-item>
      <helix-tree-item value="leaf">Leaf</helix-tree-item>
    </helix-tree>`

  const size = (item: HTMLElement): number =>
    Number.parseFloat(getComputedStyle(part(item, 'row') as HTMLElement).fontSize)

  /* Row to row, which is where the gap lives: on the row rather than on the
     item, or a parent's adds to its last child's and one tree comes out with
     three different gaps in it. */
  const gaps = (host: HTMLElement): number[] => {
    const boxes = items(host).map((item) =>
      (part(item, 'row') as HTMLElement).getBoundingClientRect(),
    )
    return boxes.slice(1).map((box, index) => Math.round(box.top - (boxes[index]?.bottom ?? 0)))
  }

  geometry('one size at every depth, which is the resting answer', async () => {
    const [one, two, three, leaf] = items(await mount(deep()))
    const top = size(one as HTMLElement)
    expect(top).toBeGreaterThan(0)
    for (const row of [two, three, leaf]) {
      expect(size(row as HTMLElement)).toBe(top)
    }
  })

  geometry('a subordinate tree steps a nested row down, once and no further', async () => {
    const [one, two, three, leaf] = items(await mount(deep('nesting="subordinate"')))
    const top = size(one as HTMLElement)
    /* The leaf beside the branch is top level too, so it keeps the top size:
       the step is about depth and not about holding children. */
    expect(size(leaf as HTMLElement)).toBe(top)
    expect(size(two as HTMLElement)).toBeLessThan(top)
    /* The type scale holds one step below a row, so the third level takes the
       second's size rather than a size the scale does not have. */
    expect(size(three as HTMLElement)).toBe(size(two as HTMLElement))
  })

  /* The parent moves and the children do not, which is the mirror of the step
     above rather than a second helping of it. */
  geometry('a heading tree relabels the branch and leaves the rows alone', async () => {
    const [one, two, three, leaf] = items(await mount(deep('nesting="heading"')))
    const resting = size(leaf as HTMLElement)
    expect(resting).toBeGreaterThan(0)
    /* A row under a heading is the size every other row is. */
    expect(size(three as HTMLElement)).toBe(resting)
    expect(size(one as HTMLElement)).toBeLessThan(resting)
    /* A heading is a role and not a rung, so nothing runs out: the branch two
       deep is the same heading as the branch at the top, not a smaller one. */
    expect(size(two as HTMLElement)).toBe(size(one as HTMLElement))
  })

  /* And the top-level leaf beside a heading is the one row that proves which
     question this value asks: `subordinate` would leave it alone for being top
     level, and this leaves it alone for holding nothing. */
  geometry('a top-level leaf beside a heading is the row it was', async () => {
    /* Measured before the second mount, which takes the first tree out of the
       document: a detached row has no computed size and the comparison would be
       against `NaN`. */
    const resting = size(items(await mount(deep()))[3] as HTMLElement)
    const headed = size(items(await mount(deep('nesting="heading"')))[3] as HTMLElement)
    expect(headed).toBe(resting)
  })

  /* The rail heading is a size, an ink and the room a label needs, so the
     tracking is measured too: at the other two values a row asks for none. */
  geometry('and the heading takes the tracking a label wants', async () => {
    const tracking = (item: HTMLElement): number =>
      Number.parseFloat(getComputedStyle(part(item, 'row') as HTMLElement).letterSpacing) || 0
    const [one, , three] = items(await mount(deep('nesting="heading"')))
    expect(tracking(one as HTMLElement)).toBeGreaterThan(0)
    expect(tracking(three as HTMLElement)).toBe(0)
  })

  for (const [what, attrs] of [
    ['heading', 'nesting="heading"'],
    ['peer', ''],
    ['subordinate', 'nesting="subordinate"'],
  ] as const) {
    geometry(`and the gap stays even, ${what}`, async () => {
      const measured = gaps(await mount(deep(attrs)))
      expect(measured.length).toBe(3)
      expect(new Set(measured).size).toBe(1)
    })
  }
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
