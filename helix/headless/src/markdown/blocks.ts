/**
 * Markdown's blocks, read line by line from text that may still be arriving.
 *
 * **Written for a stream, so it decides nothing it may have to take back.** A
 * block that a later line closed is final, and a reader of the result can keep
 * what it drew for it. Two CommonMark constructs change a block after the
 * fact, and neither is read: a setext heading (`Title` over `===`), which turns
 * a paragraph into a heading when its second line arrives, and an indented code
 * block, which a list's continuation lines are easily mistaken for. `---` under
 * a paragraph is a rule, and four spaces of indent are text. Reference links
 * are not read either, since a definition at the end would relink a paragraph
 * drawn long before it.
 *
 * Raw HTML is text. A model's reply is not trusted markup.
 */

/** How a table column aligns its cells. */
export type MarkdownAlign = 'center' | 'end' | 'start' | undefined

/** The five kinds of GitHub alert. */
export type MarkdownAlertKind = 'caution' | 'important' | 'note' | 'tip' | 'warning'

/** One item of a list, and whether it is a task and done. */
export interface MarkdownItem {
  /** Present for a task item: `true` where it is checked. */
  checked?: boolean
  children: MarkdownBlock[]
}

/** A block of a Markdown document. */
export type MarkdownBlock =
  | { kind: 'code'; info: string; open: boolean; text: string }
  | { kind: 'heading'; level: number; text: string }
  | { items: MarkdownItem[]; kind: 'list'; ordered: boolean; start: number }
  | { kind: 'paragraph'; text: string }
  | { alert?: MarkdownAlertKind; children: MarkdownBlock[]; kind: 'quote' }
  | { kind: 'rule' }
  | { align: MarkdownAlign[]; head: string[]; kind: 'table'; rows: string[][] }

/** The blocks of some lines, and the line each top-level block starts on. */
export interface MarkdownBlocks {
  blocks: MarkdownBlock[]
  starts: number[]
}

