import { describe, expect, test } from 'bun:test'
import { formatSummary } from './format.js'
import { isComponentSheet } from './read.js'
import { summarize } from './report.js'
import { hookPrefixOf, type RuleResult, surveySheet } from './survey.js'

const rulesOf = (css: string, path = 'button/root/button-root.css'): readonly RuleResult[] =>
  surveySheet(path, css).rules

const ruleOf = (css: string): RuleResult => {
  const [rule] = rulesOf(css)
  if (rule === undefined) {
    throw new Error(`no rule in ${css}`)
  }
  return rule
}

describe('a rule', () => {
  test('is expressible when its parts are, and a web-only declaration leaves out only itself', () => {
    const rule = ruleOf('[part="button"] { cursor: pointer; display: inline-flex }')
    expect(rule.category).toBe('expressible')
    expect(rule.declarations.map(({ category }) => category)).toEqual(['web-only', 'expressible'])
  })

  test('is web-only inside a web-only at-rule', () => {
    const rule = ruleOf('@media print { :host { display: block } }')
    expect(rule.category).toBe('web-only')
    expect(rule.context).toEqual(['@media print'])
  })

  test('is web-only when every selector is', () => {
    expect(ruleOf('[part="a"] + [part="b"] { display: none }').category).toBe('web-only')
  })

  test('is expressible when one of its selectors is', () => {
    expect(ruleOf('[part="a"] + [part="b"], [part="c"] { display: none }').category).toBe(
      'expressible',
    )
  })

  test('is not expressible when any part is, and gathers every reason', () => {
    const rule = ruleOf('[part="plot"] svg { stroke: red; display: block }')
    expect(rule.category).toBe('not-expressible')
    expect(rule.reasons).toEqual([
      { code: 'property:svg-paint', text: 'stroke' },
      { code: 'selector:element-type', text: 'svg' },
    ])
  })

  test('takes the reason of an at-rule around it', () => {
    const rule = ruleOf('@container (inline-size < 40rem) { [part="row"] { display: grid } }')
    expect(rule.reasons.map(({ code }) => code)).toEqual(['at-rule:box-width-literal'])
  })

  test('in a keyframe is a frame, and its properties must animate', () => {
    const [frame] = rulesOf('@keyframes slide { to { inset-inline-start: 0 } }')
    expect(frame?.kind).toBe('frame')
    expect(frame?.selectors.map(({ constructs }) => constructs)).toEqual([['motion:frame']])
    expect(frame?.reasons.map(({ code }) => code)).toEqual(['motion:not-animatable'])
  })

  test('in `@starting-style` must animate too', () => {
    const [rule] = rulesOf('@starting-style { [part="surface"] { opacity: 0 } }')
    expect(rule?.category).toBe('expressible')
    expect(rule?.constructs).toContain('motion:starting-style')
  })

  test('carries its line', () => {
    expect(rulesOf(':host {}\n\n[part="a"] {}').map(({ line }) => line)).toEqual([1, 3])
  })
})

describe('the hook prefix', () => {
  test('is the family folder', () => {
    expect(hookPrefixOf('button/root/button-root.css')).toBe('--button-')
    expect(hookPrefixOf('date-picker/root/date-picker-root.css')).toBe('--date-picker-')
  })

  test('is empty for a shared sheet', () => {
    expect(hookPrefixOf('shared/field/field.css')).toBe('')
  })

  test('tells a hook from another reference', () => {
    const [rule] = rulesOf(':host { color: var(--button-color); gap: var(--icon-gap) }')
    expect(rule?.constructs).toEqual(expect.arrayContaining(['value:hook', 'value:reference']))
  })
})

describe('the stylesheets the survey reads', () => {
  test.each([
    ['button/root/button-root.css', true],
    ['shared/field/field.css', true],
    ['tabs/tab/tab.generated.css', false],
    ['button/.examples/sizes.css', false],
    ['button/root/button-root.ts', false],
  ])('%s', (path, read) => {
    expect(isComponentSheet(path)).toBe(read)
  })
})

describe('the report', () => {
  const first = surveySheet(
    'a/root/a-root.css',
    '[part="x"] svg { stroke: red } :host { all: unset }',
  )
  const second = surveySheet('b/root/b-root.css', '@media print { :host { cursor: pointer } }')

  test('does not depend on the order the sheets arrive in', () => {
    expect(JSON.stringify(summarize('src', [second, first]))).toBe(
      JSON.stringify(summarize('src', [first, second])),
    )
  })

  test('counts each category', () => {
    const report = summarize('src', [first, second])
    expect(report.rules).toEqual({ expressible: 0, 'not-expressible': 2, total: 3, 'web-only': 1 })
    expect(report.stylesheets).toBe(2)
    expect(report.sheets.map(({ path }) => path)).toEqual([
      'a/root/a-root.css',
      'b/root/b-root.css',
    ])
  })

  test('ranks reasons by rules, and counts the rules each one alone stops', () => {
    const report = summarize('src', [first, second])
    expect(report.reasons.map(({ code, only, rules }) => [code, rules, only])).toEqual([
      ['property:all', 1, 1],
      ['property:svg-paint', 1, 0],
      ['selector:element-type', 1, 0],
    ])
    expect(report.reasons[1]?.examples).toEqual([
      { at: 'a/root/a-root.css:1', item: 'stroke:red', text: 'stroke' },
    ])
  })

  test('counts constructs by name, in name order', () => {
    const report = summarize('src', [first, second])
    expect(Object.keys(report.constructs)).toEqual(Object.keys(report.constructs).sort())
    expect(report.constructs['web:print']).toBe(1)
  })

  test('prints a summary with the totals and the reasons', () => {
    const summary = formatSummary(summarize('src', [first, second]))
    expect(summary).toContain('Style survey of 2 stylesheets under src')
    expect(summary).toContain('property:all')
    expect(summary).toContain('a/root/a-root.css:1  stroke  in  stroke:red')
  })
})
