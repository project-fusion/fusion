import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * A diff, served.
 *
 * The patch is an attribute, which a server has where it has no children, so
 * the whole change is in the first response rather than arriving with script.
 */
const PATCH = '--- a/a.ts\n+++ b/a.ts\n@@ -1,2 +1,2 @@\n keep\n-old\n+new\n'

describe('code diff server output', () => {
  test('the changed lines are in the markup as an insertion and a deletion', () => {
    const markup = ssr(html`<helix-headless-code-diff patch=${PATCH}></helix-headless-code-diff>`)
    expect(partTag(markup, 'added')).toMatch(/^<ins\b/)
    expect(partTag(markup, 'removed')).toMatch(/^<del\b/)
    expect(withoutStyles(markup)).toContain('new')
  })

  test('an unset arrangement writes no attribute onto the host', () => {
    const markup = ssr(html`<helix-headless-code-diff patch=${PATCH}></helix-headless-code-diff>`)
    expect(hostAttributes(markup, 'helix-headless-code-diff')).not.toContain('variant')
  })
})