const BLANK = /^[ \t]*$/
const FENCE = /^( {0,3})(`{3,}|~{3,})(.*)$/
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/
const RULE = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/
const QUOTE = /^ {0,3}> ?/
const MARKER = /^( {0,3})([-+*]|(\d{1,9})([.)]))(?=[ \t]|$)([ \t]*)(.*)$/
const DELIMITER = /^:?-+:?$/
const ALERT = /^\[!(caution|important|note|tip|warning)\][ \t]*$/i
const TASK = /^\[([ xX])\](?:[ \t]+|$)/

const blank = (line: string): boolean => BLANK.test(line)

/** The columns of a line's leading whitespace, a tab reaching the next stop of four. */
export const indentOf = (line: string): number => {
  let columns = 0
  for (const character of line) {
    if (character === ' ') {
      columns += 1
    } else if (character === '\t') {
      columns += 4 - (columns % 4)
    } else {
      break
    }
  }
  return columns
}

/** The line with up to `columns` of its leading whitespace taken off. */
const stripIndent = (line: string, columns: number): string => {
  let taken = 0
  let at = 0
  while (at < line.length && taken < columns) {
    const character = line[at]
    if (character === ' ') {
      taken += 1
    } else if (character === '\t') {
      const width = 4 - (taken % 4)
      if (taken + width > columns) {
        /* A tab wider than what is left keeps the rest of its width as spaces. */
        return ' '.repeat(taken + width - columns) + line.slice(at + 1)
      }
      taken += width
    } else {
      break
    }
    at += 1
  }
  return line.slice(at)
}

/** A list item's marker, and where the item's content starts. */
interface Marker {
  /** The bullet character, or the ordered delimiter. */
  bullet: string
  /** The column the item's content is indented to. */
  content: number
  number: number | undefined
  rest: string
}

const markerOf = (line: string): Marker | undefined => {
  const match = MARKER.exec(line)
  if (!match) {
    return undefined
  }
  const [, lead = '', marker = '', digits, delimiter, gap = '', rest = ''] = match
  const width = lead.length + marker.length
  const spaces = indentOf(`${' '.repeat(width)}${gap}`) - width
  /* An empty item, or one whose text starts five or more spaces out, takes
     one space after the marker as its indent, as CommonMark has it. */
  const content = rest === '' || spaces > 4 ? width + 1 : width + spaces
  return {
    bullet: delimiter ?? marker,
    content,
    number: digits === undefined ? undefined : Number(digits),
    rest: spaces > 4 ? `${' '.repeat(spaces - 1)}${rest}` : rest,
  }
}

/** A table row's cells: split at pipes a backslash does not escape, the outer pipes dropped. */
export const cellsOf = (line: string): string[] => {
  let row = line.trim()
  if (row.startsWith('|')) {
    row = row.slice(1)
  }
  if (row.endsWith('|') && !row.endsWith('\\|')) {
    row = row.slice(0, -1)
  }
  const cells: string[] = []
  let cell = ''
  for (let at = 0; at < row.length; at += 1) {
    const character = row[at]
    if (character === '\\' && row[at + 1] === '|') {
      cell += '|'
      at += 1
    } else if (character === '|') {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += character
    }
  }
  cells.push(cell.trim())
  return cells
}

/** The alignments a delimiter row gives, or nothing where the line is not one for `count` columns. */
const delimiterOf = (line: string | undefined, count: number): MarkdownAlign[] | undefined => {
  if (line === undefined || !line.includes('-') || indentOf(line) > 3) {
    return undefined
  }
  const cells = cellsOf(line)
  if (cells.length !== count || !cells.every((cell) => DELIMITER.test(cell))) {
    return undefined
  }
  return cells.map((cell) => {
    const left = cell.startsWith(':')
    const right = cell.endsWith(':')
    return left && right ? 'center' : right ? 'end' : left ? 'start' : undefined
  })
}

/** Whether a line and the one after it start a table. */
const startsTable = (line: string, next: string | undefined): boolean =>
  line.includes('|') && indentOf(line) < 4 && delimiterOf(next, cellsOf(line).length) !== undefined

/**
 * Whether a line starts a block, and so ends a paragraph above it. A list
 * item interrupts a paragraph only when it has text, and an ordered one only
 * when it counts from 1.
 */
const interrupts = (line: string): boolean => {
  if (indentOf(line) > 3) {
    return false
  }
  if (FENCE.test(line) || HEADING.test(line) || RULE.test(line) || QUOTE.test(line)) {
    return true
  }
  const marker = markerOf(line)
  return marker !== undefined && marker.rest.trim() !== '' && (marker.number ?? 1) === 1
}

/** Whether the deepest last block of some blocks is a paragraph, which a lazy line continues. */
const endsInParagraph = (blocks: MarkdownBlock[]): boolean => {
  const last = blocks.at(-1)
  if (last?.kind === 'paragraph') {
    return true
  }
  if (last?.kind === 'quote') {
    return endsInParagraph(last.children)
  }
  if (last?.kind === 'list') {
    return endsInParagraph(last.items.at(-1)?.children ?? [])
  }
  return false
}

/** A line continues a paragraph lazily where it starts no block of its own. */
const lazy = (inner: string[], line: string, next: string | undefined): boolean =>
  !blank(line) &&
  !interrupts(line) &&
  !startsTable(line, next) &&
  inner.length > 0 &&
  !blank(inner.at(-1) ?? '') &&
  endsInParagraph(parseBlocks(inner).blocks)

/** Reads the lines of a fence from `at`, returning the block and the line after it. */
const readFence = (lines: string[], at: number): [MarkdownBlock, number] => {
  const match = FENCE.exec(lines[at] ?? '') as RegExpExecArray
  const indent = (match[1] ?? '').length
  const fence = match[2] ?? '```'
  const info = (match[3] ?? '').trim()
  const closing = new RegExp(`^ {0,3}${fence[0] === '`' ? '`' : '~'}{${fence.length},}[ \\t]*$`)
  const body: string[] = []
  let line = at + 1
  let open = true
  while (line < lines.length) {
    const text = lines[line] ?? ''
    line += 1
    if (closing.test(text)) {
      open = false
      break
    }
    body.push(stripIndent(text, indent))
  }
  return [{ info, kind: 'code', open, text: body.join('\n') }, line]
}

/** Reads a block quote from `at`, with its lazy lines. */
const readQuote = (lines: string[], at: number): [MarkdownBlock, number] => {
  const inner: string[] = []
  let line = at
  while (line < lines.length) {
    const text = lines[line] ?? ''
    const marker = QUOTE.exec(text)
    if (marker && indentOf(text) < 4) {
      inner.push(text.slice(marker[0].length))
    } else if (lazy(inner, text, lines[line + 1])) {
      inner.push(text)
    } else {
      break
    }
    line += 1
  }
  const children = parseBlocks(inner).blocks
  const first = children[0]
  const firstLine = first?.kind === 'paragraph' ? (first.text.split('\n')[0] ?? '') : ''
  const alert = ALERT.exec(firstLine.trim())
  if (alert && first?.kind === 'paragraph') {
    const rest = first.text.split('\n').slice(1).join('\n')
    return [
      {
        alert: (alert[1] ?? 'note').toLowerCase() as MarkdownAlertKind,
        children:
          rest.trim() === ''
            ? children.slice(1)
            : [{ kind: 'paragraph', text: rest }, ...children.slice(1)],
        kind: 'quote',
      },
      line,
    ]
  }
  return [{ children, kind: 'quote' }, line]
}

