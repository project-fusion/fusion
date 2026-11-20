/**
 * What a phone's code block draws, worked out from its code: one pane for plain
 * code or for each file of a diff, and what each stands for, as plain entries a
 * `<Repeat>` reads. Core's arithmetic reads the code, the same the web element
 * reads, so the lines, the hunks, and the folds are the same on both platforms.
 */
import {
  type CodeBlockTokens,
  type CodeRun,
  type DiffFile,
  type DiffHunk,
  type DiffLine,
  type DiffRun,
  foldContext,
  highlightedLines,
  lineCount,
  lineRuns,
  markupRuns,
  pairLines,
  parsePatch,
} from '@fusion.dev/helix-core/code-block'
import { formatMessage } from '@fusion.dev/helix-core/words'

/** Where a line of code is laid out in its words, from their top. */
export interface LineBox {
  readonly bottom: number
  readonly top: number
}

/** What a phone's text layout says of one row of words. */
export interface LaidRow {
  readonly height: number
  readonly text: string
  readonly width: number
  readonly y: number
}

/**
 * Where each line of `code` stands among the rows its words were laid out in:
 * one row, or several where it wraps. A row's text holds the line break that ends
 * it where it has one, so the rows of a line are counted by their characters.
 */
export const lineBoxes = (code: string, rows: readonly LaidRow[]): LineBox[] => {
  const boxes: LineBox[] = []
  let at = 0
  for (const line of code.replace(/\r?\n$/, '').split(/\r?\n/)) {
    const first = rows[at]
    if (first === undefined) {
      break
    }
    let left = line.length
    let bottom = first.y + first.height
    at += 1
    left -= first.text.replace(/\r?\n$/, '').length
    while (left > 0 && rows[at] !== undefined) {
      const row = rows[at] as LaidRow
      left -= row.text.replace(/\r?\n$/, '').length
      bottom = row.y + row.height
      at += 1
    }
    boxes.push({ bottom, top: first.y })
  }
  return boxes
}

/** What a code block's pane reads, from the element's props and what it holds. */
export interface PaneGiven {
  readonly actions: boolean
  readonly addedLines: string
  readonly boxes: readonly LineBox[]
  readonly codeLabel: string
  readonly contextLines: number | undefined
  readonly copyLabel: string
  readonly copyNameLabel: string
  readonly diff: boolean
  readonly hideUnchangedLabel: string
  readonly highlight: ((code: string, language: string) => string | undefined) | undefined
  readonly label: string
  readonly labeled: boolean
  readonly language: string
  readonly lineNumbers: boolean
  readonly locale: string
  readonly markLines: string
  readonly noCopy: boolean
  readonly removedLines: string
  readonly showUnchangedLabel: string
  readonly split: boolean
  readonly tabbed: boolean
  readonly text: string
  readonly tokens: CodeBlockTokens | undefined
  readonly unfolded: ReadonlySet<string>
  readonly wrap: boolean
  readonly wrappable: boolean
}

/** What a block's runs read. */
export interface RunsGiven {
  readonly highlight: PaneGiven['highlight']
  readonly language: string
  readonly text: string
  readonly tokens: CodeBlockTokens | undefined
}

/** A highlight's markup as runs, or nothing for a language it does not read. */
const highlighted = ({ highlight, language, text }: RunsGiven): readonly CodeRun[] | undefined => {
  const markup = highlight?.(text, language)
  return markup === undefined ? undefined : markupRuns(highlightedLines(markup))
}

/** Runs of the code, by what the page gave, and the code whole where it gave nothing. */
export const runsOfCode = (given: RunsGiven): readonly CodeRun[] => {
  const { highlight, language, text, tokens } = given
  if (text === '') {
    return []
  }
  /* A throw is the page's fault and must not cost the reader the code. */
  try {
    return (highlight ? highlighted(given) : tokens?.(text, language)) ?? [{ text }]
  } catch (error) {
    ;(globalThis as { reportError?: (error: unknown) => void }).reportError?.(error)
    return [{ text }]
  }
}

/** The name on a copy button, which says the block's or the file's name where it has one. */
const copyNameOf = (given: PaneGiven, name: string): string =>
  name === ''
    ? given.copyLabel
    : formatMessage(given.copyNameLabel, { copy: given.copyLabel, name }, given.locale)

/** Where the copy button stands: in the header wherever there is one, and beside the code. */
const copyPlace = (headed: boolean, copies: boolean) => ({
  copyBeside: !headed && copies,
  copyInFrameHidden: headed || !copies,
  copyInHeader: headed && copies,
  copyInHeaderHidden: !headed || !copies,
})

