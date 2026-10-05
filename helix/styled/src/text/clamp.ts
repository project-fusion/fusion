/**
 * The line count `lines` asks for, as the declaration that clamps it, or
 * `undefined` where it is no whole number above zero.
 *
 * Written on the part inside the shadow root, so any count works with no rule
 * per number, and the server renders it with the rest of the template.
 */
export const clampOf = (lines: number | undefined): string | undefined =>
  Number.isInteger(lines) && (lines as number) > 0 ? `-webkit-line-clamp: ${lines}` : undefined
