/**
 * The editing commands of the source pane, as functions from the source and
 * the selection to the change they make. Kept apart from the element so each
 * can be read and tested on text alone.
 */

/** A change to the source: `text` in place of what is between `from` and `to`, and the selection after it. */
export interface SourceEdit {
  /** Where the replaced text starts. */
  from: number
  /** The selection after the change, its start and its end. */
  selection: readonly [number, number]
  /** What replaces the text between `from` and `to`. Empty where the change only moves the caret. */
  text: string
  /** Where the replaced text ends. */
  to: number
}

/** Each bracket and quote, and the character that closes it. */
const PAIRS: Readonly<Record<string, string>> = {
  "'": "'",
  '"': '"',
  '(': ')',
  '[': ']',
  '{': '}',
  '`': '`',
}

/** The brackets that open, each at the index of the one that closes it in `CLOSERS`. */
const OPENERS = '([{'
const CLOSERS = ')]}'

/** What may follow the caret for a typed bracket or quote to be closed. */
const BEFORE = /^(?:$|[\s)\]}>;:,"'`])/

/** The comment markers of each syntax: a line marker, or the two around a block. */
const COMMENTS = {
  css: ['/*', '*/'],
  html: ['<!--', '-->'],
  js: ['//'],
} as const

/** A syntax the comment command knows. */
export type CommentSyntax = keyof typeof COMMENTS

/**
 * The syntax of a pane, read from its `name`: `html`, `css` and `js`, or the
 * extension of a file name such as `utils.js`. `ts`, `jsx`, `tsx`, `mjs` and
 * `cjs` are `js`. Anything else has no comments.
 */
export const syntaxOf = (name: string): CommentSyntax | undefined => {
  const extension = name.slice(name.lastIndexOf('.') + 1)
  if (extension === 'css' || extension === 'html') {
    return extension
  }
  return /^[cm]?[jt]sx?$/.test(extension) ? 'js' : undefined
}

/** The start of the first line and the end of the last line a selection touches. */
const linesOf = (source: string, from: number, to: number): [number, number] => {
  const start = source.lastIndexOf('\n', from - 1) + 1
  /* A selection that ends at the start of a line does not take that line. */
  const last = to > from && source[to - 1] === '\n' ? to - 1 : to
  const end = source.indexOf('\n', last)
  return [start, end < 0 ? source.length : end]
}

/** Keeps a position inside the bounds. */
const clamp = (at: number, low: number, high: number): number => Math.min(high, Math.max(low, at))

/**
 * Rewrites the lines a selection touches, one line at a time, and keeps the
 * selection on the text it held. `undefined` where nothing changes.
 */
const eachLine = (
  source: string,
  from: number,
  to: number,
  change: (line: string) => string,
): SourceEdit | undefined => {
  const [start, end] = linesOf(source, from, to)
  const before = source.slice(start, end).split('\n')
  const after = before.map(change)
  const text = after.join('\n')
  if (text === source.slice(start, end)) {
    return undefined
  }
  /* A selection from the start of a line keeps the line's new indentation in
     it, and a caret moves with the text it was in. */
  const moved = from + (after[0] ?? '').length - (before[0] ?? '').length
  const head = from === start && from !== to ? from : clamp(moved, start, start + text.length)
  const tail = from === to ? head : Math.max(head, to + text.length - (end - start))
  return { from: start, selection: [head, tail], text, to: end }
}

/** Indents each line a selection touches by `unit`, leaving blank lines as they are. */
export const indentLines = (
  source: string,
  from: number,
  to: number,
  unit = '  ',
): SourceEdit | undefined =>
  eachLine(source, from, to, (line) => (line.trim() === '' ? line : `${unit}${line}`))

/** Takes one level of indentation, two spaces or a tab, off each line a selection touches. */
export const outdentLines = (source: string, from: number, to: number): SourceEdit | undefined =>
  eachLine(source, from, to, (line) => line.replace(/^(?: {1,2}|\t)/, ''))

/** Escapes a comment marker for a regular expression. */
const literal = (text: string): string => text.replace(/[*/]/g, '\\$&')

/**
 * Comments out the lines a selection touches, or uncomments them where they
 * already are a comment.
 *
 * `js` comments each line with `//` at the indentation the lines share. `css`
 * and `html`, which have no line comment, put one block comment around the
 * text of the lines.
 */
export const toggleComment = (
  source: string,
  from: number,
  to: number,
  syntax: CommentSyntax,
): SourceEdit | undefined => {
  const [open, close] = COMMENTS[syntax] as readonly [string, string?]
  const [start, end] = linesOf(source, from, to)
  const block = source.slice(start, end)
  if (close === undefined) {
    const filled = block.split('\n').filter((line) => line.trim() !== '')
    const on = filled.length > 0 && filled.every((line) => line.trimStart().startsWith(open))
    const indent = Math.min(...filled.map((line) => line.length - line.trimStart().length))
    const marker = new RegExp(`^(\\s*)${literal(open)} ?`)
    return eachLine(source, from, to, (line) => {
      if (line.trim() === '') {
        return line
      }
      return on
        ? line.replace(marker, '$1')
        : `${line.slice(0, indent)}${open} ${line.slice(indent)}`
    })
  }
  const lead = block.length - block.trimStart().length
  const body = block.trim()
  const trail = block.slice(lead + body.length)
  const commented =
    body.length >= open.length + close.length && body.startsWith(open) && body.endsWith(close)
  const inner = commented
    ? body
        .slice(open.length, body.length - close.length)
        .replace(/^ /, '')
        .replace(/ $/, '')
    : `${open} ${body} ${close}`
  const text = `${block.slice(0, lead)}${inner}${trail}`
  /* What moves the text after the opening marker: the marker and its space,
     taken off or put on. */
  const shift = commented ? -(open.length + (body[open.length] === ' ' ? 1 : 0)) : open.length + 1
  const head = clamp(from >= start + lead ? from + shift : from, start, start + text.length)
  const tail = from === to ? head : Math.max(head, to + text.length - block.length)
  return { from: start, selection: [head, tail], text, to: end }
}

