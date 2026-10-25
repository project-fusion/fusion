/**
 * What an element holds at one render, which its rules read: the regions
 * that hold something, the parts its tree draws, and whether it is at its
 * first render.
 */
import { useEffect, useState } from 'react'
import type { Family, Node } from '../style/form'
import type { Props } from './behavior'
import { holdsContent } from './computed'
import { camel } from './styles'

/** What is passed into the region `name`: `children` for the default one. */
const contentOf = (props: Props, name: string): unknown =>
  name === 'default' ? props.children : props[camel(name)]

/** The name of every region the tree draws that holds something, in tree order. */
export const filledRegions = (family: Family, props: Props): string[] => {
  const found: string[] = []
  const walk = (nodes: readonly Node[] | undefined): void => {
    for (const node of nodes ?? []) {
      if (node.kind === 'region' && holdsContent(contentOf(props, node.name))) {
        found.push(node.name)
      }
      walk(node.children)
    }
  }
  walk(family.tree)
  return [...new Set(found)]
}

/**
 * The parts the tree draws under `conditions`, as the web's shadow tree holds
 * them, which `:has([part="icon"])` reads. **A `when` draws its node while
 * it holds**, an `unless` while it does not, and a region draws what it falls
 * back to only while nothing is passed in. A part drawn and hidden is drawn,
 * as an element with `hidden` is still in the shadow tree.
 */
export const drawnParts = (
  family: Family,
  conditions: Readonly<Record<string, unknown>>,
  filled: readonly string[],
): string[] => {
  const found = new Set<string>()
  const walk = (nodes: readonly Node[] | undefined): void => {
    for (const node of nodes ?? []) {
      for (const part of partsOf(node)) {
        found.add(part)
      }
      if (drawsInside(node, conditions, filled)) {
        walk(node.children)
      }
    }
  }
  walk(family.tree)
  return [...found]
}

/** The parts a node is itself: none for a `when`, and a region's `part`. */
const partsOf = (node: Node): string[] => {
  /* A part only a phone draws is no part the web's `:has()` finds. */
  if (node.kind === 'when' || node.attributes?.platform === 'native') {
    return []
  }
  if (node.kind !== 'region') {
    return [node.name]
  }
  const part = node.attributes?.part
  return typeof part === 'string' ? [part] : []
}

/** Whether a node draws what it holds now. */
const drawsInside = (
  node: Node,
  conditions: Readonly<Record<string, unknown>>,
  filled: readonly string[],
): boolean => {
  if (node.kind === 'when') {
    return Boolean(conditions[node.name]) !== (node.attributes?.unless === true)
  }
  return node.kind !== 'region' || !filled.includes(node.name)
}

/**
 * What an element's rules read of what it holds, laid over its context: the
 * regions that hold something, the `has-` states the web element sets as
 * they fill, whether it is entering, and the parts its tree draws where a
 * rule asks.
 */
export const heldBy = (
  family: Family,
  props: Props,
  conditions: Readonly<Record<string, boolean | string | undefined>>,
  entering: boolean,
  presence: boolean,
) => {
  const filled = filledRegions(family, props)
  return {
    conditions: { ...conditions, ...hasStates(family, props, filled) },
    ...(entering ? { entering } : {}),
    filled,
    ...(presence ? { drawn: drawnParts(family, conditions, filled) } : {}),
  }
}

/**
 * Whether the element is at its first render, which a rule under `entering`
 * reads, as `@starting-style` on the web: true as it is drawn, and false from
 * the render after, so its transitions move from the entering values.
 */
export const useEntering = (reads: boolean): boolean => {
  const [entering, setEntering] = useState(reads)
  useEffect(() => {
    if (reads) {
      setEntering(false)
    }
  }, [reads])
  return entering
}

/**
 * The `has-` states the web element sets while a region holds something,
 * each by the state's name: `has-label` while the `label` region does, or
 * while the prop of that name holds words. **A state the family computes in
 * its `derived` is left to it**, as a card's `has-footer` is.
 */
export const hasStates = (
  family: Family,
  props: Props,
  filled: readonly string[],
): Record<string, boolean> => {
  const states: Record<string, boolean> = {}
  for (const state of family.api?.states ?? []) {
    const region = state.startsWith('has-') ? state.slice('has-'.length) : undefined
    if (region === undefined || family.api?.derived?.[state] !== undefined) {
      continue
    }
    const words = props[camel(region)]
    states[state] = filled.includes(region) || (typeof words === 'string' && words !== '')
  }
  return states
}

/** Whether any of a family's rules reads `kind`, so an element that reads none draws no more for it. */
export const readsCondition = (family: Family, kind: string): boolean =>
  JSON.stringify(family.rules ?? []).includes(`"kind":"${kind}"`)
