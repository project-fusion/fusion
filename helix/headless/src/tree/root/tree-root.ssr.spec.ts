import { describe, expect, test } from 'bun:test'
import {
  hostAttributes,
  partTag,
  servedParts,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const tree = html`<helix-headless-tree label="Repository">
  <helix-headless-tree-item default-open value="helix">
    helix
    <helix-headless-tree-item slot="children" value="web">web</helix-headless-tree-item>
  </helix-headless-tree-item>
</helix-headless-tree>`

describe('tree server output', () => {
  test('the tree role and its name are served', () => {
    expect(partTag(ssr(tree), 'tree')).toContain('role="tree"')
    expect(partTag(ssr(tree), 'tree')).toContain('aria-label="Repository"')
  })

  test('every label has a row to show it, served before any script', () => {
    /* The tree is content, so it is readable and crawlable before any script.
       The labels themselves cannot carry that claim: they are the consumer's own
       markup, echoed by declarative shadow DOM whatever the tree renders, and
       `toContain('helix')` against the whole document is satisfied by the host
       tag `<helix-headless-tree>` itself. Both that and `toContain('web')` went
       on passing with the root's render cut to a single empty element, and with
       every item rendering an empty shadow root.

       What the tree owes is the frame the labels show through: a tree, a row
       per item with a label slot in it, and the group a branch holds its
       children in. Asserted whole rather than searched for one name at a time,
       so a part added to a template nobody meant to change fails here. */
    expect(servedParts(ssr(tree))).toEqual(['group', 'item', 'label', 'row', 'tree'])
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(tree), 'helix-headless-tree')).toEqual(['label'])
  })

  /**
   * **A depth is a claim, and a server has no tree to walk to make it.**
   *
   * The root counts a row's ancestors to assign `level`, which is a read of the
   * light DOM, so every row served `aria-level="1"` and a three-deep tree
   * arrived flat: a screen reader told a list where the markup holds a nesting.
   * Absent is "unknown", which is the answer `Data Table`'s own server spec
   * argues for `aria-colcount` in the same words, and the structure is still
   * right underneath it, each nested row sitting inside its parent's `group`.
   */
  test('no row claims a depth, because a server cannot count ancestors', () => {
    expect(withoutStyles(ssr(tree))).not.toContain('aria-level')
  })
})
