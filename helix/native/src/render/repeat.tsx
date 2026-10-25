/**
 * A repeat: what it holds, drawn as many times as its `count` says, as a
 * skeleton draws one line of its paragraph for each of its `lines`, or once
 * for each entry of the list its `each` reads, keyed by the entry's `key`.
 */
import { Fragment, type ReactNode } from 'react'
import type { Node } from '../style/form'
import type { Style } from '../style/resolved'
import { listedFor } from './computed'
import { bound, type Draw, given, type Scope } from './styles'

/** The scope what a copy holds is drawn in: its own place in the tree, with the copy's entry. */
export const outOfCopy = (scope: Scope): Scope => {
  if (scope.copy === undefined) {
    return scope
  }
  const { copy: _copy, ...rest } = scope
  return rest
}

/** An entry of a list as a copy reads it: its fields, by name. */
type Fields = Readonly<Record<string, unknown>>

/**
 * The entries a repeat over a list draws a copy for: what the derivation its
 * `each` names computes, or the list the prop it binds holds. Absent for a
 * repeat that counts.
 */
const entriesOf = (scope: Scope, node: Node): readonly Fields[] | undefined => {
  const each = node.attributes?.each
  if (each === undefined) {
    return undefined
  }
  const listed =
    typeof each === 'object' && each !== null && 'derive' in each
      ? listedFor(scope, String(each.derive), (name) => given(scope, name))
      : bound(scope, each, node.name)
  return Array.isArray(listed)
    ? listed.filter((entry): entry is Fields => typeof entry === 'object' && entry !== null)
    : []
}

/**
 * Each copy's key: the entry's `key` field, or the copy's place where the
 * repeat counts. **A key two entries share is told apart by its place**, so
 * React keeps one view for each.
 */
const keysOf = (node: Node, entries: readonly Fields[] | undefined, count: number): string[] => {
  const field = node.attributes?.key
  const seen = new Set<string>()
  return Array.from({ length: count }, (_, at) => {
    const own = entries?.[at]?.[typeof field === 'string' ? field : '']
    const key = own === undefined || own === null ? `#${at}` : String(own)
    const unique = seen.has(key) ? `${key}#${at}` : key
    seen.add(unique)
    return `${node.name}-${unique}`
  })
}

/**
 * What a repeat draws: each copy keyed by its entry, or by its place where
 * it counts, standing there among the others, the first first and the last
 * last, which its rules read as `:first-child` and `:last-child`. What a
 * copy holds reads its entry's fields through `field()`, and its place, from
 * 0, through `index()`.
 */
export const drawRepeat = (
  scope: Scope,
  node: Node,
  text: Style,
  regions: Style,
  inside: Node | 'host',
  draw: Draw,
): ReactNode[] => {
  const entries = entriesOf(scope, node)
  const counted = Math.floor(Number(bound(scope, node.attributes?.count, node.name)))
  const count =
    entries === undefined ? (Number.isFinite(counted) && counted > 0 ? counted : 0) : entries.length
  const keys = keysOf(node, entries, count)
  return keys.map((key, at) => {
    const copy = {
      child: at === 0 ? 'first' : 'later',
      fromEnd: count - at,
      index: at + 1,
      last: at === count - 1,
    } as const
    const item = { fields: entries?.[at] ?? scope.item?.fields ?? {}, index: at }
    return (
      <Fragment key={key}>
        {(node.children ?? []).map((child, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: what a repeat holds never reorders
          <Fragment key={`${child.name}-${index}`}>
            {draw({ ...scope, copy, item }, child, text, regions, inside)}
          </Fragment>
        ))}
      </Fragment>
    )
  })
}
