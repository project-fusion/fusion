/** What a box adds around its lines, and how tall one line is, in pixels. */
export interface LineMetrics {
  /** Padding and border above and below the lines. */
  readonly around: number
  /** The height of one line. */
  readonly line: number
}

/**
 * The height a growing field takes: what its text needs, held to `maxRows`
 * lines where that is a positive number. The second answer says whether the
 * text is taller than the cap, so the field scrolls.
 */
export const grownHeight = (
  needed: number,
  maxRows: number | undefined,
  metrics: LineMetrics,
): { height: number; scrolls: boolean } => {
  if (maxRows === undefined || !(maxRows > 0) || metrics.line <= 0) {
    return { height: needed, scrolls: false }
  }
  const cap = Math.ceil(maxRows * metrics.line + metrics.around)
  return needed > cap ? { height: cap, scrolls: true } : { height: needed, scrolls: false }
}

/**
 * Reads a box's line height and what it adds around its lines from its
 * computed style. A `normal` line height counts as 1.2 times the font size,
 * which is what browsers draw it as for most fonts.
 */
export const lineMetrics = (style: CSSStyleDeclaration): LineMetrics => {
  const px = (value: string): number => Number.parseFloat(value) || 0
  const line =
    style.lineHeight === 'normal' || style.lineHeight === ''
      ? px(style.fontSize) * 1.2
      : px(style.lineHeight)
  const around =
    style.boxSizing === 'border-box'
      ? px(style.paddingBlockStart) +
        px(style.paddingBlockEnd) +
        px(style.borderBlockStartWidth) +
        px(style.borderBlockEndWidth)
      : 0
  return { around, line }
}
