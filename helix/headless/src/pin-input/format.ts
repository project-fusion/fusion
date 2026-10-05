/**
 * Where a `format` puts separators in a row of boxes: for each box, the text
 * drawn after it, or nothing. `#` and `*` stand for a box and anything else is
 * drawn, so `###-###` puts a dash after the third box. Web Awesome's OTP input
 * takes the same shape.
 */
export const separatorsAfter = (format: string, count: number): string[] => {
  const after = Array.from({ length: count }, () => '')
  let box = -1
  for (const character of format) {
    if (character === '#' || character === '*') {
      box += 1
      if (box >= count) {
        break
      }
    } else if (box >= 0 && box < count - 1) {
      after[box] += character
    }
  }
  return after
}
