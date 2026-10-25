/** What each region of a family gives the content passed into it. */
import { cascade } from './conditions.js'
import type { Context } from './context.js'
import { deferFrom } from './deferred.js'
import type { Family, Node, Value } from './form.js'
import type { Content, Counting, Resolution, Slotted, Style, Transition } from './resolved.js'

/** Declarations as a style, resolved at the host. */
export type Finish = (declared: Map<string, Value>) => {
  readonly counting: Counting
  readonly custom: Readonly<Record<string, Resolution>>
  readonly marker: string | undefined
  readonly out: Style
  readonly transitions: Readonly<Record<string, Transition>>
}

/**
 * How a child passed in moves, as its `::slotted()` rules' transitions say,
 * where it moves at all: none under reduced motion.
 */
export const movesOf = (
  context: Context,
  transitions: Readonly<Record<string, Transition>>,
): { readonly transitions?: Readonly<Record<string, Transition>> } =>
  context.reducedMotion === true || Object.keys(transitions).length === 0 ? {} : { transitions }

/**
 * Each region in a tree, by name, with the parts it is drawn inside,
 * outermost first.
 */
const regionsOf = (nodes: readonly Node[], around: readonly string[] = []): [string, string[]][] =>
  nodes.flatMap((node) => {
    const named = node.kind === 'box' || node.kind === 'pressable' || node.kind === 'live'
    const inside = named ? [...around, node.name] : [...around]
    const here: [string, string[]][] = node.kind === 'region' ? [[node.name, [...around]]] : []
    return [...here, ...regionsOf(node.children ?? [], inside)]
  })

/**
 * What each region gives the content passed into it, from the rules on that
 * region or on every region, each matched under the parts the region is
 * drawn inside, in the browser's order.
 *
 * **A region rule is the slot's, and a slot draws no box of its own**, so its
 * text style is what the content inherits, and with `slotted` the style goes
 * to each child passed in, as it does on the web.
 */
export const regional = (
  family: Family,
  context: Context,
  finish: Finish,
  resolve: (value: Value) => Resolution,
): Record<string, Content> => {
  const contents: Record<string, Content> = {}
  for (const [region, around] of regionsOf(family.tree ?? [])) {
    const on = cascade(family, context, [...around, ...(context.inside ?? [])]).filter(
      (rule) => (rule.region === region || rule.region === '*') && rule.inner === undefined,
    )
    if (on.length === 0) {
      continue
    }
    const declared = (slotted: string | undefined) => {
      const out = new Map<string, Value>()
      for (const rule of on) {
        if (rule.slotted === slotted) {
          for (const [property, value] of rule.set) {
            out.delete(property)
            out.set(property, value)
          }
        }
      }
      return out
    }
    const children: Record<string, Slotted> = {}
    for (const tag of new Set(on.flatMap((rule) => rule.slotted ?? []))) {
      const values: Record<string, Resolution> = {}
      for (const rule of on) {
        if (rule.slotted === tag) {
          for (const [name, value] of rule.values) {
            values[name] = resolve(value)
          }
        }
      }
      const set = declared(tag)
      const deferred = deferFrom(set, resolve)
      const given = finish(set)
      children[tag] = {
        counting: given.counting,
        custom: given.custom,
        ...(deferred.length === 0 ? {} : { deferred }),
        ...(given.marker === undefined ? {} : { marker: given.marker }),
        style: given.out,
        ...movesOf(context, given.transitions),
        values,
      }
    }
    const own = finish(declared(undefined))
    contents[region] = { children, custom: own.custom, style: own.out }
  }
  return contents
}
