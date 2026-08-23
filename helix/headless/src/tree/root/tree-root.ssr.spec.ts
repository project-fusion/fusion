import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const tree = html`<helix-base-tree label="Repository">
  <helix-base-tree-item default-open value="helix">
    helix
    <helix-base-tree-item slot="children" value="web">web</helix-base-tree-item>
  </helix-base-tree-item>
</helix-base-tree>`

describe('tree server output', () => {
  test('the tree role and its name are served', () => {
    expect(partTag(ssr(tree), 'tree')).toContain('role="tree"')
    expect(partTag(ssr(tree), 'tree')).toContain('aria-label="Repository"')
  })

  test('every label is in the served markup', () => {
    // The tree is content, so it is readable and crawlable before any script.
    const markup = withoutStyles(ssr(tree))
    expect(markup).toContain('helix')
    expect(markup).toContain('web')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(tree), 'helix-base-tree')).toEqual(['label'])
  })
})
