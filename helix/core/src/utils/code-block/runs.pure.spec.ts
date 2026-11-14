import { describe, expect, test } from 'bun:test'
import { markupRuns, registeredTokens, registerTokens, runsMarkup, shikiTokens } from './runs.js'

describe('markupRuns', () => {
  test('reads the look of tags and an inline style, and decodes the text', () => {
    expect(
      markupRuns('<b>const</b> a &lt; <span style="color:#f00;font-style:italic">1</span>'),
    ).toEqual([
      { bold: true, text: 'const' },
      { text: ' a < ' },
      { color: '#f00', italic: true, text: '1' },
    ])
  })

  test('a nested tag keeps what the tag around it says', () => {
    expect(markupRuns('<strong><span style="color:red">x</span>y</strong>')).toEqual([
      { bold: true, color: 'red', text: 'x' },
      { bold: true, text: 'y' },
    ])
  })

  test('a class of Helix own highlighter names a token', () => {
    expect(markupRuns('<span class="helix-syntax-keyword">if</span>')).toEqual([
      { syntax: 'keyword', text: 'if' },
    ])
  })

  test('another class says nothing, and the line breaks stay in the text', () => {
    expect(markupRuns('<span class="tok-keyword">a\nb</span>')).toEqual([{ text: 'a\nb' }])
  })
})

describe('runsMarkup', () => {
  test('escapes the code and writes each look inline', () => {
    expect(
      runsMarkup([
        { text: 'a<b' },
        { bold: true, color: '#111', colorDark: '#eee', text: '&' },
        { syntax: 'keyword', text: 'if' },
      ]),
    ).toBe(
      'a&lt;b<span style="color:light-dark(#111, #eee);font-weight:bold">&amp;</span><span style="color:var(--helix-color-syntax-keyword)">if</span>',
    )
  })
})

describe('shikiTokens', () => {
  const highlighter = {
    codeToTokensWithThemes: () => [
      [
        {
          content: 'const',
          variants: { dark: { color: '#eee' }, light: { color: '#111', fontStyle: 2 } },
        },
      ],
      [{ content: 'a', variants: {} }],
    ],
    getLoadedLanguages: () => ['ts'],
  }

  test('joins the lines with a break and reads both schemes', () => {
    expect(shikiTokens(highlighter, { dark: 'd', light: 'l' })('const\na', 'ts')).toEqual([
      { bold: true, color: '#111', colorDark: '#eee', text: 'const' },
      { text: '\n' },
      { text: 'a' },
    ])
  })

  test('a language it has not loaded is nothing', () => {
    expect(shikiTokens(highlighter, { dark: 'd', light: 'l' })('x', 'rust')).toBeUndefined()
  })
})

test('registerTokens keeps the tokens until they are taken away', () => {
  const tokens = () => undefined
  registerTokens(tokens)
  expect(registeredTokens()).toBe(tokens)
  registerTokens(undefined)
  expect(registeredTokens()).toBeUndefined()
})
