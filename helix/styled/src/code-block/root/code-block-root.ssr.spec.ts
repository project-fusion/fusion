import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { hasPart, rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('code-block server output', () => {
  test('renders its code element with no DOM to read', () => {
    const markup = withoutStyles(ssr(html`<helix-code-block>one</helix-code-block>`))
    expect(hasPart(markup, 'code')).toBe(true)
  })

  /* The server has no code to read, so it numbers nothing and highlights
     nothing; the client makes the same first render and fills both in. */
  test('serves an empty gutter under line numbers', () => {
    const markup = withoutStyles(ssr(html`<helix-code-block line-numbers>one</helix-code-block>`))
    expect(rendered(markup, 'helix-code-block')).toMatch(
      /<span part="gutter" aria-hidden="true">(?:<!--[^>]*-->)*<\/span>/,
    )
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
      /<pre id="block" part="block" translate="no">(?:<!--[^>]*-->)*<code part="code">(?:<!--[^>]*-->)*<slot\s*><\/slot>(?:<!--[^>]*-->)*<\/code>(?:<!--[^>]*-->)*<\/pre>/,
    )
  })
})

/**
 * A highlighter registered under Lit's global DOM shim, which a server can opt
 * into. Its `document` has no `querySelectorAll`, and registering walked the
 * page and threw, at import for an entry that registers one. In a process of
 * its own, because the shim's globals would reach every spec after this one.
 */
const importsUnderShim = (script: string): [number, string] => {
  const run = Bun.spawnSync(
    [
      process.execPath,
      '--conditions',
      'helix-development',
      '-e',
      `await import('@lit-labs/ssr/lib/install-global-dom-shim.js'); ${script}`,
    ],
    { cwd: fileURLToPath(new URL('.', import.meta.url)) },
  )
  return [run.exitCode, run.stderr.toString()]
}

describe('a highlighter registered under Lit’s global DOM shim', () => {
  test('registers', () => {
    expect(
      importsUnderShim(
        "const { registerHighlighter } = await import('../index.js'); registerHighlighter(() => '')",
      ),
    ).toEqual([0, ''])
  })
})
