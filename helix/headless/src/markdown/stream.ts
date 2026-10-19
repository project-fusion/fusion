import { type MarkdownBlock, parseBlocks } from './blocks.js'

/**
 * The part of a reply that can be drawn now, and the part held back until the
 * next characters decide what it is.
 *
 * Only the end of the text is held, and only for as long as it is ambiguous:
 *
 * - a last line that is only a marker so far (`#`, `-`, `1.`, three backticks,
 *   `>` or `> [!NO`), until it is clear what block it starts. A fence's opening line
 *   is held whole, since its language arrives with it;
 * - a line starting with a pipe after a line that did not, with whatever has
 *   arrived of the next line, until that next line shows whether the first was
 *   a table's header.
 *
 * Holding costs a few characters of latency and nothing else, so it is safe
 * anywhere, a code block included: what is held is drawn, unchanged, a moment
 * later.
 */
export const visibleText = (text: string): string => {
  const breakAt = text.lastIndexOf('\n')
  const partial = text.slice(breakAt + 1)
  const complete = breakAt < 0 ? '' : text.slice(0, breakAt)
  const bare = partial.replace(/^[ \t>]*/, '')
  /* A marker so far, or the opening line of a fence. */
  if (
    /^(?:#{1,6}|[-*_+](?:[ \t]*[-*_])*|\d{1,9}[.)]?|`+|~+)$/.test(bare) ||
    /^(?:`{3,}|~{3,})/.test(bare) ||
    (/^[ \t]*>/.test(partial) && /^(?:\[(?:!(?:[A-Za-z]{0,9}\]?)?)?)?$/.test(bare))
  ) {
    return breakAt < 0 ? '' : `${complete}\n`
  }
  const lines = breakAt < 0 ? [] : complete.split('\n')
  const last = lines.at(-1)
  const piped = (line: string | undefined): boolean => line !== undefined && /^[ \t>]*\|/.test(line)
  /* The first pipe line, which may be a table's header. */
  if (piped(partial) && !piped(last)) {
    return breakAt < 0 ? '' : `${complete}\n`
  }
  /* That line complete, and the next arriving as what may be a delimiter row. */
  if (piped(last) && !piped(lines.at(-2)) && /^[ \t>]*[|:\- \t]*$/.test(partial)) {
    return lines.length > 1 ? `${lines.slice(0, -1).join('\n')}\n` : ''
  }
  return text
}

/** What one read of a stream gives: its blocks, and how many of them are final. */
export interface MarkdownRead {
  blocks: MarkdownBlock[]
  /** The leading blocks no later text can change. */
  closed: number
}

/**
 * Reads a growing text into blocks, reparsing only from the block that is
 * still open.
 *
 * A top-level block is final once another has started after it, since the line
 * that started the next one cannot be read differently by anything after it.
 * So each read keeps those, and parses again from the first line of the last
 * one. A text that does not extend the last one starts over.
 */
export class MarkdownStream {
  private text = ''
  private blocks: MarkdownBlock[] = []
  private starts: number[] = []
  private lines: string[] = []

  /**
   * Reads the text so far. With `final`, the whole text is read, the held end
   * included, as the finished reply.
   */
  read(text: string, final: boolean): MarkdownRead {
    const drawn = final ? text : visibleText(text)
    if (!drawn.startsWith(this.text)) {
      this.blocks = []
      this.starts = []
      this.lines = []
    }
    this.text = drawn
    const lines = drawn === '' ? [] : drawn.replace(/\r\n?/g, '\n').split('\n')
    /* The trailing empty string a final line break leaves is not a line. */
    if (lines.at(-1) === '') {
      lines.pop()
    }
    const keep = Math.max(0, this.blocks.length - 1)
    const from = this.starts[keep] ?? 0
    /* Reuse only where the kept blocks' lines are the same lines. */
    const same = this.lines.length >= from && lines.length >= from
    const restart = same ? from : 0
    const kept = same ? keep : 0
    const read = parseBlocks(lines.slice(restart))
    this.blocks = [...this.blocks.slice(0, kept), ...read.blocks]
    this.starts = [...this.starts.slice(0, kept), ...read.starts.map((start) => start + restart)]
    this.lines = lines
    return {
      blocks: this.blocks,
      closed: final ? this.blocks.length : Math.max(0, this.blocks.length - 1),
    }
  }

  /** Forgets everything read, as a new reply does. */
  reset(): void {
    this.text = ''
    this.blocks = []
    this.starts = []
    this.lines = []
  }
}
