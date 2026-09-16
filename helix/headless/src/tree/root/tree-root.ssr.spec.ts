import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
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
})
