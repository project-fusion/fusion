import type { ReactNode } from 'react'
import type { Family, Node } from '../style/form'
import type { Slotted } from '../style/resolved'
import { silent } from './semantics'
import { given, resolve, type Scope, type Values } from './styles'
import { ScaledText } from './text'

/** How a collection's items are numbered. */
type Counts = NonNullable<NonNullable<NonNullable<Family['api']>['collection']>['counts']>

/** Content as the children it is, nested arrays flattened, nothing left out. */
export const flat = (content: unknown): unknown[] => {
  if (Array.isArray(content)) {
    return content.flatMap(flat)
  }
  return content === undefined || content === null || content === false ? [] : [content]
}

/**
 * **The numbers its items count from**, as the web element writes them on
 * its slot: where the count starts, and down from the number of items where
 * it runs down.
 */
const numbersOf = (values: Values, counts: Counts, items: number): Record<string, number> => {
  const start = counts.start === undefined ? Number.NaN : Number(given(values, counts.start))
  const reversed = counts.reversed !== undefined && Boolean(given(values, counts.reversed))
  const from = Number.isFinite(start) ? Math.trunc(start) : undefined
  const first = reversed ? (from ?? items) : from
  return first === undefined ? {} : { [counts.first]: first, [counts.step]: reversed ? -1 : 1 }
}

/**
 * The values a collection's items count from, which its content inherits,
 * and its empty state, which holds while it has no items.
 */
export const numbering = (
  values: Values,
): { readonly empty: Record<string, boolean>; readonly numbers: Record<string, number> } => {
  const holds = values.family.api?.collection
  const items = flat(values.props.children).length
  return {
    empty: holds?.empty === undefined ? {} : { [holds.empty]: items === 0 },
    numbers: holds?.counts === undefined ? {} : numbersOf(values, holds.counts, items),
  }
}

/**
 * Runs one child's counters, as the host's `::slotted()` rules for its tag
 * say, in CSS's order: each increments, and then each is set. Gives back the
 * counters as they stand after it.
 */
export const step = (
  scope: Scope,
  child: unknown,
  place: 'first' | 'later',
  counters: Record<string, number>,
): Readonly<Record<string, number>> => {
  const tag = (child as { type?: { tag?: string } }).type?.tag
  const plain = resolve(scope, 'host', { child: place })
  const slotted = (tag === undefined ? undefined : plain.children[tag]) ?? plain.children['*']
  for (const [name, by] of Object.entries(slotted?.counting.increment ?? {})) {
    counters[name] = (counters[name] ?? 0) + by
  }
  for (const [name, to] of Object.entries(slotted?.counting.set ?? {})) {
    counters[name] = to
  }
  return { ...counters }
}

/** A system font's ascent, as a share of its size, which places a baseline. */
const ASCENT = 0.95

/** The parts the tree's regions are drawn as, in order. */
const regionParts = (nodes: readonly Node[]): string[] =>
  nodes.flatMap((node) => [
    ...(node.kind === 'region' && typeof node.attributes?.part === 'string'
      ? [node.attributes.part]
      : []),
    ...regionParts(node.children ?? []),
  ])

/**
 * **Where the first line's baseline is**, which a marker sits on: the first
 * part's own top padding, and the first line of the first text, a region
 * drawn as a part with a size, whose ascent a larger marker's has to meet.
 * The marker is drawn at a rem, the size a list item's marker takes on the
 * web where nothing sets one.
 */
const baseline = (scope: Scope): number => {
  const marked = scope.theme.rem
  const tree = scope.family.tree ?? []
  const first = tree[0]
  const lead =
    first !== undefined && first.kind !== 'region' && first.kind !== 'when'
      ? Number(resolve(scope, first).style.paddingTop ?? 0)
      : 0
  const words = regionParts(tree)
    .map((part) => resolve(scope, part).style.fontSize)
    .find((size): size is number => typeof size === 'number')
  return lead + ASCENT * ((words ?? marked) - marked)
}

/**
 * **A list item's marker hangs before it**, in the gutter its list keeps,
 * level with the first line. Nothing where the element around draws none.
 */
export const marker = (scope: Scope, slotted: Slotted | undefined): ReactNode =>
  slotted?.marker === undefined ? null : (
    <ScaledText
      {...silent}
      style={{
        color: scope.theme.tokens['color-foreground'],
        end: '100%',
        fontSize: scope.theme.rem,
        paddingEnd: scope.theme.spaceRem / 2,
        position: 'absolute',
        top: baseline(scope),
      }}
    >
      {slotted.marker}
    </ScaledText>
  )
