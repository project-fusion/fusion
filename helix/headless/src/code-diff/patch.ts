/**
 * Reading a unified diff into the lines a reader sees.
 *
 * **This reads a diff and never computes one.** Which lines changed is the
 * answer an algorithm gives, and consumers already have that algorithm where
 * the two versions live, usually on a server: `git diff`, `diff -u`, a patch
 * from a code host's API. Taking its output keeps the algorithm, and whatever it
 * depends on, out of a component library. What is left is punctuation: a header
 * per file, a `@@` per hunk, and a first character per line.
 *
 * **Line numbers come from the hunk headers**, so they are the file's numbers
 * rather than the diff's, which is the only kind a reader can look up. A line
 * that is not in a hunk is not in the output: file headers, `index` lines and
 * `diff --git` are metadata, and a name is taken from them and nothing else.
 */

/** One line of a hunk, as the unified format marks it. */
export interface DiffLine {
  kind: 'added' | 'context' | 'removed'
  /** The number on the old side, absent for a line that only the new side has. */
  old?: number
  /** The number on the new side, absent for a line that only the old side has. */
  new?: number
  text: string
}

/** A `@@` header and the lines under it. */
export interface DiffHunk {
  header: string
  lines: DiffLine[]
}

/** Everything a patch says about one file. */
export interface DiffFile {
  /** The path, from `+++` or from `---` when the file was deleted. Empty when the patch has none. */
  name: string
  hunks: DiffHunk[]
}

/** One row of a side-by-side view: a line on either side, or nothing there. */
export interface DiffRow {
  left?: DiffLine | undefined
  right?: DiffLine | undefined
}

const HUNK = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/

/** A path as a header writes it, without the `a/` or `b/` git puts in front. */
const path = (line: string): string => {
  const raw = line.slice(4).split('\t')[0]?.trim() ?? ''
  return raw === '/dev/null' ? '' : raw.replace(/^[ab]\//, '')
}

/**
 * The files in a unified diff, each with its hunks.
 *
 * **A hunk is read to the counts its header states**, `@@ -12,7 +12,8 @@` being
 * seven lines of the old file and eight of the new. That is what tells a
 * removed line reading `-- note` from a file header, and a context line whose
 * trailing space an editor stripped from the blank line that ends the patch.
 *
 * Lenient where the format is loose: a patch with no file headers is one
 * nameless file, and `\ No newline at end of file` is a note about the line
 * before it rather than a line of its own, so it is dropped.
 */
export const parsePatch = (patch: string): DiffFile[] => {
  const files: DiffFile[] = []
  let file: DiffFile | undefined
  let hunk: DiffHunk | undefined
  let before = 0
  let after = 0
  let owed = { new: 0, old: 0 }
  let from = ''

  for (const line of patch.replace(/\r\n?/g, '\n').split('\n')) {
    if (hunk && (owed.old > 0 || owed.new > 0)) {
      const mark = line[0]
      const text = line.slice(1)
      if (mark === '+') {
        hunk.lines.push({ kind: 'added', new: after++, text })
        owed.new -= 1
      } else if (mark === '-') {
        hunk.lines.push({ kind: 'removed', old: before++, text })
        owed.old -= 1
      } else if (mark === ' ' || line === '') {
        hunk.lines.push({ kind: 'context', new: after++, old: before++, text })
        owed = { new: owed.new - 1, old: owed.old - 1 }
      }
      continue
    }
    if (line.startsWith('diff --git ')) {
      file = undefined
      from = ''
    } else if (line.startsWith('--- ')) {
      from = path(line)
    } else if (line.startsWith('+++ ')) {
      file = { hunks: [], name: path(line) || from }
      files.push(file)
    } else {
      const header = HUNK.exec(line)
      if (header) {
        if (!file) {
          file = { hunks: [], name: from }
          files.push(file)
        }
        hunk = { header: line, lines: [] }
        file.hunks.push(hunk)
        before = Number(header[1])
        after = Number(header[3])
        owed = { new: Number(header[4] ?? 1), old: Number(header[2] ?? 1) }
      }
    }
  }
  return files
}

/**
 * A hunk's lines paired for a side-by-side view.
 *
 * Context sits on both sides. A run of removals followed by a run of additions
 * is one change, and its lines are paired in order, the longer run's remainder
 * standing opposite nothing: that is what lets the eye read a changed line
 * across rather than hunting for it further down.
 */
export const pairLines = (lines: DiffLine[]): DiffRow[] => {
  const rows: DiffRow[] = []
  let at = 0
  while (at < lines.length) {
    const line = lines[at] as DiffLine
    if (line.kind === 'context') {
      rows.push({ left: line, right: line })
      at += 1
      continue
    }
    const removed: DiffLine[] = []
    const added: DiffLine[] = []
    while (lines[at]?.kind === 'removed') {
      removed.push(lines[at] as DiffLine)
      at += 1
    }
    while (lines[at]?.kind === 'added') {
      added.push(lines[at] as DiffLine)
      at += 1
    }
    for (let row = 0; row < Math.max(removed.length, added.length); row += 1) {
      rows.push({ left: removed[row], right: added[row] })
    }
  }
  return rows
}
