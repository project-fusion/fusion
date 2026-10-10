import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'
import type { CSSResult } from 'lit'

/* Imported once the DOM is registered: Lit and core read the globals they
   find as they are evaluated. The block first, then the entry that colors it,
   as a page imports them. */
let codeBlockSheet: CSSResult
let style: (code: string, kind: 'callable' | 'keyword' | 'tag') => string
let registerHighlighter: typeof import('@fusion.dev/helix-headless/code-block').registerHighlighter
beforeAll(async () => {
  registerDom()
  await import('./index.js')
  ;({ codeBlockSheet } = await import('./code-block-highlight.js'))
  const { syntaxHighlighter } = await import('../highlight/syntax.js')
  const { tags } = await import('@lezer/highlight')
  const KINDS = { callable: tags.typeName, keyword: tags.keyword, tag: tags.tagName }
  style = (code, kind) => `${syntaxHighlighter.style([KINDS[kind]])}:${code}`
  ;({ registerHighlighter } = await import('@fusion.dev/helix-headless/code-block'))
})

/* The registration is the page's, so a block in another spec draws plain. */
afterAll(() => {
  registerHighlighter(undefined)
})

/** A block of code, written into the page escaped, as a page writes markup as code. */
const block = async (language: string, code: string): Promise<Updatable> => {
  const el = (await mount(
    `<helix-headless-code-block language="${language}">${code.replace(/</g, '&lt;')}</helix-headless-code-block>`,
  )) as Updatable
  await settle(el)
  await el.updateComplete
  return el
}

/** The class and the text of each token the block drew, in order. */
const tokens = (el: Element): string[] =>
  [...(el.shadowRoot?.querySelectorAll('[part="code"] span[class]') ?? [])].map(
    (one) => `${one.className}:${one.textContent}`,
  )

describe('a code block once @fusion.dev/helix-sandbox/code-block is imported', () => {
  test("draws its code in the sandbox grammars, by its language, in the editor's style", async () => {
    const el = await block('ts', 'const total: number = 1')
    expect(tokens(el)).toContain(style('const', 'keyword'))
    expect(tokens(el)).toContain(style('number', 'callable'))
  })

  test('reads the names a page writes for a language, in any case', async () => {
    expect(tokens(await block('TypeScript', 'const a = 1'))).toContain(style('const', 'keyword'))
    expect(tokens(await block('bash', 'bun add @fusion.dev/helix'))).toContain(
      style('bun', 'keyword'),
    )
    expect(tokens(await block('htm', '<p class="lede">Hi</p>'))).toContain(style('p', 'tag'))
    expect(tokens(await block('jsx', '<helix-button>Save</helix-button>')).length).toBeGreaterThan(
      0,
    )
  })

  test('draws a language no grammar reads plain, with its code in the slot', async () => {
    const el = await block('rust', 'let a = 1;')
    expect(tokens(el)).toEqual([])
    expect(el.shadowRoot?.querySelector('slot:not([name])')?.hasAttribute('hidden')).toBe(false)
  })

  test("adopts the editor's rules, which color the tokens from the syntax tokens", async () => {
    const el = await block('css', 'a { color: red; }')
    expect(el.shadowRoot?.adoptedStyleSheets).toContain(codeBlockSheet.styleSheet as CSSStyleSheet)
    expect(codeBlockSheet.cssText).toContain('var(--helix-color-syntax-keyword)')
  })
})
