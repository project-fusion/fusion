/**
 * How many lines a block of code shows.
 *
 * A final line break ends the last line rather than starting another, which is
 * how an editor counts a file and how the block draws one: `a\nb\n` is two
 * lines. A Windows line break is one break. Empty code has no lines.
 */
export const lineCount = (code: string): number =>
  code === '' ? 0 : code.replace(/\r?\n$/, '').split(/\r?\n/).length

/**
 * The numbers for a gutter of `count` lines, one to a line, as the text a
 * `<pre>` draws beside the code. The stylesheet aligns them to the end.
 */
export const gutterNumbers = (count: number): string =>
  Array.from({ length: count }, (_, index) => String(index + 1)).join('\n')

export { lineRuns } from '@fusion.dev/helix-core/log'

/**
 * Where each line of `text` starts and ends, as character offsets, the line
 * break left out. A final line break ends the last line, as `lineCount` reads it.
 */
export const lineSpans = (text: string): Array<[number, number]> => {
  const spans: Array<[number, number]> = []
  const body = text.replace(/\r?\n$/, '')
  if (body === '' && text === '') {
    return spans
  }
  let start = 0
  for (const match of body.matchAll(/\r?\n/g)) {
    spans.push([start, match.index])
    start = match.index + match[0].length
  }
  spans.push([start, body.length])
  return spans
}
