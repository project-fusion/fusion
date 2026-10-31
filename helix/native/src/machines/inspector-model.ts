/**
 * What an object inspector holds between renders, worked out as the web
 * element's `willUpdate` works it out, from core's arithmetic. Pure, so the
 * machine only runs what these say.
 */
import {
  cursorFor,
  flatten,
  type Row,
  search,
  seed,
  withAncestors,
} from '@fusion.dev/helix-core/object-inspector'

/** The props and the text the rows come from. */
export interface InspectorGiven {
  readonly active: string | undefined
  readonly depth: number
  readonly expanded: readonly string[] | undefined
  readonly filter: string
  readonly root: unknown
}

/** The rows, what opens them, and what they were last worked out from. */
export interface InspectorModel {
  readonly branches: ReadonlySet<string>
  readonly cursor: number
  readonly found: Set<string> | undefined
  readonly opened: ReadonlySet<string>
  readonly rows: readonly Row[]
  readonly seen: InspectorGiven | undefined
}

/** A model with nothing in it. */
export const emptyModel = (): InspectorModel => ({
  branches: new Set(),
  cursor: 0,
  found: undefined,
  opened: new Set(),
  rows: [],
  seen: undefined,
})

/** Whether `next` differs from what was last seen under `name`. */
const moved = <Name extends keyof InspectorGiven>(
  seen: InspectorGiven | undefined,
  next: InspectorGiven,
  name: Name,
): boolean => seen === undefined || seen[name] !== next[name]

/** The branches a new value or a new depth opens, and every branch. */
const seededFor = (
  model: InspectorModel,
  next: InspectorGiven,
  fresh: boolean,
  deep: boolean,
): { readonly branches: ReadonlySet<string>; readonly opened: ReadonlySet<string> } =>
  fresh || deep
    ? seed(next.root, next.depth, deep ? undefined : new Set(model.branches), new Set(model.opened))
    : model

/** The paths the filter matched, or nothing while there is no filter. */
const foundFor = (next: InspectorGiven): Set<string> | undefined =>
  next.filter.trim() === '' ? undefined : search(next.root, next.filter)

/** What moved since the model was last worked out. */
const changesOf = (seen: InspectorGiven | undefined, next: InspectorGiven) => ({
  deep: moved(seen, next, 'depth'),
  filtered: moved(seen, next, 'filter'),
  fresh: moved(seen, next, 'root'),
  wanted: moved(seen, next, 'active') ? next.active : undefined,
  written: moved(seen, next, 'expanded') && next.expanded !== undefined,
})

/** The paths whose surrounding branches open, as a filter matched or a written `active` names. */
const namedPaths = (
  changes: ReturnType<typeof changesOf>,
  found: Set<string> | undefined,
  next: InspectorGiven,
): readonly string[] => [
  ...(changes.fresh || changes.filtered ? (found ?? []) : []),
  ...(changes.wanted !== undefined && next.root !== undefined ? [changes.wanted] : []),
]

/**
 * The model for what is now given. A new value keeps the branches a reader
 * opened or closed where it still has them, a new depth opens anew, a written
 * `expanded` is exactly what opens, and a filter or a written `active` opens
 * the branches around what it names.
 */
export const settleModel = (model: InspectorModel, next: InspectorGiven): InspectorModel => {
  const changes = changesOf(model.seen, next)
  const { deep, filtered, fresh, wanted, written } = changes
  if (!(fresh || deep || written || filtered || wanted !== undefined)) {
    return model
  }
  const { branches, opened: seeded } = seededFor(model, next, fresh, deep)
  const found = fresh || filtered ? foundFor(next) : model.found
  const opened = withAncestors(
    written ? new Set(next.expanded) : seeded,
    branches,
    namedPaths(changes, found, next),
  )
  const rows = flatten(next.root, new Set(opened), found)
  const was = deep ? undefined : model.rows[model.cursor]?.path
  const cursor = cursorFor(rows, wanted ?? was, deep ? 0 : model.cursor, filtered)
  return { branches, cursor, found, opened, rows, seen: next }
}

/** The model with branches opened or closed by a reader, the active row staying where it can. */
export const openedModel = (
  model: InspectorModel,
  paths: readonly string[],
  open: boolean,
): InspectorModel => {
  const next = new Set(model.opened)
  for (const path of paths) {
    if (open) {
      next.add(path)
    } else {
      next.delete(path)
    }
  }
  const was = model.rows[model.cursor]?.path
  const rows = flatten(model.seen?.root, next, model.found)
  return { ...model, cursor: cursorFor(rows, was, model.cursor, false), opened: next, rows }
}
