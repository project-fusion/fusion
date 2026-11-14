/** One visible line of the tree: a value, where it sits, and whether it is open. */
export interface Row {
  branch: boolean
  depth: number
  /** The property name or array index this value is under; absent for the root. */
  key?: string
  /** Whether its key or its value holds what the tree is filtered by. */
  match: boolean
  open: boolean
  path: string
  position: number
  siblings: number
  value: unknown
}

/** Whether a value has entries of its own, an object or an array. */
export const branchy = (value: unknown): value is object =>
  value !== null && typeof value === 'object'

/** A branch's entries, an array's under its indexes. */
export const entries = (value: object): [string, unknown][] =>
  Array.isArray(value) ? value.map((item, at) => [String(at), item]) : Object.entries(value)

/** A child's path under its parent's, escaped the way a JSON Pointer escapes one. */
export const child = (path: string, key: string): string =>
  `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`

/**
 * Every branch a path sits inside, from the root down, and not the path itself.
 *
 * The root's path is the empty string, so every other path has it first. A
 * key's own `/` is escaped as `~1`, so cutting at each `/` cuts between keys.
 */
export const ancestorsOf = (path: string): string[] => {
  const cuts: string[] = []
  for (let at = path.indexOf('/'); at !== -1; at = path.indexOf('/', at + 1)) {
    cuts.push(path.slice(0, at))
  }
  return cuts
}

/** A leaf as the words a reader would search for: a string without its quotes. */
const words = (value: unknown): string => (branchy(value) ? '' : String(value))

/**
 * The paths of every entry whose key or value holds `query`, ignoring case,
 * across the whole value and not only the open branches.
 *
 * A branch is matched by its key alone: its brackets and its count are drawn,
 * and they are not what a reader is looking for.
 */
export const search = (root: unknown, query: string): Set<string> => {
  const found = new Set<string>()
  const wanted = query.trim().toLocaleLowerCase()
  if (wanted === '' || root === undefined) {
    return found
  }
  const visit = (value: unknown, path: string, key?: string): void => {
    if (
      key?.toLocaleLowerCase().includes(wanted) ||
      words(value).toLocaleLowerCase().includes(wanted)
    ) {
      found.add(path)
    }
    if (branchy(value)) {
      for (const [name, item] of entries(value)) {
        visit(item, child(path, name), name)
      }
    }
  }
  visit(root, '')
  return found
}

/**
 * Every visible row, in order, for a value with `opened` branches open.
 *
 * With `found`, the paths a filter matched, a branch shows only the entries
 * that matched or lead to one, and a matched entry shows everything under it.
 * Position and set size count the entries shown, which is the set a reader
 * hears.
 */
export const flatten = (root: unknown, opened: Set<string>, found?: Set<string>): Row[] => {
  const rows: Row[] = []
  if (root === undefined) {
    return rows
  }
  const trail = new Set([...(found ?? [])].flatMap(ancestorsOf))
  const visit = (
    value: unknown,
    path: string,
    depth: number,
    position: number,
    siblings: number,
    under: boolean,
    key?: string,
  ): void => {
    const branch = branchy(value)
    const open = branch && opened.has(path)
    const match = found?.has(path) === true
    rows.push({
      branch,
      depth,
      match,
      open,
      path,
      position,
      siblings,
      value,
      ...(key === undefined ? {} : { key }),
    })
    if (!open) {
      return
    }
    const inside = under || match || !found
    const children = entries(value)
      .map(([name, item]): [string, unknown, string] => [name, item, child(path, name)])
      .filter(([, , at]) => inside || found?.has(at) || trail.has(at))
    children.forEach(([name, item, at], index) => {
      visit(item, at, depth + 1, index + 1, children.length, inside && !!found, name)
    })
  }
  if (!found || found.has('') || trail.has('')) {
    visit(root, '', 0, 1, 1, false)
  }
  return rows
}

/**
 * Which branches are open for a value, by path.
 *
 * Every branch shallower than `depth` opens. A branch in `known`, the
 * branches of the last value, keeps whether it was in `opened`, so a new value
 * keeps the branches a reader opened or closed and only a new one takes the
 * default. Returns the open branches and every branch, for the next value to
 * be told apart from this one.
 */
export const seed = (
  root: unknown,
  depth: number,
  known: Set<string> = new Set(),
  opened: Set<string> = new Set(),
): { branches: Set<string>; opened: Set<string> } => {
  const open = new Set<string>()
  const branches = new Set<string>()
  const visit = (value: unknown, path: string, level: number): void => {
    if (!branchy(value)) {
      return
    }
    branches.add(path)
    if (known.has(path) ? opened.has(path) : level < depth) {
      open.add(path)
    }
    for (const [name, item] of entries(value)) {
      visit(item, child(path, name), level + 1)
    }
  }
  visit(root, '', 0)
  return { branches, opened: open }
}

/**
 * Where the active row goes once the rows have moved, as an index into `rows`.
 *
 * Onto `path` where it is still shown. Where a filter just hid it
 * (`filtered`), onto the first match. Otherwise onto the nearest branch around
 * it that is shown. With no path to keep, `cursor` held inside the rows.
 */
export const cursorFor = (
  rows: readonly Row[],
  path: string | undefined,
  cursor: number,
  filtered: boolean,
): number => {
  const at = (one: string): number => rows.findIndex((row) => row.path === one)
  const own = path === undefined ? -1 : at(path)
  if (own >= 0 || path === undefined) {
    return own >= 0 ? own : Math.min(cursor, Math.max(0, rows.length - 1))
  }
  const match = filtered ? rows.findIndex((row) => row.match) : -1
  const around = ancestorsOf(path)
    .reverse()
    .map(at)
    .find((one) => one >= 0)
  return match >= 0 ? match : (around ?? 0)
}

/**
 * The open branches with every branch around each of `paths` opened too,
 * where the value has that branch (`branches`).
 */
export const withAncestors = (
  opened: ReadonlySet<string>,
  branches: ReadonlySet<string>,
  paths: Iterable<string>,
): Set<string> => {
  const next = new Set(opened)
  for (const path of paths) {
    for (const above of ancestorsOf(path)) {
      if (branches.has(above)) {
        next.add(above)
      }
    }
  }
  return next
}

/**
 * The branches `*` opens from `row`: every branch at its depth under the same
 * parent, itself included, that is not open yet.
 */
export const siblingBranches = (rows: readonly Row[], row: Row): string[] => {
  const parent = row.path.slice(0, row.path.lastIndexOf('/'))
  return rows
    .filter(
      (one) =>
        one.branch &&
        !one.open &&
        one.depth === row.depth &&
        one.path.slice(0, one.path.lastIndexOf('/')) === parent,
    )
    .map((one) => one.path)
}
