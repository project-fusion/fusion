/*
 * Which columns a data table leaves out at the width it is drawn at, as
 * arithmetic with no element in it, which the web element and a phone's
 * machine both read.
 */

/** The font sizes a length in `em` and `rem` is read against, in pixels. */
export interface FontSizes {
  /** The table's own font size, which `em` is a multiple of. */
  em: number
  /** The document's font size, which `rem` is a multiple of. */
  rem: number
}

/**
 * A length in pixels: `640px`, `40rem`, `40em`, or a bare number, which is
 * pixels. Anything else, a percentage or a viewport unit among them, is no
 * length here and is `undefined`, being a share of something other than the
 * table.
 */
export const pixelsOf = (length: string, sizes: FontSizes): number | undefined => {
  const match = /^\s*(\d+(?:\.\d+)?|\.\d+)\s*(px|rem|em)?\s*$/i.exec(length)
  if (!match) {
    return undefined
  }
  const amount = Number(match[1])
  const unit = (match[2] ?? 'px').toLowerCase()
  return unit === 'px' ? amount : amount * (unit === 'rem' ? sizes.rem : sizes.em)
}

/**
 * The columns left out of a table `inlineSize` pixels wide: each whose minimum
 * table width is more than that.
 *
 * **One column always stays**, the first in the list, where every column would
 * go: a table with no columns draws its rows as nothing, and a reader cannot
 * tell it from an empty one. A minimum that is no length leaves its column in.
 */
export const droppedAt = <Column>(
  inlineSize: number,
  columns: readonly { column: Column; minimum: string }[],
  sizes: FontSizes,
): Set<Column> => {
  const dropped = new Set<Column>()
  for (const { column, minimum } of columns) {
    const pixels = minimum === '' ? undefined : pixelsOf(minimum, sizes)
    if (pixels !== undefined && inlineSize < pixels) {
      dropped.add(column)
    }
  }
  const first = columns[0]
  if (first && dropped.size === columns.length) {
    dropped.delete(first.column)
  }
  return dropped
}
