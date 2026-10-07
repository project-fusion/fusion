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

/**
 * The runs of lines a list of numbers and ranges names, such as `2, 4-6`, as
 * `[first, last]` pairs counted from 1, in order and merged where they touch.
 * Anything that is not a whole number or a range of them is passed over, and
 * a range written backward is read forward.
 */
export const lineRuns = (list: string): Array<[number, number]> => {
  const runs: Array<[number, number]> = []
  for (const piece of list.split(/[\s,]+/)) {
    const range = /^(\d+)(?:-(\d+))?$/.exec(piece)
    if (!range) {
      continue
    }
    const a = Number(range[1])
    const b = Number(range[2] ?? range[1])
    if (a < 1 || b < 1) {
      continue
    }
    runs.push([Math.min(a, b), Math.max(a, b)])
  }
  runs.sort((x, y) => x[0] - y[0])
  const merged: Array<[number, number]> = []
  for (const run of runs) {
    const last = merged.at(-1)
    if (last && run[0] <= last[1] + 1) {
      last[1] = Math.max(last[1], run[1])
    } else {
      merged.push([run[0], run[1]])
    }
  }
  return merged
}

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
