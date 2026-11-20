/*
 * The track list both tables deal out a column at a time, and the tracks a
 * table works out for the columns that set none, which the web elements and a
 * phone's machine both read.
 */
import { splitValues } from '../split-values/split-values.js'

/**
 * The first `wanted` tracks of a track list, one entry each, so every declared
 * column can take the one in its place.
 *
 * Split on the spaces between tracks and never inside a function, so
 * `minmax(0, 1fr)` stays one track. A `repeat()` with a count is that many
 * tracks, written out; an automatic one names no count and yields none. Line
 * names go with the track after them.
 *
 * Everything above the split is a fact about a grid track list rather than
 * about a value list, which is why only the split itself is shared.
 *
 * **A track the grid would refuse yields nothing either**, where the platform
 * can say. One invalid track makes the whole `grid-template-columns` invalid,
 * which a grid ignores in silence and draws as one column. That is the failure
 * that once had `columns` deprecated, a list of headings handed over as widths,
 * and dealt out a track at a time it costs the one column its width and no
 * more.
 */
export const tracksOf = (list: string, wanted: number): string[] => {
  const words = splitValues(list, ' ')
  const valid = (track: string): boolean =>
    typeof CSS === 'undefined' || CSS.supports('grid-template-columns', track)
  const tracks: string[] = []
  let names = ''
  for (const one of words) {
    if (tracks.length >= wanted) {
      break
    }
    if (one.startsWith('[')) {
      names += `${one} `
      continue
    }
    const repeat = /^repeat\(\s*(\d+)\s*,(.*)\)$/is.exec(one)
    if (repeat) {
      const inner = tracksOf(repeat[2] ?? '', wanted)
      for (let time = 0; time < Number(repeat[1]) && tracks.length < wanted; time += 1) {
        tracks.push(
          ...inner.map((track, index) => (time === 0 && index === 0 ? names + track : track)),
        )
      }
    } else if (!/^repeat\(/i.test(one)) {
      tracks.push(valid(names + one) ? names + one : '')
    }
    names = ''
  }
  return tracks.slice(0, wanted)
}

/**
 * The most characters a column may hold at its widest and still never wrap.
 *
 * Set from what tables actually hold: `--helix-color-background` is 24
 * characters and `@fusion.dev/helix-headless` is 26, and both are values a
 * reader copies whole. Above this a column is carrying a sentence, and
 * wrapping is the only thing it can do.
 */
const SHORT = 32

/**
 * The least room a column of sentences is given before the table scrolls.
 *
 * **Never `0`.** A zero floor lets a track vanish: measured at a 900 pixel
 * viewport, a `max-content` name column asking for 250 starved two columns of
 * sentences to exactly `0px` and wrapped their text to forty-eight lines. A
 * floor turns that into an overflow, which the table's own box scrolls.
 */
const FLOOR = '14ch'

/**
 * How many rows are read to size the columns.
 *
 * Enough for the text a table holds to show its shape, and a ceiling on the
 * work a render does for a table of thousands of rows.
 */
export const SAMPLE = 200

/**
 * Tracks for the columns that set nothing, from how many characters each holds
 * at its widest. `open` says which columns set nothing.
 *
 * **A column of sentences wraps and a column of values does not.** Every
 * column left at `minmax(max-content, 1fr)` asks for its longest cell on one
 * line, which is right for `eu-central-1` and wrong for a description: the
 * table grows as wide as its longest sentence and scrolls, on a phone and on
 * a desktop alike. So once any column holds more than `SHORT` characters,
 * the short columns keep `max-content`, and each long one wraps above a
 * `FLOOR`, taking a share of the room in proportion to its text.
 *
 * A table with no long column keeps the default, so a table of values lays
 * out as it always has, and the answer is empty. A column's `width` and a track
 * in `columns` are both statements an author made, and each wins over this.
 *
 * Characters stand in for width. They only have to rank columns against each
 * other, and a count needs no layout, so it reads the same before paint as
 * after.
 */
export const fittedTracks = (open: readonly boolean[], widths: readonly number[]): string[] => {
  const long = widths.filter((width, at) => open[at] && width > SHORT)
  if (long.length === 0) {
    return []
  }
  /* Measured against the narrowest long column, so the numbers stay small
     and readable in the inspector: a column with twice the text of its
     neighbor asks for twice the room. */
  const narrowest = Math.min(...long)
  return widths.map((width, at) => {
    if (!open[at]) {
      return ''
    }
    return width > SHORT
      ? `minmax(${FLOOR}, ${Number((width / narrowest).toFixed(2))}fr)`
      : 'max-content'
  })
}
