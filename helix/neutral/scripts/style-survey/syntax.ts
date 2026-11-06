/**
 * The CSS tree the survey reads: `css-tree`'s nodes, as plain objects with
 * arrays for children, typed for the fields the classifiers use.
 */

import { generate, parse, toPlainObject } from 'css-tree'

/** Where a node starts in its source. */
export interface Located {
  /**
   * The node's position, when the parser recorded one.
   */
  readonly loc?: { readonly start: { readonly column: number; readonly line: number } } | null
}

/** Text the parser could not read as anything more specific. */
export interface Raw extends Located {
  /**
   * Always `Raw`.
   */
  readonly type: 'Raw'
  /**
   * The text as written.
   */
  readonly value: string
}

/** A name, such as a keyword or a custom property's name. */
export interface Identifier extends Located {
  /**
   * The name as written.
   */
  readonly name: string
  /**
   * Always `Identifier`.
   */
  readonly type: 'Identifier'
}

/** A function call in a value or a selector. */
export interface FunctionNode extends Located {
  /**
   * The arguments, with commas as `Operator` nodes.
   */
  readonly children: readonly ValueNode[]
  /**
   * The function's name.
   */
  readonly name: string
  /**
   * Always `Function`.
   */
  readonly type: 'Function'
}

/** A number with a unit. */
export interface Dimension extends Located {
  /**
   * Always `Dimension`.
   */
  readonly type: 'Dimension'
  /**
   * The unit, such as `rem`.
   */
  readonly unit: string
  /**
   * The number, as written.
   */
  readonly value: string
}

/** A comma, a slash, or arithmetic between operands. */
export interface Operator extends Located {
  /**
   * Always `Operator`.
   */
  readonly type: 'Operator'
  /**
   * The operator, such as `,` or `*`.
   */
  readonly value: string
}

/** A parenthesized group inside `calc()` and its relatives. */
export interface Parentheses extends Located {
  /**
   * What the parentheses hold.
   */
  readonly children: readonly ValueNode[]
  /**
   * Always `Parentheses`.
   */
  readonly type: 'Parentheses'
}

/** A whole value, or a `var()` fallback. */
export interface Value extends Located {
  /**
   * The value's parts in order.
   */
  readonly children: readonly ValueNode[]
  /**
   * Always `Value`.
   */
  readonly type: 'Value'
}

/** A node with no fields the classifiers read beyond its type. */
export interface Leaf extends Located {
  /**
   * The node's type, such as `Number` or `Hash`.
   */
  readonly type: 'Hash' | 'Number' | 'Percentage' | 'String' | 'UnicodeRange' | 'Url'
  /**
   * The value, as written.
   */
  readonly value?: string
}

/** Any node a declaration's value holds. */
export type ValueNode =
  | Dimension
  | FunctionNode
  | Identifier
  | Leaf
  | Operator
  | Parentheses
  | Raw
  | Value

/** `[name]`, `[name="value"]`, or `[name~="value"]`. */
export interface AttributeSelector extends Located {
  /**
   * `=`, `~=`, or another operator, or `null` for presence alone.
   */
  readonly matcher: string | null
  /**
   * The attribute's name.
   */
  readonly name: Identifier
  /**
   * Always `AttributeSelector`.
   */
  readonly type: 'AttributeSelector'
  /**
   * The value it is compared with.
   */
  readonly value: { readonly name?: string; readonly value?: string } | null
}

/** A pseudo-class or a pseudo-element, with its argument when it takes one. */
export interface Pseudo extends Located {
  /**
   * The argument: a selector, a list of them, an identifier, or raw text.
   */
  readonly children: readonly (Identifier | Raw | Selector | SelectorList | SelectorPart)[] | null
  /**
   * The name without its colons.
   */
  readonly name: string
  /**
   * Which of the two it is.
   */
  readonly type: 'PseudoClassSelector' | 'PseudoElementSelector'
}

/** A combinator between two compound selectors. */
export interface Combinator extends Located {
  /**
   * ` `, `>`, `+`, or `~`.
   */
  readonly name: string
  /**
   * Always `Combinator`.
   */
  readonly type: 'Combinator'
}

