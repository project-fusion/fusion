import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { codeBlockHighlighter } from '../code-block/code-block-highlight.js'
import { highlight } from './highlight.js'
import { languageOf } from './language.js'
import { syntaxRules } from './syntax.js'

/**
 * The snippet highlighter emits a `tok-` span for each token it classifies.
 *
 * It runs at build time with no DOM, so this is a server spec. The site paints
 * the classes from `--helix-color-syntax-*`. When two copies of
 * `@lezer/highlight` are installed, `classHighlighter` and the parsers hold
 * different `tags` objects and every snippet comes back as plain text, which
 * is what the site shipped from October 6, 2026. Each case below fails on that
 * install.
 */
describe('snippet highlighting', () => {
  test('classifies the keyword and string in JavaScript', () => {
    const out = highlight('const greeting = "hi"', 'js')
    expect(out).toContain('<span class="tok-keyword">const</span>')
    expect(out).toContain('<span class="tok-string">&quot;hi&quot;</span>')
  })

  test('classifies the keyword and string in TSX', () => {
    const out = highlight('import type { Props } from "./props"', 'tsx')
    expect(out).toContain('<span class="tok-keyword">import</span>')
    expect(out).toContain('<span class="tok-string">&quot;./props&quot;</span>')
  })

  test('classifies the tag name, attribute and value in HTML', () => {
    const out = highlight('<helix-button variant="primary">Save</helix-button>', 'html')
    expect(out).toContain('<span class="tok-typeName">helix-button</span>')
    expect(out).toContain('<span class="tok-propertyName">variant</span>')
    expect(out).toContain('<span class="tok-string">&quot;primary&quot;</span>')
  })

  test('classifies the keyword, string and tag name in CSS', () => {
    const out = highlight('@media screen { a { content: "x"; } }', 'css')
    expect(out).toContain('<span class="tok-keyword">@media</span>')
    expect(out).toContain('<span class="tok-string">&quot;x&quot;</span>')
    expect(out).toContain('<span class="tok-typeName">a</span>')
  })

  test('classifies the command and the quoted string in shell', () => {
    const out = highlight('bun add "@fusion.dev/helix"', 'sh')
    expect(out).toContain('<span class="tok-keyword">bun</span>')
    expect(out).toContain('<span class="tok-string">&quot;@fusion.dev/helix&quot;</span>')
  })
})

describe('the grammars beyond the first token', () => {
  test('read a script and a style inside HTML in their own grammars', () => {
    const out = highlight('<script>const a = 1</script><style>a { color: red }</style>', 'html')
    expect(out).toContain('<span class="tok-keyword">const</span>')
    expect(out).toContain('<span class="tok-typeName">a</span>')
  })

  /* sh hands a `$` inside a string to its variable reader without moving,
     and is asked again, as CodeMirror asks it. */
  test('read a variable inside a quoted string in shell', () => {
    expect(highlight('echo "a$B"', 'sh')).toBe(
      '<span class="tok-variableName">echo</span> <span class="tok-string">&quot;a</span><span class="tok-variableName tok-definition">$B</span><span class="tok-string">&quot;</span>',
    )
  })

  test('are named as a page or a file names them, in any case', () => {
    expect(['TypeScript', 'bash', 'mjs', 'jsx', 'HTM', 'cobol'].map(languageOf)).toEqual([
      'ts',
      'sh',
      'js',
      'tsx',
      'html',
      undefined,
    ])
  })
})

describe("a block's highlighter on a server", () => {
  test("colors a block's code with the editor's classes, from the syntax tokens", () => {
    expect(codeBlockHighlighter('const a = 1', 'TypeScript')).toContain(
      '<span class="helix-syntax-keyword">const</span>',
    )
    expect(codeBlockHighlighter('let a = 1;', 'rust')).toBeUndefined()
    expect(syntaxRules).toContain(
      '.helix-syntax-keyword { color: var(--helix-color-syntax-keyword); }',
    )
  })
})

/**
 * The entries a server imports, under Lit's global DOM shim, which a server
 * can opt into. `@codemirror/view` reads the DOM as it loads and threw there,
 * and the highlighter reached it through `@codemirror/lang-*`. In a process of
 * its own, because the shim's globals would reach every spec after this one.
 */
const importsUnderShim = (script: string): [number, string] => {
  const run = Bun.spawnSync(
    [
      process.execPath,
      '-e',
      `await import('@lit-labs/ssr/lib/install-global-dom-shim.js'); ${script}`,
    ],
    { cwd: fileURLToPath(new URL('.', import.meta.url)) },
  )
  return [run.exitCode, run.stderr.toString()]
}

describe('the entries under Lit’s global DOM shim', () => {
  test('import, and highlight', () => {
    expect(
      importsUnderShim(
        "const { highlight } = await import('./index.js'); await import('../code-block/index.js'); await import('../index.js'); if (!highlight('const a = 1', 'ts').includes('tok-keyword')) process.exit(2)",
      ),
    ).toEqual([0, ''])
  })
})