/** Reads a list from `at`: its items, the blank lines between them, and each item's own lines. */
const readList = (lines: string[], at: number): [MarkdownBlock, number] => {
  const first = markerOf(lines[at] ?? '') as Marker
  const ordered = first.number !== undefined
  const items: MarkdownItem[] = []
  let line = at
  while (line < lines.length) {
    const marker = markerOf(lines[line] ?? '')
    if (!marker || marker.bullet !== first.bullet || indentOf(lines[line] ?? '') > 3) {
      break
    }
    const inner = [marker.rest]
    line += 1
    while (line < lines.length) {
      const text = lines[line] ?? ''
      if (blank(text)) {
        let ahead = line
        while (ahead < lines.length && blank(lines[ahead] ?? '')) {
          ahead += 1
        }
        /* A blank line belongs to the item when the item goes on after it. */
        if (ahead < lines.length && indentOf(lines[ahead] ?? '') >= marker.content) {
          inner.push('')
          line += 1
          continue
        }
        break
      }
      if (indentOf(text) >= marker.content) {
        inner.push(stripIndent(text, marker.content))
      } else if (!markerOf(text) && lazy(inner, text, lines[line + 1])) {
        inner.push(text)
      } else {
        break
      }
      line += 1
    }
    const task = TASK.exec(inner[0] ?? '')
    if (task) {
      inner[0] = (inner[0] ?? '').slice(task[0].length)
    }
    const item: MarkdownItem = { children: parseBlocks(inner).blocks }
    if (task) {
      item.checked = task[1] !== ' '
    }
    items.push(item)
    /* Blank lines between two items of the same list. */
    let ahead = line
    while (ahead < lines.length && blank(lines[ahead] ?? '')) {
      ahead += 1
    }
    const next = markerOf(lines[ahead] ?? '')
    if (ahead === line || !next || next.bullet !== first.bullet) {
      if (ahead === line) {
        continue
      }
      break
    }
    line = ahead
  }
  return [{ items, kind: 'list', ordered, start: first.number ?? 1 }, line]
}

/** Reads a table from `at`, its header and delimiter rows already known to be there. */
const readTable = (lines: string[], at: number): [MarkdownBlock, number] => {
  const head = cellsOf(lines[at] ?? '')
  const align = delimiterOf(lines[at + 1], head.length) ?? []
  const rows: string[][] = []
  let line = at + 2
  while (line < lines.length) {
    const text = lines[line] ?? ''
    if (blank(text) || interrupts(text)) {
      break
    }
    const cells = cellsOf(text)
    rows.push(head.map((_, column) => cells[column] ?? ''))
    line += 1
  }
  return [{ align, head, kind: 'table', rows }, line]
}

/** Reads a paragraph from `at`: every line up to a blank one or one that starts a block. */
const readParagraph = (lines: string[], at: number): [MarkdownBlock, number] => {
  const body = [(lines[at] ?? '').replace(/^[ \t]+/, '')]
  let line = at + 1
  while (line < lines.length) {
    const text = lines[line] ?? ''
    if (blank(text) || interrupts(text) || startsTable(text, lines[line + 1])) {
      break
    }
    body.push(text.replace(/^[ \t]+/, ''))
    line += 1
  }
  return [{ kind: 'paragraph', text: body.join('\n').replace(/[ \t]+$/, '') }, line]
}

/** Every block of some lines, in order, and the line each starts on. */
export const parseBlocks = (lines: string[]): MarkdownBlocks => {
  const blocks: MarkdownBlock[] = []
  const starts: number[] = []
  let line = 0
  while (line < lines.length) {
    const text = lines[line] ?? ''
    if (blank(text)) {
      line += 1
      continue
    }
    starts.push(line)
    let read: [MarkdownBlock, number]
    if (indentOf(text) > 3) {
      read = readParagraph(lines, line)
    } else if (
      FENCE.test(text) &&
      !(text.trimStart().startsWith('`') && /`/.test(FENCE.exec(text)?.[3] ?? ''))
    ) {
      read = readFence(lines, line)
    } else if (HEADING.test(text)) {
      const match = HEADING.exec(text) as RegExpExecArray
      read = [
        { kind: 'heading', level: (match[1] ?? '#').length, text: (match[2] ?? '').trim() },
        line + 1,
      ]
    } else if (RULE.test(text)) {
      read = [{ kind: 'rule' }, line + 1]
    } else if (QUOTE.test(text)) {
      read = readQuote(lines, line)
    } else if (markerOf(text)) {
      read = readList(lines, line)
    } else if (startsTable(text, lines[line + 1])) {
      read = readTable(lines, line)
    } else {
      read = readParagraph(lines, line)
    }
    blocks.push(read[0])
    line = read[1]
  }
  return { blocks, starts }
}
