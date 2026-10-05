/**
 * The line count `lines` asks for, as the declarations that clamp it, or
 * `undefined` where it is no whole number above zero.
 *
 * Written on the part inside the shadow root, so any count works with no rule
 * per number, and the server renders it with the rest of the template. The
 * box and the overflow it needs are written with the count, so a count that
 * is no count leaves the text as it was, with nothing cut off. A page's
 * `::part(text)` rule still wins over each of them.
 */
export const clampOf = (lines: number | undefined): string | undefined =>
  Number.isInteger(lines) && (lines as number) > 0
    ? `display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: ${lines}`
    : undefined