/** What decides a pane's header: its name and what the page put there. */
const headerOf = (given: PaneGiven, name: string, own: boolean) => {
  const slotted = own && !given.tabbed && given.labeled
  const drawn = given.tabbed || slotted ? '' : name
  const wraps = given.wrappable && !given.diff
  const acts = own && given.actions
  const headed = [drawn !== '', wraps, given.actions, slotted].includes(true)
  const copies = !given.noCopy
  return {
    actionsHidden: !acts,
    afterActions: acts,
    afterToggle: acts || wraps,
    ...copyPlace(headed, copies),
    copyName: copyNameOf(given, name),
    drawn,
    flatTop: headed || given.tabbed,
    headerHidden: !headed,
    iconsHidden: true,
    labelHidden: drawn === '' && !slotted,
    labelSlotHidden: !slotted,
    wrapHidden: !wraps,
    wrapPressed: given.wrap,
    wrapped: given.wrap,
  }
}

/** A band for each run the `mark-lines`, `added-lines`, and `removed-lines` name. */
const marksOf = (given: PaneGiven) => {
  const kinds = [
    { added: false, lines: given.markLines, name: 'mark', removed: false },
    { added: true, lines: given.addedLines, name: 'added', removed: false },
    { added: false, lines: given.removedLines, name: 'removed', removed: true },
  ]
  return kinds.flatMap((kind) =>
    lineRuns(kind.lines).map(([first, last]) => {
      const top = given.boxes[first - 1]
      const bottom = given.boxes[Math.min(last, given.boxes.length) - 1]
      return {
        added: kind.added,
        bottom: bottom?.bottom ?? 0,
        hidden: top === undefined || bottom === undefined,
        key: `${kind.name}-${first}-${last}`,
        removed: kind.removed,
        top: top?.top ?? 0,
      }
    }),
  )
}

/** One piece of a changed line, or its whole words. */
const piecesOf = (line: DiffLine) =>
  (line.pieces ?? [{ changed: false, text: line.text }]).map((piece, at) => ({
    added: piece.changed && line.kind === 'added',
    key: String(at),
    plain: !piece.changed,
    removed: piece.changed && line.kind === 'removed',
    text: piece.text,
  }))

/** A row of a diff, as a copy of the repeat reads it. */
type Row = Readonly<Record<string, unknown>>

/** What every kind of row holds, each kind told apart by what it hides. */
const ROW_KINDS = {
  fillerHidden: true,
  foldHidden: true,
  hunkHidden: true,
  lineHidden: true,
} as const

/** A line of a diff as a row, with the numbers of the side it stands on, or both. */
const lineRow = (line: DiffLine, width: number, key: string, side?: 'new' | 'old'): Row => {
  const shown = side === undefined ? [line.old, line.new] : [side === 'old' ? line.old : line.new]
  const marker = line.kind === 'added' ? '+' : line.kind === 'removed' ? '-' : ' '
  return {
    ...ROW_KINDS,
    added: line.kind === 'added',
    foldKey: '',
    key,
    lineHidden: false,
    marker,
    numbers: shown.map((value, at) => ({
      key: String(at),
      words: String(value ?? '').padStart(width),
    })),
    pieces: piecesOf(line),
    removed: line.kind === 'removed',
    said: `${marker} ${line.text}`.trim(),
    words: '',
  }
}

/** Fields of the rows that are not lines. */
const NOT_LINE = {
  added: false,
  marker: '',
  numbers: [],
  pieces: [],
  removed: false,
  said: '',
} as const

/** A hunk's `@@` line as a row. */
const hunkRow = (hunk: DiffHunk, key: string, silent: boolean): Row => ({
  ...ROW_KINDS,
  ...NOT_LINE,
  foldKey: '',
  hunkHidden: false,
  key,
  silent,
  words: hunk.header,
})

/** A row opposite a line the other side does not have. */
const fillerRow = (key: string): Row => ({
  ...ROW_KINDS,
  ...NOT_LINE,
  fillerHidden: false,
  foldKey: '',
  key,
  words: '',
})

/** How one side of a file reads its rows. */
interface SideOf {
  readonly at: number
  readonly given: PaneGiven
  readonly side: 'new' | 'old' | undefined
  readonly width: number
}