/**
 * What typing `key` does where brackets close: a bracket or quote typed with
 * text selected goes around the text, one typed before a space or the end of
 * the line closes as well, and a closing one typed before the same character
 * steps over it. `undefined` where the key types as usual.
 *
 * A quote after a letter or a digit is an apostrophe and does not close.
 */
export const closeBracket = (
  source: string,
  from: number,
  to: number,
  key: string,
): SourceEdit | undefined => {
  const closer = PAIRS[key]
  const next = source.slice(to)
  if (from === to && (CLOSERS.includes(key) || closer === key) && next.startsWith(key)) {
    return { from, selection: [from + 1, from + 1], text: '', to }
  }
  if (closer === undefined) {
    return undefined
  }
  if (from !== to) {
    return {
      from,
      selection: [from + 1, to + 1],
      text: `${key}${source.slice(from, to)}${closer}`,
      to,
    }
  }
  if (!BEFORE.test(next) || (closer === key && /[\w'"`]$/.test(source.slice(0, from)))) {
    return undefined
  }
  return { from, selection: [from + 1, from + 1], text: `${key}${closer}`, to }
}

/**
 * What Backspace does between a bracket or quote and the character that
 * closes it, where brackets close: it deletes both.
 */
export const deletePair = (source: string, from: number, to: number): SourceEdit | undefined => {
  const opener = source[from - 1]
  if (from !== to || opener === undefined || PAIRS[opener] !== source[from]) {
    return undefined
  }
  return { from: from - 1, selection: [from - 1, from - 1], text: '', to: from + 1 }
}

/** A bracket beside the caret, and the bracket that pairs with it where there is one. */
export interface BracketMatch {
  /** Where the bracket beside the caret is. */
  at: number
  /** Where the bracket that pairs with it is, or `undefined` where none does. */
  match: number | undefined
}

/** How far the search for a pair goes, in characters. */
const REACH = 10_000

/**
 * The bracket beside the caret and its pair: the one before the caret first,
 * then the one after it. `skip` leaves out positions inside strings and
 * comments, where a highlighter has said which those are.
 */
export const matchBracket = (
  source: string,
  at: number,
  skip: (index: number) => boolean = () => false,
): BracketMatch | undefined => {
  for (const index of [at - 1, at]) {
    const bracket = source[index]
    if (bracket === undefined || skip(index)) {
      continue
    }
    const opens = OPENERS.indexOf(bracket)
    const closes = CLOSERS.indexOf(bracket)
    if (opens < 0 && closes < 0) {
      continue
    }
    const step = opens < 0 ? -1 : 1
    const other = opens < 0 ? OPENERS[closes] : CLOSERS[opens]
    let depth = 0
    for (
      let look = index;
      look >= 0 && look < source.length && Math.abs(look - index) < REACH;
      look += step
    ) {
      if (skip(look)) {
        continue
      }
      if (source[look] === bracket) {
        depth += 1
      } else if (source[look] === other) {
        depth -= 1
        if (depth === 0) {
          return { at: index, match: look }
        }
      }
    }
    return { at: index, match: undefined }
  }
  return undefined
}

/** The completions for the word before the caret, and where that word starts. */
export interface Completions {
  /** Where the word being completed starts. */
  from: number
  /** The words that complete it, in alphabetical order. */
  words: string[]
}

/** How many completions are offered at once. */
const OFFERED = 50

/** A word as completion reads one: letters, digits, `_`, `$` and `-`, with at least one letter. */
const WORDS = /[\w$-]*[A-Za-z_$][\w$-]*/g

/**
 * The completions for the word before the caret: every longer word in the
 * source or in `extra` that starts with it, whatever its case. `undefined`
 * where the caret follows no word or nothing completes it.
 */
export const suggest = (
  source: string,
  at: number,
  extra: readonly string[] = [],
): Completions | undefined => {
  const word = /[\w$-]*$/.exec(source.slice(Math.max(0, at - 100), at))?.[0] ?? ''
  if (!/[A-Za-z_$]/.test(word)) {
    return undefined
  }
  const start = word.toLowerCase()
  const pool = new Set([...extra, ...(source.match(WORDS) ?? [])])
  const words = [...pool]
    .filter((each) => each.length > word.length && each.toLowerCase().startsWith(start))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, OFFERED)
  return words.length > 0 ? { from: at - word.length, words } : undefined
}

/** The parts of a custom elements manifest that `manifestWords` reads. */
export interface ManifestLike {
  modules?: readonly {
    declarations?: readonly {
      attributes?: readonly { name: string }[]
      cssProperties?: readonly { name: string }[]
      tagName?: string
    }[]
  }[]
}

/**
 * The tag names, attribute names and CSS custom properties a custom elements
 * manifest lists, for a source pane's `completions`. Each name is listed once.
 */
export const manifestWords = (manifest: ManifestLike): string[] => {
  const names = new Set<string>()
  for (const module of manifest.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      if (declaration.tagName) {
        names.add(declaration.tagName)
      }
      for (const { name } of [
        ...(declaration.attributes ?? []),
        ...(declaration.cssProperties ?? []),
      ]) {
        names.add(name)
      }
    }
  }
  return [...names]
}
