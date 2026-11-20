/**
 * Surveys one stylesheet: every selector, declaration, and at-rule gets a
 * verdict, and every rule the verdict of its parts.
 *
 * **A rule's category is the worst of its parts, with one exception.** It is
 * not expressible when any selector, declaration, or at-rule around it is not.
 * It is web-only when an at-rule around it is, or when every selector is,
 * because then the native output leaves the whole rule out. A web-only
 * declaration, such as `cursor`, leaves out only itself, so it does not make
 * its rule web-only.
 */

import { atRuleText, classifyAtRule } from './at-rules.js'
import { classifyDeclaration } from './declarations.js'
import { type AtRuleRecord, flatten, type RuleRecord } from './rules.js'
import { classifyFrame, classifySelector } from './selectors.js'
import { lineOf, parseSheet, print } from './syntax.js'
import {
  type Category,
  compare,
  missing,
  type Reason,
  reasonKey,
  type Verdict,
  verdictOf,
} from './verdict.js'

/** One classified selector, declaration, or at-rule. */
export interface Item extends Verdict {
  /**
   * The line it starts on.
   */
  readonly line: number
  /**
   * It, written out on one line.
   */
  readonly text: string
}

/** One classified rule. */
export interface RuleResult extends Verdict {
  /**
   * The at-rules around it, outermost first, written out.
   */
  readonly context: readonly string[]
  /**
   * Its declarations.
   */
  readonly declarations: readonly Item[]
  /**
   * `frame` for a keyframe, `rule` for a style rule.
   */
  readonly kind: 'frame' | 'rule'
  /**
   * The line it starts on.
   */
  readonly line: number
  /**
   * Its selectors.
   */
  readonly selectors: readonly Item[]
}

/** One surveyed stylesheet. */
export interface SheetResult {
  /**
   * Its at-rules.
   */
  readonly atRules: readonly Item[]
  /**
   * What the parser could not read, as `line: message`.
   */
  readonly errors: readonly string[]
  /**
   * Its path under the surveyed directory.
   */
  readonly path: string
  /**
   * Its rules, keyframes included.
   */
  readonly rules: readonly RuleResult[]
}

/**
 * The hook prefix of the family a stylesheet belongs to: its first folder, as
 * `--button-` for `button/root/button-root.css`. A shared sheet has none.
 */
export const hookPrefixOf = (path: string): string => {
  const [family] = path.split('/')
  return family === undefined || family === 'shared' || family === path ? '' : `--${family}-`
}

const atRuleItem = (record: AtRuleRecord): Item => ({
  ...verdictOf(classifyAtRule(record.atRule)),
  line: record.line,
  text: atRuleText(record.atRule),
})

const isMotion = (record: RuleRecord): boolean =>
  record.frame || record.context.some((atRule) => atRule.name === 'starting-style')

const selectorItems = (record: RuleRecord): Item[] => {
  if (record.selectors === undefined) {
    return [{ ...verdictOf([missing('selector:unparsed', '')]), line: record.line, text: '' }]
  }
  return record.selectors.map((selector) => ({
    ...verdictOf(record.frame ? classifyFrame(selector) : classifySelector(selector)),
    line: lineOf(selector) || record.line,
    text: print(selector),
  }))
}

const unique = <T>(values: readonly T[], key: (value: T) => string): T[] => [
  ...new Map(values.map((value) => [key(value), value])).values(),
]

/** The rule's category from its parts', as the module's comment says. */
const ruleCategory = (
  reasons: readonly Reason[],
  selectors: readonly Verdict[],
  context: readonly Verdict[],
): Category => {
  if (reasons.length > 0) {
    return 'not-expressible'
  }
  const webContext = context.some((verdict) => verdict.category === 'web-only')
  const webSelectors =
    selectors.length > 0 && selectors.every((verdict) => verdict.category === 'web-only')
  return webContext || webSelectors ? 'web-only' : 'expressible'
}

const ruleResult = (record: RuleRecord, prefix: string): RuleResult => {
  const motion = isMotion(record)
  const selectors = selectorItems(record)
  const declarations = record.declarations.map((declaration) => ({
    ...verdictOf(classifyDeclaration(declaration, { hookPrefix: prefix, motion })),
    line: lineOf(declaration),
    text: print(declaration),
  }))
  const nested = record.nested ? [verdictOf([missing('selector:nested-rule', '')])] : []
  const context = record.context.map((atRule) => verdictOf(classifyAtRule(atRule)))
  const parts = [...selectors, ...declarations, ...context, ...nested]
  const reasons = unique(
    parts.flatMap((part) => part.reasons),
    reasonKey,
  ).sort((first, second) => compare(reasonKey(first), reasonKey(second)))
  const constructs = [...new Set(parts.flatMap((part) => part.constructs))]
  return {
    category: ruleCategory(reasons, selectors, context),
    constructs: constructs.sort(compare),
    context: record.context.map(atRuleText),
    declarations,
    kind: record.frame ? 'frame' : 'rule',
    line: record.line,
    reasons,
    selectors,
  }
}

/** Surveys one stylesheet's source. `path` is where the report says it is. */
export const surveySheet = (path: string, source: string): SheetResult => {
  const { errors, sheet } = parseSheet(source)
  const { atRules, rules } = flatten(sheet)
  const prefix = hookPrefixOf(path)
  return {
    atRules: atRules.map(atRuleItem),
    errors,
    path,
    rules: rules.map((record) => ruleResult(record, prefix)),
  }
}
