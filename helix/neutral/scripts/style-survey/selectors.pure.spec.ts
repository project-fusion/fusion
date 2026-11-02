import { describe, expect, test } from 'bun:test'
import { classifyFrame, classifySelector } from './selectors.js'
import { parseSheet, type Rule, type Selector } from './syntax.js'
import { type Verdict, verdictOf } from './verdict.js'

const selectorsOf = (css: string): readonly Selector[] => {
  const [rule] = parseSheet(`${css} {}`).sheet.children as Rule[]
  if (rule?.prelude.type !== 'SelectorList') {
    throw new Error(`no selector list in ${css}`)
  }
  return rule.prelude.children
}

const verdict = (css: string): Verdict => {
  const [selector] = selectorsOf(css)
  if (selector === undefined) {
    throw new Error(`no selector in ${css}`)
  }
  return verdictOf(classifySelector(selector))
}

const codes = (css: string): string[] => verdict(css).reasons.map(({ code }) => code)

describe('a selector the language names', () => {
  test.each([
    [':host', ['on:host']],
    [':host([tone="primary"])', ['on:host', 'when:prop']],
    [':host(:not([disabled]))', ['on:host', 'when:prop-absent']],
    [':host(:state(open))', ['on:host', 'when:state']],
    ['[part="button"]', ['on:part']],
    ['[part~="cell"][part~="today"]', ['on:part', 'when:part-state']],
    ['[part="day"][data-today]', ['on:part', 'when:part-state']],
    ['[part="button"]:focus-visible', ['on:part', 'when:focus-visible']],
    ['[part="row"]:focus-within', ['on:part', 'when:focus-within']],
    [':host(:dir(rtl)) [part="icon"]', ['on:part', 'when:dir']],
    ['[part="list"] [part="item"]', ['on:part', 'when:part']],
    ['[part="label"]::before', ['on:before', 'on:part']],
    [':host::after', ['on:after', 'on:host']],
    ['slot[name="icon"]', ['on:region']],
    ['slot:not([name])', ['on:region']],
    ['slot[name="start"]::slotted(*)', ['on:slotted']],
    ['::slotted([slot="header"])', ['on:slotted']],
    ['::slotted(helix-tab)', ['on:slotted', 'slotted:element']],
    [':is([part="header"], [part="block"])', ['on:parts']],
    ['[part="item"]:nth-child(2)', ['on:part', 'when:place']],
    ['[part="row"]:not(:has([part="toggle"]))', ['on:part', 'when:not', 'when:passed-content']],
  ])('%s', (css, constructs) => {
    expect(verdict(css)).toEqual({ category: 'expressible', constructs, reasons: [] })
  })

  test('a press or a hover on a live button', () => {
    expect(verdict(':host(:not(:disabled)) [part="button"]:is(:hover, :active)')).toEqual({
      category: 'expressible',
      constructs: [
        'on:part',
        'when:any-of',
        'when:disabled',
        'when:hover',
        'when:not',
        'when:pressed',
      ],
      reasons: [],
    })
  })

  test('a later child is a place', () => {
    expect(verdict(':host([divided]) ::slotted(:not(:first-child))').constructs).toEqual([
      'on:slotted',
      'when:place',
      'when:prop',
    ])
  })
})

describe('a selector the web keeps', () => {
  test.each([
    ['[part="a"] + [part="b"]', 'web:sibling'],
    ['[part="a"] ~ [part="b"]', 'web:sibling'],
    ['[part="row"]:nth-child(2n + 1)', 'web:position-selector'],
    ['::slotted(helix-notification:last-of-type)', 'web:position-selector'],
    ['[part="trigger"]::part(button)', 'web:part'],
    ['[part="range"]::-webkit-slider-thumb', 'web:vendor-pseudo'],
    ['[part="surface"]:popover-open', 'web:popover-open'],
    ['[part="dialog"]::backdrop', 'web:backdrop'],
  ])('%s', (css, construct) => {
    const result = verdict(css)
    expect(result.category).toBe('web-only')
    expect(result.constructs).toContain(construct)
  })
})

describe('a selector the language cannot say', () => {
  test.each([
    ['[part="icon"] svg', 'selector:element-type'],
    ['[part="controls"] :where(a, button)', 'selector:element-type'],
    ['[part="box"] > *', 'selector:universal'],
    ['[data-kind="keyword"]', 'selector:unnamed-node'],
    ['.label', 'selector:class'],
    ['#label', 'selector:id'],
    [':host(:not([tone="neutral"]))', 'selector:negated-prop-value'],
    [':host([placement^="bottom"])', 'selector:attribute-matcher'],
    ['::slotted(a)', 'selector:slotted-html-element'],
    ['::slotted([data-grid-span="2"])', 'selector:slotted-condition'],
    ['::slotted(helix-toggle:state(pressed))', 'selector:slotted-condition'],
    ['::slotted(*:not(:last-child))', 'selector:negated-place'],
    [':host(:not(:defined))', 'selector:defined'],
    ['[part="footer"]:empty', 'selector:empty'],
    ['[part="surface"]:focus', 'selector:focus'],
    ['[part="field"]::placeholder', 'selector:placeholder'],
    ['[part="frame"]:not([part="header"] + *)', 'selector:negated-compound'],
    [':host(:where([data-density="sm"] *))', 'selector:complex-any-of'],
  ])('%s', (css, code) => {
    expect(verdict(css).category).toBe('not-expressible')
    expect(codes(css)).toContain(code)
  })

  test('a reason names the fragment it is about', () => {
    expect(verdict('[part="plot"] svg').reasons).toEqual([
      { code: 'selector:element-type', text: 'svg' },
    ])
  })

  test('one unreadable condition outweighs a web-only one', () => {
    expect(verdict('[part="a"] + [part="b"] svg').category).toBe('not-expressible')
  })
})

describe('a keyframe offset', () => {
  test.each(['to', '50%'])('%s is a frame', (offset) => {
    const [atRule] = parseSheet(`@keyframes spin { ${offset} { rotate: 1turn } }`).sheet.children
    const [frame] = atRule?.type === 'Atrule' ? (atRule.block?.children ?? []) : []
    const [selector] =
      frame?.type === 'Rule' && frame.prelude.type === 'SelectorList' ? frame.prelude.children : []
    expect(selector && verdictOf(classifyFrame(selector))).toEqual({
      category: 'expressible',
      constructs: ['motion:frame'],
      reasons: [],
    })
  })
})
