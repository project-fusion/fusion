import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const tree = html`<helix-tree label="Repository">
  <helix-tree-item default-open value="helix">
    helix
    <helix-tree-item slot="children" value="web">web</helix-tree-item>
  </helix-tree-item>
</helix-tree>`

describe('tree server output', () => {
  test('the tree role and its name are served', () => {
    expect(partTag(ssr(tree), 'tree')).toContain('role="tree"')
    expect(partTag(ssr(tree), 'tree')).toContain('aria-label="Repository"')
  })

  /**
   * **No row claims a depth, because a server cannot count ancestors.**
   *
   * The root counts the items a row sits inside to assign `level`, which is a
   * read of the light DOM. Every row served `aria-level="1"` and a three-deep
   * tree arrived flat: a screen reader told a list where the markup holds a
   * nesting. Absent is "unknown", which is what `Data Table`'s own server spec
   * argues for `aria-colcount` in the same words, and the structure is still
   * right underneath, each nested row inside its parent's `group`.
   */
  test('no row claims a depth', () => {
    expect(withoutStyles(ssr(tree))).not.toContain('aria-level')
  })

  /**
   * **A tree nothing has answered for is still reachable.** `focusable` is the
   * tree's word and the tree says it by reading its rows, so `-1` on every row
   * left the whole tree out of the tab order before hydration.
   */
  test('a row nothing has answered for is in the tab order rather than out of it', () => {
    expect(partTag(ssr(html`<helix-tree-item value="one"></helix-tree-item>`), 'item')).toContain(
      'tabindex="0"',
    )
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(tree), 'helix-tree')).toEqual(['label'])
  })
})
