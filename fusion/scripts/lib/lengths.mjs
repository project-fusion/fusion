/**
 * Which source files are longer than the repository allows, judged against
 * the list of files that already were. A module, not a script:
 * `check-lengths.mjs` reads the files and prints the verdict.
 *
 * **The list only shrinks.** A file on it may stay as long as it is, and a
 * file that comes off it, by a split or a deletion, must come off the list in
 * the same change, so the list never holds a place a new long file could take.
 */

/** The most lines a source file may have. */
export const LIMIT = 400

/** Lines as `wc -l` counts them: a final newline ends the last line. */
export const lines = (text) =>
  text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0)

/**
 * The verdict on `lengths`, each file's line count by path, against `listed`,
 * the files allowed to be longer.
 *
 * @returns `over`, the files longer than the limit and not listed; `off`, the
 * listed files that are gone or no longer longer, which come off the list; and
 * `held`, how many files hold to the limit.
 */
export const judge = (lengths, listed, limit = LIMIT) => {
  const allowed = new Set(listed)
  const over = [...lengths]
    .filter(([path, count]) => count > limit && !allowed.has(path))
    .map(([path, count]) => ({ count, path }))
    .sort((first, second) => (first.path < second.path ? -1 : 1))
  const off = listed.filter((path) => !((lengths.get(path) ?? 0) > limit)).sort()
  const held = [...lengths.values()].filter((count) => count <= limit).length
  return { held, off, over }
}
