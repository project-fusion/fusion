/**
 * Flattens a stylesheet into its rules and at-rules, each with the at-rules
 * around it, in source order.
 */

import { holdsFrames } from './at-rules.js'
import {
  type Atrule,
  type Block,
  type Declaration,
  lineOf,
  type Raw,
  type Rule,
  type Selector,
  type StyleSheet,
} from './syntax.js'

/** One rule and where it sits. */
export interface RuleRecord {
  /**
   * The at-rules around it, outermost first.
   */
  readonly context: readonly Atrule[]
  /**
   * Its declarations, in order.
   */
  readonly declarations: readonly Declaration[]
  /**
   * True for a keyframe inside `@keyframes`.
   */
  readonly frame: boolean
  /**
   * The line it starts on.
   */
  readonly line: number
  /**
   * True for a rule nested inside another style rule.
   */
  readonly nested: boolean
  /**
   * Its selectors, or `undefined` when the parser could not read them.
   */
  readonly selectors: readonly Selector[] | undefined
}

/** One at-rule and the at-rules around it. */
export interface AtRuleRecord {
  /**
   * The at-rule itself.
   */
  readonly atRule: Atrule
  /**
   * The at-rules around it, outermost first.
   */
  readonly context: readonly Atrule[]
  /**
   * The line it starts on.
   */
  readonly line: number
}

/** A stylesheet's rules and at-rules, each list in source order. */
export interface Flattened {
  /**
   * Every at-rule, nested ones included.
   */
  readonly atRules: readonly AtRuleRecord[]
  /**
   * Every style rule and keyframe.
   */
  readonly rules: readonly RuleRecord[]
}

interface Place {
  readonly context: readonly Atrule[]
  readonly frames: boolean
  readonly nested: boolean
}

const recordOf = (rule: Rule, place: Place): RuleRecord => ({
  context: place.context,
  declarations: rule.block.children.filter(
    (child): child is Declaration => child.type === 'Declaration',
  ),
  frame: place.frames,
  line: lineOf(rule),
  nested: place.nested,
  selectors: rule.prelude.type === 'SelectorList' ? rule.prelude.children : undefined,
})

const visit = (nodes: readonly (Atrule | Declaration | Raw | Rule)[], place: Place): Flattened[] =>
  nodes.flatMap((node) => {
    if (node.type === 'Atrule') {
      return [atRuleOf(node, place)]
    }
    if (node.type === 'Rule') {
      return [ruleOf(node, place)]
    }
    return []
  })

const merge = (parts: readonly Flattened[]): Flattened => ({
  atRules: parts.flatMap((part) => part.atRules),
  rules: parts.flatMap((part) => part.rules),
})

const nestedOf = (block: Block | null, place: Place): Flattened =>
  merge(visit(block?.children ?? [], place))

function atRuleOf(atRule: Atrule, place: Place): Flattened {
  const inner = nestedOf(atRule.block, {
    context: [...place.context, atRule],
    frames: holdsFrames(atRule),
    nested: place.nested,
  })
  return merge([
    { atRules: [{ atRule, context: place.context, line: lineOf(atRule) }], rules: [] },
    inner,
  ])
}

function ruleOf(rule: Rule, place: Place): Flattened {
  const inner = nestedOf(rule.block, { context: place.context, frames: false, nested: true })
  return merge([{ atRules: [], rules: [recordOf(rule, place)] }, inner])
}

/** Every rule and at-rule in a stylesheet, in source order. */
export const flatten = (sheet: StyleSheet): Flattened =>
  merge(visit(sheet.children, { context: [], frames: false, nested: false }))
