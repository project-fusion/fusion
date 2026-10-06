/**
 * The value at `path` in a row of data, or `undefined` where the path leads
 * nowhere: the field a Table or Data Table column, a Data Table's `row-key`
 * or a Virtual List's template hole names.
 *
 * A dot separates keys, so `author.name` reads `row.author.name`. A key that
 * holds a dot itself is read whole first, so a flat record with a key such as
 * `"v1.2"` keeps working. An empty path reads nothing, and so does a row that
 * is no record. `undefined` is drawn as an empty cell: a missing key is a hole
 * in the data, and drawing "undefined" tells a reader the software is broken.
 *
 * Written here rather than taken from a library, because the whole of what is
 * needed is "walk the keys and stop at the first thing that is not an object".
 */
export const valueAt = (row: unknown, path: string): unknown => {
  if (path === '' || row === null || typeof row !== 'object') {
    return undefined
  }
  const record = row as Record<string, unknown>
  if (path in record) {
    return record[path]
  }
  let value: unknown = record
  for (const key of path.split('.')) {
    if (value === null || typeof value !== 'object') {
      return undefined
    }
    value = (value as Record<string, unknown>)[key]
  }
  return value
}
