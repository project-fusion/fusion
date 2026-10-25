import { describe, expect, test } from 'bun:test'
import { atRuleText, classifyAtRule, holdsFrames } from './at-rules.js'
import { type Atrule, parseSheet } from './syntax.js'
import { type Verdict, verdictOf } from './verdict.js'

const atRuleOf = (css: string): Atrule => {
  const [node] = parseSheet(css).sheet.children
  if (node?.type !== 'Atrule') {
    throw new Error(`no at-rule in ${css}`)
  }
  return node
}

const verdict = (css: string): Verdict => verdictOf(classifyAtRule(atRuleOf(css)))

describe('an at-rule the language names', () => {
  test.each([
    ['@media (prefers-reduced-motion: reduce) {}', ['when:reduced-motion']],
    ['@media (prefers-reduced-motion: no-preference) {}', ['when:reduced-motion']],
    ['@media (prefers-contrast: more) {}', ['when:contrast']],
    ['@media (hover: none) and (pointer: coarse) {}', ['when:hover-capability', 'when:pointer']],
    ['@media (pointer: fine) {}', ['when:pointer']],
    ['@media (width < 30rem) {}', ['when:viewport-width']],
    ['@keyframes spin { to { rotate: 1turn } }', ['motion:keyframes']],
    ['@starting-style { [part="surface"] { opacity: 0 } }', ['motion:starting-style']],
  ])('%s', (css, constructs) => {
    expect(verdict(css)).toEqual({ category: 'expressible', constructs, reasons: [] })
  })
})

describe('an at-rule the web keeps', () => {
  test.each([
    ['@media print {}', ['web:print']],
    ['@media (forced-colors: active) {}', ['web:forced-colors']],
    ['@supports (text-box: trim-both cap alphabetic) {}', ['web:enhance']],
    [
      '@media (forced-colors: active) and (prefers-reduced-motion: no-preference) {}',
      ['web:forced-colors', 'when:reduced-motion'],
    ],
  ])('%s', (css, constructs) => {
    expect(verdict(css)).toEqual({ category: 'web-only', constructs, reasons: [] })
  })
})

describe('an at-rule the language cannot say', () => {
  test.each([
    ['@container (inline-size < 40rem) {}', 'at-rule:box-width-literal'],
    ['@container card (inline-size < 40rem) {}', 'at-rule:named-container'],
    ['@media screen {}', 'at-rule:media-type'],
    ['@media (orientation: portrait) {}', 'at-rule:media-orientation'],
    ['@media (prefers-color-scheme: dark) {}', 'at-rule:media-prefers-color-scheme'],
    ['@layer base {}', 'at-rule:layer'],
    [
      '@property --x { syntax: "<length>"; inherits: false; initial-value: 0px }',
      'at-rule:property',
    ],
  ])('%s', (css, code) => {
    const result = verdict(css)
    expect(result.category).toBe('not-expressible')
    expect(result.reasons.map(({ code: reason }) => reason)).toContain(code)
  })

  test('a box width names the literal it would need a token for', () => {
    expect(verdict('@container (inline-size < 22rem) {}').reasons).toEqual([
      { code: 'at-rule:box-width-literal', text: '(inline-size<22rem)' },
    ])
  })
})

describe('the at-rule helpers', () => {
  test('write an at-rule on one line', () => {
    expect(atRuleText(atRuleOf('@media   (hover:  hover) {}'))).toBe('@media (hover:hover)')
    expect(atRuleText(atRuleOf('@starting-style {}'))).toBe('@starting-style')
  })

  test('tell keyframes from other at-rules', () => {
    expect(holdsFrames(atRuleOf('@keyframes spin {}'))).toBe(true)
    expect(holdsFrames(atRuleOf('@media print {}'))).toBe(false)
  })
})
