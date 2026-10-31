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
 * **Within a changed line it does compare.** A removed line and the added line
 * paired with it are compared word by word, which takes two short strings and
 * no dependency, so a reader sees which words changed without comparing two
 * whole lines by eye.
 *
 * **Line numbers come from the hunk headers**, so they are the file's numbers
 * rather than the diff's, which is the only kind a reader can look up. A line
 * that is not in a hunk is not in the output: file headers, `index` lines and
 * `diff --git` are metadata, and a name is taken from them and nothing else.
 */

/** A run of a changed line's text, and whether the line it is paired with lacks it. */
export interface DiffPiece {
  changed: boolean
  text: string
}

/** One line of a hunk, as the unified format marks it. */
export interface DiffLine {
  kind: 'added' | 'context' | 'removed'
  /** The number on the old side, absent for a line that only the new side has. */
  old?: number
  /** The number on the new side, absent for a line that only the old side has. */
  new?: number
  text: string
  /**
   * The line's text in runs, where it replaced a line or was replaced by one
   * and the two share some words. Absent for every other line.
   */
  pieces?: DiffPiece[]
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
 * The text with the indentation every line shares taken off.
 *
 * A diff written between two tags is text a formatter may indent, and an
 * indented `+` is not a mark at the start of its line. Only what every line
 * shares goes: a real patch's `---` and `@@` sit at the first column, so one
 * that nobody indented loses nothing, and a context line keeps the space that
 * marks it.
 */
const dedent = (text: string): string => {
  const lines = text.split('\n')
  const indents = lines
    .filter((line) => line.trim() !== '')
    .map((line) => /^[ \t]*/.exec(line)?.[0].length ?? 0)
  const common = indents.length === 0 ? 0 : Math.min(...indents)
  return common === 0 ? text : lines.map((line) => line.slice(common)).join('\n')
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

  for (const line of dedent(patch.replace(/\r\n?/g, '\n')).split('\n')) {
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
  for (const one of files) {
    for (const { lines } of one.hunks) {
      markWords(lines)
    }
  }
  return files
}

/** Words, runs of space, and single marks: what a changed line is compared in. */
const TOKEN = /[\p{L}\p{N}_]+|\s+|[^\p{L}\p{N}_\s]/gu

/**
 * Past this many tokens on either line, the comparison costs more than the
 * marks are worth, and the line is drawn whole, as GitHub draws a long one.
 */
const MOST_TOKENS = 200

/** Joins neighboring runs that are both changed or both shared. */
const joined = (pieces: DiffPiece[]): DiffPiece[] => {
  const out: DiffPiece[] = []
  for (const piece of pieces) {
    const last = out.at(-1)
    if (last && last.changed === piece.changed) {
      last.text += piece.text
    } else {
      out.push({ ...piece })
    }
  }
  return out
}

/**
 * The runs of two paired lines that the other line does not have, by the
 * longest run of words they share in order.
 *
 * **Space between two changes is part of the change**, so "a b" replaced by
 * "c d" is one run, with no gap for the eye to bridge. Two lines
 * that share no word share nothing worth marking: the whole line is the
 * change, which its own wash already says, and `undefined` draws it whole.
 */
export const changedWords = (
  before: string,
  after: string,
): [DiffPiece[], DiffPiece[]] | undefined => {
  const a = before.match(TOKEN) ?? []
  const b = after.match(TOKEN) ?? []
  if (a.length === 0 || b.length === 0 || a.length > MOST_TOKENS || b.length > MOST_TOKENS) {
    return undefined
  }
  /* The longest common subsequence, filled from the ends so each row reads
     forward. */
  const width = b.length + 1
  const table = new Uint16Array((a.length + 1) * width)
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i * width + j] =
        a[i] === b[j]
          ? (table[(i + 1) * width + j + 1] as number) + 1
          : Math.max(table[(i + 1) * width + j] as number, table[i * width + j + 1] as number)
    }
  }
  const left: DiffPiece[] = []
  const right: DiffPiece[] = []
  let shared = false
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      shared ||= (a[i] as string).trim() !== ''
      left.push({ changed: false, text: a[i] as string })
      right.push({ changed: false, text: b[j] as string })
      i += 1
      j += 1
    } else if (
      j >= b.length ||
      (i < a.length &&
        (table[(i + 1) * width + j] as number) >= (table[i * width + j + 1] as number))
    ) {
      left.push({ changed: true, text: a[i] as string })
      i += 1
    } else {
      right.push({ changed: true, text: b[j] as string })
      j += 1
    }
  }
  if (!shared) {
    return undefined
  }
  const bridged = (pieces: DiffPiece[]): DiffPiece[] =>
    joined(
      pieces.map((piece, at) =>
        !piece.changed &&
        piece.text.trim() === '' &&
        pieces[at - 1]?.changed &&
        pieces[at + 1]?.changed
          ? { ...piece, changed: true }
          : piece,
      ),
    )
  return [bridged(left), bridged(right)]
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

/**
 * Marks the words each changed line does not share with the line it is paired
 * with, the pairs being the ones the side-by-side view puts opposite each
 * other, so both views mark the same words.
 */
const markWords = (lines: DiffLine[]): void => {
  for (const { left, right } of pairLines(lines)) {
    if (left?.kind !== 'removed' || right?.kind !== 'added') {
      continue
    }
    const pieces = changedWords(left.text, right.text)
    if (pieces) {
      ;[left.pieces, right.pieces] = pieces
    }
  }
}

/** A stretch of a hunk's lines: drawn, or unchanged lines folded behind a control. */
export interface DiffRun {
  /** Whether the lines are unchanged ones folded away. */
  folded: boolean
  lines: DiffLine[]
  /** Where the run starts among the hunk's lines, which names a fold. */
  start: number
}

/**
 * A hunk's lines with each long run of unchanged lines folded, keeping `keep`
 * lines on the side of each change, as a code host draws a diff with more
 * context than a reader needs.
 *
 * A fold hides two lines or more: a control in place of one line is no
 * shorter than the line.
 */
export const foldContext = (lines: DiffLine[], keep: number): DiffRun[] => {
  const runs: DiffRun[] = []
  const add = (start: number, end: number, folded: boolean): void => {
    if (end <= start) {
      return
    }
    const last = runs.at(-1)
    if (last && !last.folded && !folded) {
      last.lines.push(...lines.slice(start, end))
    } else {
      runs.push({ folded, lines: lines.slice(start, end), start })
    }
  }
  let at = 0
  while (at < lines.length) {
    const context = lines[at]?.kind === 'context'
    let end = at
    while (end < lines.length && (lines[end]?.kind === 'context') === context) {
      end += 1
    }
    const head = context && at > 0 ? keep : 0
    const tail = context && end < lines.length ? keep : 0
    if (context && end - at - head - tail >= 2) {
      add(at, at + head, false)
      add(at + head, end - tail, true)
      add(end - tail, end, false)
    } else {
      add(at, end, false)
    }
    at = end
  }
  return runs
}