/** An element name, `*`, a class, an id, `&`, or a keyframe's offset. */
export interface Named extends Located {
  /**
   * The name, where the node has one.
   */
  readonly name?: string
  /**
   * The kind of simple selector.
   */
  readonly type: 'ClassSelector' | 'IdSelector' | 'NestingSelector' | 'Percentage' | 'TypeSelector'
  /**
   * The value, for a keyframe's percentage.
   */
  readonly value?: string
}

/** The argument of `:nth-child()` and its relatives. */
export interface Nth extends Located {
  /**
   * `An+B`, with `a` null for a plain index.
   */
  readonly nth: { readonly a: string | null; readonly b: string | null; readonly type: string }
  /**
   * The `of S` selector, where there is one.
   */
  readonly selector: SelectorList | null
  /**
   * Always `Nth`.
   */
  readonly type: 'Nth'
}

/** One part of a complex selector. */
export type SelectorPart = AttributeSelector | Combinator | Named | Nth | Pseudo | Raw

/** A complex selector: compound selectors joined by combinators. */
export interface Selector extends Located {
  /**
   * The simple selectors and combinators in order.
   */
  readonly children: readonly SelectorPart[]
  /**
   * Always `Selector`.
   */
  readonly type: 'Selector'
}

/** The selectors a rule lists, separated by commas. */
export interface SelectorList extends Located {
  /**
   * Each selector in the list.
   */
  readonly children: readonly Selector[]
  /**
   * Always `SelectorList`.
   */
  readonly type: 'SelectorList'
}

/** One property and its value. */
export interface Declaration extends Located {
  /**
   * `true`, or the flag's text, when the declaration ends in `!important`.
   */
  readonly important: boolean | string
  /**
   * The property's name, as written.
   */
  readonly property: string
  /**
   * Always `Declaration`.
   */
  readonly type: 'Declaration'
  /**
   * The parsed value, or raw text where the parser could not read it.
   */
  readonly value: Raw | Value
}

/** What a rule or an at-rule holds between its braces. */
export interface Block extends Located {
  /**
   * The rules, at-rules, and declarations in order.
   */
  readonly children: readonly (Atrule | Declaration | Raw | Rule)[]
  /**
   * Always `Block`.
   */
  readonly type: 'Block'
}

/** A style rule, or a keyframe inside `@keyframes`. */
export interface Rule extends Located {
  /**
   * The declarations and any nested rules.
   */
  readonly block: Block
  /**
   * The selectors, or raw text where the parser could not read them.
   */
  readonly prelude: Raw | SelectorList
  /**
   * Always `Rule`.
   */
  readonly type: 'Rule'
}

/** An at-rule, such as `@media` or `@keyframes`. */
export interface Atrule extends Located {
  /**
   * What it holds, or `null` for a statement such as `@import`.
   */
  readonly block: Block | null
  /**
   * The name without its `@`.
   */
  readonly name: string
  /**
   * The condition or the name after it.
   */
  readonly prelude: { readonly children?: readonly object[]; readonly type: string } | null
  /**
   * Always `Atrule`.
   */
  readonly type: 'Atrule'
}

/** A whole stylesheet. */
export interface StyleSheet {
  /**
   * The top-level rules and at-rules.
   */
  readonly children: readonly (Atrule | Raw | Rule)[]
  /**
   * Always `StyleSheet`.
   */
  readonly type: 'StyleSheet'
}

/** A parsed stylesheet and what the parser could not read. */
export interface Parsed {
  /**
   * Each error, as `line: message`.
   */
  readonly errors: readonly string[]
  /**
   * The tree.
   */
  readonly sheet: StyleSheet
}

/**
 * Parses a stylesheet. **A custom property's value is parsed as a value**, so
 * the classifiers see `var()` inside `--_x: var(--y)` as they see it elsewhere.
 */
export const parseSheet = (source: string): Parsed => {
  const errors: string[] = []
  const tree = parse(source, {
    onParseError: (error) => {
      errors.push(`${error.line ?? 0}: ${error.message}`)
    },
    parseCustomProperty: true,
    positions: true,
  })
  return { errors, sheet: toPlainObject(tree) as StyleSheet }
}

/** A node written back out as CSS, on one line. */
export const print = (node: object): string => generate(node)

/** The line a node starts on, or 0 where the parser recorded none. */
export const lineOf = (node: Located): number => node.loc?.start.line ?? 0
