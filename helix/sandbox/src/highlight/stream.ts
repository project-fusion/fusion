import type { StreamParser, StringStream } from '@codemirror/language'
import { type Highlighter, type Tag, tags } from '@lezer/highlight'

/*
 * A CodeMirror 5 mode, run over a snippet with no editor.
 *
 * **`StreamLanguage` is the usual way and cannot be used here.** It is
 * `@codemirror/language`, which imports `@codemirror/view` as it loads, and the
 * view reads the DOM at import: a server under Lit's DOM shim threw, and a
 * page with one highlighted block carried the editor. What a mode needs is a
 * line and a cursor over it, so this file is that, with the tag names
 * `StreamLanguage` maps a mode's token names to. The editor still uses
 * `StreamLanguage` with the same mode, so both read the same tokens.
 */

/** The names a mode written before Lezer returns, as `StreamLanguage` maps them. */
const LEGACY: Record<string, string> = {
  attribute: 'attributeName',
  builtin: 'variableName.standard',
  def: 'variableName.definition',
  error: 'invalid',
  header: 'heading',
  property: 'propertyName',
  qualifier: 'modifier',
  'string-2': 'string.special',
  tag: 'tagName',
  type: 'typeName',
  variable: 'variableName',
  'variable-2': 'variableName.special',
}

type Named = Tag | readonly Tag[] | ((tag: Tag) => Tag)

/**
 * The tags a token name stands for, read as `StreamLanguage` reads it: words
 * separated by spaces, each a tag followed by its modifiers, as in
 * `variableName.definition`, and a name in `table` before one in `tags`.
 */
const tagsOf = (token: string, table: Record<string, Tag | readonly Tag[]>): Tag[] => {
  const name = LEGACY[token]
  const known = (part: string): Named | undefined =>
    name === undefined
      ? (table[part] ?? (tags as Record<string, Named>)[part])
      : (tags as Record<string, Named>)[part]
  return (name ?? token).split(' ').flatMap((word) => {
    let found: Tag[] = []
    for (const part of word.split('.')) {
      const value = known(part)
      if (typeof value === 'function') {
        found = found.map(value)
      } else if (value !== undefined && found.length === 0) {
        found = Array.isArray(value) ? [...value] : [value as Tag]
      }
    }
    return found
  })
}

/** How many columns `string` takes up to `end`, with tabs `tabSize` wide. */
const columnOf = (string: string, end: number, tabSize: number): number => {
  let column = 0
  for (let at = 0; at < end; at += 1) {
    column = string.charCodeAt(at) === 9 ? column + tabSize - (column % tabSize) : column + 1
  }
  return column
}

/** One line, and the cursor a mode moves along it: the members of CodeMirror's `StringStream`. */
class LineStream {
  pos = 0
  start = 0

  constructor(
    readonly string: string,
    readonly tabSize: number,
    readonly indentUnit: number,
  ) {}

  backUp(count: number): void {
    this.pos -= count
  }

  column(): number {
    return columnOf(this.string, this.start, this.tabSize)
  }

  current(): string {
    return this.string.slice(this.start, this.pos)
  }

  eat(match: string | RegExp | ((char: string) => boolean)): string | undefined {
    const char = this.string.charAt(this.pos)
    const ok =
      typeof match === 'string'
        ? char === match
        : char !== '' && (match instanceof RegExp ? match.test(char) : match(char))
    if (ok) {
      this.pos += 1
      return char
    }
    return undefined
  }

  eatSpace(): boolean {
    const from = this.pos
    while (/[\s ]/.test(this.string.charAt(this.pos))) {
      this.pos += 1
    }
    return this.pos > from
  }

  eatWhile(match: string | RegExp | ((char: string) => boolean)): boolean {
    const from = this.pos
    while (this.eat(match) !== undefined) {
      // Each call has moved on by one.
    }
    return this.pos > from
  }

  eol(): boolean {
    return this.pos >= this.string.length
  }

  indentation(): number {
    return columnOf(this.string, this.string.search(/\S|$/), this.tabSize)
  }

  match(
    pattern: string | RegExp,
    consume = true,
    caseInsensitive = false,
  ): boolean | RegExpMatchArray | null {
    if (typeof pattern === 'string') {
      const fold = (text: string): string => (caseInsensitive ? text.toLowerCase() : text)
      const ahead = this.string.slice(this.pos, this.pos + pattern.length)
      if (fold(ahead) !== fold(pattern)) {
        return null
      }
      if (consume) {
        this.pos += pattern.length
      }
      return true
    }
    const found = this.string.slice(this.pos).match(pattern)
    if (found?.index !== 0) {
      return null
    }
    if (consume) {
      this.pos += found[0].length
    }
    return found
  }

  next(): string | undefined {
    return this.pos < this.string.length ? this.string.charAt(this.pos++) : undefined
  }

  peek(): string | undefined {
    return this.string.charAt(this.pos) || undefined
  }

  skipTo(char: string): boolean | undefined {
    const found = this.string.indexOf(char, this.pos)
    if (found > -1) {
      this.pos = found
      return true
    }
    return undefined
  }

  skipToEnd(): void {
    this.pos = this.string.length
  }

  sol(): boolean {
    return this.pos === 0
  }
}

/**
 * Highlights `code` with a mode, in the shape `highlightCode` from
 * `@lezer/highlight` uses: `put` for each run of text with its classes, and
 * `putBreak` between lines. Neighboring tokens with the same classes are one
 * run, as they are there.
 */
export const highlightStream = <State>(
  code: string,
  mode: StreamParser<State>,
  table: Record<string, Tag | readonly Tag[]>,
  highlighter: Highlighter,
  put: (text: string, classes: string) => void,
  putBreak: () => void,
): void => {
  const state = mode.startState?.(2) ?? (true as State)
  const classes = new Map<string, string>()
  const classOf = (token: string | null): string => {
    if (token === null) {
      return ''
    }
    let found = classes.get(token)
    if (found === undefined) {
      found = highlighter.style(tagsOf(token, table)) ?? ''
      classes.set(token, found)
    }
    return found
  }

  code.split('\n').forEach((line, index) => {
    if (index > 0) {
      putBreak()
    }
    if (line === '') {
      mode.blankLine?.(state, 2)
      return
    }
    const stream = new LineStream(line, 4, 2)
    let run = ''
    let from = 0
    while (!stream.eol()) {
      stream.start = stream.pos
      /* Asked again when it moved nothing, as `StreamLanguage` asks: a mode
         returns empty-handed when it has only changed its state, as sh does at
         a `$` inside a string. One that never moves leaves the line plain. */
      let token: string | null = null
      for (let attempt = 0; attempt < 10 && stream.pos === stream.start; attempt += 1) {
        token = mode.token(stream as unknown as StringStream, state)
      }
      if (stream.pos === stream.start) {
        stream.skipToEnd()
        token = null
      }
      const now = classOf(token)
      if (now !== run) {
        if (stream.start > from) {
          put(line.slice(from, stream.start), run)
        }
        from = stream.start
        run = now
      }
    }
    put(line.slice(from), run)
  })
}
