import { describe, expect, test } from 'bun:test'
import { hasPart, rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('code-block server output', () => {
  test('renders its code element with no DOM to read', () => {
    const markup = withoutStyles(ssr(html`<helix-code-block>one</helix-code-block>`))
    expect(hasPart(markup, 'code')).toBe(true)
  })
})

/* A diff is slotted text, and a server has no children to read, so what it
   sends is the slot as ordinary code: the patch itself in a `<pre>`, which is a
   legible diff and the same first render the client makes. */
describe('code-block diff server output', () => {
  test('sends the patch as code, and draws no line it cannot have read', () => {
    const markup = withoutStyles(
      ssr(html`<helix-code-block diff>@@ -1 +1 @@
-old
+new
</helix-code-block>`),
    )
    expect(hasPart(markup, 'code')).toBe(true)
    expect(hasPart(markup, 'added')).toBe(false)
    /* `toContain('+new')` passed on the host's own light DOM, which is in the
       response whatever the block renders: it would have gone on passing with
       the shadow root empty. The claim is the slot inside the code element,
       which is what sends the patch as code rather than as parsed rows. */
    expect(rendered(markup, 'helix-code-block')).toMatch(
      /<pre part="block"><code part="code">(?:<!--[^>]*-->)?<slot\s*><\/slot><\/code><\/pre>/,
    )
  })
})
