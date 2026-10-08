import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* Code Block ships no grammar; an entry registers one for every block. Lit
   after happy-dom, as every element is, so it reads the DOM the specs run in. */
let registerHighlighter: typeof import('./code-block-root.js').registerHighlighter
let css: typeof import('lit').css
beforeAll(async () => {
  registerDom()
  ;({ registerHighlighter } = await import('../index.js'))
  ;({ css } = await import('lit'))
})

/* The registration is the page's, so each test takes it away again, and a
   block in another spec draws plain as it always did. */
afterEach(() => {
  registerHighlighter(undefined)
})

type Block = Updatable & { highlight?: (code: string, language: string) => string }

/** A stand-in for a grammar: it reads `ts` only, and marks the whole of it. */
const tsOnly = (code: string, language: string): string | undefined =>
  language === 'ts' ? `<span class="tok-keyword">${code}</span>` : undefined

const block = async (attributes: string, code = 'const a = 1'): Promise<Block> => {
  const el = (await mount(
    `<helix-headless-code-block ${attributes}>${code}</helix-headless-code-block>`,
  )) as Block
  await settle(el)
  await el.updateComplete
  return el
}

const drawn = (el: Element): string | undefined =>
  el.shadowRoot?.querySelector('[part="code"] .tok-keyword')?.textContent ?? undefined

const plain = (el: Element): boolean =>
  el.shadowRoot?.querySelector('slot:not([name])')?.hasAttribute('hidden') === false

describe('a highlighter registered for every block', () => {
  test('draws a block that sets no highlight of its own, by its language', async () => {
    registerHighlighter(tsOnly)
    const el = await block('language="ts"')
    expect(drawn(el)).toBe('const a = 1')
    expect(plain(el)).toBe(false)
  })

  test('draws a block in a language it does not read plain', async () => {
    registerHighlighter(tsOnly)
    const el = await block('language="rust"', 'let a = 1;')
    expect(drawn(el)).toBeUndefined()
    expect(plain(el)).toBe(true)
  })

  test("loses to a block's own highlight", async () => {
    registerHighlighter(tsOnly)
    const el = await block('language="ts"')
    el.highlight = (code) => `<b>${code}</b>`
    await el.updateComplete
    expect(drawn(el)).toBeUndefined()
    expect(el.shadowRoot?.querySelector('[part="code"] b')?.textContent).toBe('const a = 1')
  })

  /* A page that imports the entry after its blocks have drawn still gets color. */
  test('reaches the blocks already on the page, and gives each the sheet that colors it', async () => {
    const el = await block('language="ts"')
    expect(plain(el)).toBe(true)
    const sheet = css`
      .tok-keyword {
        color: red;
      }
    `
    registerHighlighter(tsOnly, sheet)
    await el.updateComplete
    expect(drawn(el)).toBe('const a = 1')
    expect(el.shadowRoot?.adoptedStyleSheets).toContain(sheet.styleSheet as CSSStyleSheet)
    expect((await block('language="ts"')).shadowRoot?.adoptedStyleSheets).toContain(
      sheet.styleSheet as CSSStyleSheet,
    )
  })

  test('draws plain again once it is taken away', async () => {
    registerHighlighter(tsOnly)
    const el = await block('language="ts"')
    registerHighlighter(undefined)
    await el.updateComplete
    expect(plain(el)).toBe(true)
  })
})
