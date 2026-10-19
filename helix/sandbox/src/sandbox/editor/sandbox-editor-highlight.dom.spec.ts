import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { dirname } from 'node:path'
import { registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'
import type { Highlighter, Tag } from '@lezer/highlight'

/* Imported once the DOM is registered: CodeMirror and core read the globals
   they find as they are evaluated. */
let syntaxHighlighter: Highlighter
let tags: typeof import('@lezer/highlight').tags
let getStyleTags: typeof import('@lezer/highlight').getStyleTags
let javascriptLanguage: typeof import('@codemirror/lang-javascript').javascriptLanguage
let forceParsing: typeof import('@codemirror/language').forceParsing
let EditorView: typeof import('@codemirror/view').EditorView

/**
 * The editor colors its source.
 *
 * Lezer matches a style to a token by the identity of the `Tag` object. When
 * two copies of `@lezer/highlight` are installed, the parsers tag their tokens
 * with one copy and `syntaxHighlighter` is built from the other, so no rule ever
 * matches. The editor then renders every token as plain text, and nothing
 * throws or logs. That shipped on October 6, 2026, after a dependency bump left
 * a nested 1.2.3 copy under the parsers. These specs fail on that install.
 */
beforeAll(async () => {
  registerDom()
  ;({ syntaxHighlighter } = await import('../../highlight/syntax.js'))
  ;({ getStyleTags, tags } = await import('@lezer/highlight'))
  ;({ javascriptLanguage } = await import('@codemirror/lang-javascript'))
  ;({ forceParsing } = await import('@codemirror/language'))
  ;({ EditorView } = await import('@codemirror/view'))
  await import('./sandbox-editor.js')
})

afterEach(() => {
  document.body.innerHTML = ''
})

const editor = async (language: string, value: string): Promise<Updatable> => {
  const host = document.createElement('helix-sandbox-editor') as Updatable & {
    language: string
    value: string
  }
  host.language = language
  host.value = value
  document.body.append(host)
  await settle(host)
  /* CodeMirror parses for a few milliseconds when the view is built and
     finishes the rest when the page is idle. A cold CI runner ran out of that
     budget on the first editor, so the spec parses the whole document before
     it reads the spans. */
  const mount = host.shadowRoot?.querySelector<HTMLElement>('.cm-editor')
  const view = mount ? EditorView.findFromDOM(mount) : null
  if (!view) {
    throw new Error('helix-sandbox-editor mounted no CodeMirror view')
  }
  forceParsing(view, view.state.doc.length, 5000)
  return host
}

/** The text of every token span drawn with the class `syntaxHighlighter` gives `tag`. */
const painted = (host: Updatable, tag: Tag): string[] => {
  const name = syntaxHighlighter.style([tag])
  if (!name) {
    throw new Error('syntaxHighlighter has no rule for this tag')
  }
  const content = host.shadowRoot?.querySelector('.cm-content')
  const spans = content ? [...content.querySelectorAll('span')] : []
  return spans
    .filter((span) => span.className.split(' ').includes(name))
    .map((span) => span.textContent ?? '')
}

describe('sandbox editor highlighting', () => {
  test('paints the tag name in HTML', async () => {
    const host = await editor('html', '<p class="lede">Hi</p>')
    expect(painted(host, tags.tagName)).toContain('p')
  })

  test('paints the keyword, string and tag name in CSS', async () => {
    const host = await editor('css', '@media screen { a { content: "x"; } }')
    expect(painted(host, tags.keyword)).toContain('@media')
    expect(painted(host, tags.string)).toContain('"x"')
    expect(painted(host, tags.tagName)).toContain('a')
  })

  test('paints the keyword and string in JavaScript', async () => {
    const host = await editor('javascript', 'const greeting = "hi"')
    expect(painted(host, tags.keyword)).toContain('const')
    expect(painted(host, tags.string)).toContain('"hi"')
  })
})

/**
 * One `@lezer/highlight` for the style and the parsers.
 *
 * The test above shows the symptom. These name the cause: every package that
 * reads or writes highlight tags reaches the same file, and the tags the
 * JavaScript parser puts on `const` are objects from the `tags` this package
 * imports.
 */
describe('one copy of @lezer/highlight', () => {
  /** The `@lezer/highlight` entry a package resolves, from that package's own folder. */
  const resolvedFrom = (specifier: string, from: string = import.meta.dir): string =>
    Bun.resolveSync('@lezer/highlight', dirname(Bun.resolveSync(`${specifier}/package.json`, from)))

  test('resolves to one file from every package that uses highlight tags', () => {
    const ours = Bun.resolveSync('@lezer/highlight', import.meta.dir)
    const javascript = dirname(
      Bun.resolveSync('@codemirror/lang-javascript/package.json', import.meta.dir),
    )
    const html = dirname(Bun.resolveSync('@codemirror/lang-html/package.json', import.meta.dir))
    const css = dirname(Bun.resolveSync('@codemirror/lang-css/package.json', import.meta.dir))
    expect({
      '@codemirror/language': resolvedFrom('@codemirror/language'),
      '@lezer/css': resolvedFrom('@lezer/css'),
      '@lezer/css under @codemirror/lang-css': resolvedFrom('@lezer/css', css),
      '@lezer/html': resolvedFrom('@lezer/html'),
      '@lezer/html under @codemirror/lang-html': resolvedFrom('@lezer/html', html),
      '@lezer/javascript': resolvedFrom('@lezer/javascript'),
      '@lezer/javascript under @codemirror/lang-javascript': resolvedFrom(
        '@lezer/javascript',
        javascript,
      ),
    }).toEqual({
      '@codemirror/language': ours,
      '@lezer/css': ours,
      '@lezer/css under @codemirror/lang-css': ours,
      '@lezer/html': ours,
      '@lezer/html under @codemirror/lang-html': ours,
      '@lezer/javascript': ours,
      '@lezer/javascript under @codemirror/lang-javascript': ours,
    })
  })

  test('the JavaScript parser tags `const` with the tags object the style reads', () => {
    const code = 'const a = 1'
    const node = javascriptLanguage.parser.parse(code).resolveInner(1, 1)
    expect(code.slice(node.from, node.to)).toBe('const')
    /* `getStyleTags` reads the node prop of its own copy, so a parser built
       against another copy answers `null` here. */
    expect(getStyleTags(node)?.tags ?? []).toContain(tags.definitionKeyword)
  })
})