/** A folded run's button, and the run's lines once it is open. */
const foldRows = (run: DiffRun, foldKey: string, of: SideOf): Row[] => {
  const { given, side, width } = of
  const open = given.unfolded.has(foldKey)
  const button = {
    ...ROW_KINDS,
    ...NOT_LINE,
    foldHidden: false,
    foldKey,
    key: `${side ?? ''}fold-${foldKey}`,
    open,
    silent: side === 'new',
    words: formatMessage(
      open ? given.hideUnchangedLabel : given.showUnchangedLabel,
      { count: run.lines.length },
      given.locale,
    ),
  }
  return [
    button,
    ...(open ? run.lines.map((line, at) => lineRow(line, width, `${foldKey}-${at}`, side)) : []),
  ]
}

/** The rows of one version of a file, or of both in one column. */
const rowsOf = (file: DiffFile, of: SideOf): Row[] => {
  const { at, given, side, width } = of
  const keep = given.contextLines
  return file.hunks.flatMap((hunk, h) => {
    const runs: DiffRun[] =
      keep === undefined || keep < 0
        ? [{ folded: false, lines: hunk.lines, start: 0 }]
        : foldContext(hunk.lines, Math.floor(keep))
    return [
      hunkRow(hunk, `hunk-${h}`, side === 'new'),
      ...runs.flatMap((run) => {
        const key = `${at}:${h}:${run.start}`
        if (run.folded) {
          return foldRows(run, key, of)
        }
        if (side === undefined) {
          return run.lines.map((line, l) => lineRow(line, width, `${key}-${l}`))
        }
        return pairLines(run.lines).map(({ left, right }, l) => {
          const line = side === 'old' ? left : right
          return line ? lineRow(line, width, `${key}-${l}`, side) : fillerRow(`${key}-${l}`)
        })
      }),
    ]
  })
}

/** How wide a file's numbers are, as the widest it holds. */
const widthOf = (file: DiffFile): number =>
  String(
    Math.max(
      0,
      ...file.hunks.flatMap((hunk) =>
        hunk.lines.map((line) => Math.max(line.old ?? 0, line.new ?? 0)),
      ),
    ),
  ).length

/** What a reader copying from a review takes away: every line but the removed ones. */
const nowOf = (file: DiffFile): string =>
  file.hunks
    .flatMap((hunk) => hunk.lines.filter((line) => line.kind !== 'removed'))
    .map((line) => line.text)
    .join('\n')

/** Everything a pane's parts hide because it is the other kind. */
const PLAIN_ONLY = { blockHidden: false, sides: [], splitHidden: true } as const

/** One pane of plain code. */
const plainPane = (given: PaneGiven, runs: readonly CodeRun[]) => {
  const name = given.label || given.language
  const lines = lineCount(given.text)
  const numbers = Array.from({ length: lines }, (_, at) => ({
    key: String(at),
    words: String(at + 1),
  }))
  return {
    ...PLAIN_ONLY,
    ...headerOf(given, name, true),
    copyText: given.text,
    gutterHidden: !given.lineNumbers,
    key: 'code',
    marks: marksOf(given),
    numbers,
    runs: runs.map((run, at) => ({ ...run, key: String(at) })),
  }
}

/** One pane for a file of a diff: one side, or two in a split. */
const filePane = (given: PaneGiven, file: DiffFile, at: number) => {
  const width = widthOf(file)
  const name = file.name || given.label
  const of = (side: 'new' | 'old' | undefined): SideOf => ({ at, given, side, width })
  const sides = given.split
    ? [
        { isNew: false, key: 'old', rows: rowsOf(file, of('old')) },
        { isNew: true, key: 'new', rows: rowsOf(file, of('new')) },
      ]
    : [{ isNew: false, key: 'all', rows: rowsOf(file, of(undefined)) }]
  const header = headerOf(given, name, at === 0)
  return {
    ...header,
    blockHidden: true,
    copyText: nowOf(file),
    gutterHidden: true,
    key: `file-${at}`,
    marks: [],
    numbers: [],
    runs: [],
    sides: sides.map((side, s) => ({
      ...side,
      banded: !given.noCopy && s === 0 && header.copyBeside,
      flatTop: header.flatTop && s === 0,
    })),
    splitHidden: false,
  }
}

/** The files a diff holds, or nothing for what is not a diff or reads as none. */
export const filesOf = (diff: boolean, text: string): readonly DiffFile[] =>
  diff ? parsePatch(text) : []

/** What a code block draws: a pane for each file of a diff, or one of plain code. */
export const panesOf = (
  given: PaneGiven,
  files: readonly DiffFile[],
  runs: readonly CodeRun[],
): readonly object[] =>
  files.length > 0 ? files.map((file, at) => filePane(given, file, at)) : [plainPane(given, runs)]
