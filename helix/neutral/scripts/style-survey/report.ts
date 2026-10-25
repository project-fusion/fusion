/**
 * Folds the surveyed stylesheets into the report: the totals per category,
 * the count of each construct, and the reasons ranked by the rules they stop.
 *
 * **Everything here is ordered by value and then by name**, never by the
 * order a map happened to fill in, so the same stylesheets give the same
 * report byte for byte.
 */

import type { Item, RuleResult, SheetResult } from './survey.js'
import { type Category, compare } from './verdict.js'

/** How many items fell in each category. */
export interface Tally {
  /**
   * The language names it.
   */
  readonly expressible: number
  /**
   * The language cannot say it.
   */
  readonly 'not-expressible': number
  /**
   * All of them.
   */
  readonly total: number
  /**
   * The web keeps it and a native view leaves it out.
   */
  readonly 'web-only': number
}

/** One place a reason applies. */
export interface Example {
  /**
   * `path:line`.
   */
  readonly at: string
  /**
   * The selector, declaration, or at-rule it is in.
   */
  readonly item: string
  /**
   * The fragment the reason is about.
   */
  readonly text: string
}

/** One reason something is not expressible, and how much it stops. */
export interface ReasonSummary {
  /**
   * The reason code.
   */
  readonly code: string
  /**
   * The first three rules it applies to, in file and line order.
   */
  readonly examples: readonly Example[]
  /**
   * The selectors, declarations, and at-rules it applies to.
   */
  readonly items: number
  /**
   * The rules it is the only reason for, which naming it would make expressible.
   */
  readonly only: number
  /**
   * The rules it applies to.
   */
  readonly rules: number
}

/** The whole survey. */
export interface Report {
  /**
   * At-rules by category.
   */
  readonly atRules: Tally
  /**
   * Each construct and the number of items that use it, by name.
   */
  readonly constructs: Readonly<Record<string, number>>
  /**
   * Declarations by category.
   */
  readonly declarations: Tally
  /**
   * How many of the rules are keyframes.
   */
  readonly frames: number
  /**
   * What the parser could not read, as `path:line: message`.
   */
  readonly parseErrors: readonly string[]
  /**
   * Every reason, ranked by the rules it applies to.
   */
  readonly reasons: readonly ReasonSummary[]
  /**
   * The directory the paths are under, from the repository's root.
   */
  readonly root: string
  /**
   * Rules by category, keyframes included.
   */
  readonly rules: Tally
  /**
   * Selectors by category, keyframe offsets included.
   */
  readonly selectors: Tally
  /**
   * Each stylesheet's results, by path.
   */
  readonly sheets: readonly SheetResult[]
  /**
   * How many stylesheets were read.
   */
  readonly stylesheets: number
}

const tally = (categories: readonly Category[]): Tally => ({
  expressible: categories.filter((category) => category === 'expressible').length,
  'not-expressible': categories.filter((category) => category === 'not-expressible').length,
  total: categories.length,
  'web-only': categories.filter((category) => category === 'web-only').length,
})

const itemsOf = (sheet: SheetResult): Item[] => [
  ...sheet.atRules,
  ...sheet.rules.flatMap((rule) => [...rule.selectors, ...rule.declarations]),
]

const countBy = (keys: readonly string[]): Map<string, number> => {
  const counts = new Map<string, number>()
  for (const key of keys) {
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

const codesOf = (verdict: { readonly reasons: readonly { readonly code: string }[] }): string[] => [
  ...new Set(verdict.reasons.map(({ code }) => code)),
]

/** Where in a rule a reason applies: the first selector or declaration that has it. */
const exampleIn = (path: string, rule: RuleResult, code: string): Example => {
  const item = [...rule.selectors, ...rule.declarations].find((candidate) =>
    candidate.reasons.some((reason) => reason.code === code),
  )
  const reason = (item ?? rule).reasons.find((candidate) => candidate.code === code)
  return {
    at: `${path}:${item?.line ?? rule.line}`,
    item: item?.text ?? rule.context.join(' '),
    text: reason?.text ?? '',
  }
}

const examplesOf = (sheets: readonly SheetResult[]): Map<string, Example[]> => {
  const examples = new Map<string, Example[]>()
  for (const sheet of sheets) {
    for (const rule of sheet.rules) {
      for (const code of codesOf(rule)) {
        const found = examples.get(code) ?? []
        if (found.length < 3) {
          examples.set(code, [...found, exampleIn(sheet.path, rule, code)])
        }
      }
    }
  }
  return examples
}

const reasonsOf = (sheets: readonly SheetResult[]): ReasonSummary[] => {
  const rules = sheets.flatMap((sheet) => sheet.rules)
  const byRule = countBy(rules.flatMap(codesOf))
  const alone = countBy(rules.map(codesOf).flatMap((codes) => (codes.length === 1 ? codes : [])))
  const byItem = countBy(sheets.flatMap(itemsOf).flatMap(codesOf))
  const examples = examplesOf(sheets)
  const codes = [...new Set([...byRule.keys(), ...byItem.keys()])]
  return codes
    .map((code) => ({
      code,
      examples: examples.get(code) ?? [],
      items: byItem.get(code) ?? 0,
      only: alone.get(code) ?? 0,
      rules: byRule.get(code) ?? 0,
    }))
    .sort(
      (first, second) =>
        second.rules - first.rules ||
        second.items - first.items ||
        compare(first.code, second.code),
    )
}

const constructsOf = (sheets: readonly SheetResult[]): Record<string, number> => {
  const counts = countBy(sheets.flatMap(itemsOf).flatMap((item) => item.constructs))
  return Object.fromEntries(
    [...counts.entries()].sort(([first], [second]) => compare(first, second)),
  )
}

/** Folds every surveyed stylesheet into the report. */
export const summarize = (root: string, unordered: readonly SheetResult[]): Report => {
  const sheets = [...unordered].sort((first, second) => compare(first.path, second.path))
  const rules = sheets.flatMap((sheet) => sheet.rules)
  const selectors = rules.flatMap((rule) => rule.selectors)
  return {
    atRules: tally(sheets.flatMap((sheet) => sheet.atRules).map(({ category }) => category)),
    constructs: constructsOf(sheets),
    declarations: tally(rules.flatMap((rule) => rule.declarations).map(({ category }) => category)),
    frames: rules.filter((rule) => rule.kind === 'frame').length,
    parseErrors: sheets.flatMap((sheet) => sheet.errors.map((error) => `${sheet.path}:${error}`)),
    reasons: reasonsOf(sheets),
    root,
    rules: tally(rules.map(({ category }) => category)),
    selectors: tally(selectors.map(({ category }) => category)),
    sheets,
    stylesheets: sheets.length,
  }
}
