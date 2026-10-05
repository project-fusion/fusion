/** The quotation marks a reader might type, in the languages a `<q>` sets. */
const MARKS = new Set(['"', "'", '“', '”', '‘', '’', '„', '«', '»', '‹', '›', '「', '」'])

/**
 * Whether quoted text starts or ends with a quotation mark someone typed.
 *
 * A Quote renders a `<q>`, which sets the marks itself, so typed ones show
 * twice: “"like this"”. Only the ends are read, since a mark inside the text
 * is a quotation within it, which a nested Quote should set.
 */
export const typedMarks = (text: string): boolean => {
  const trimmed = text.trim()
  return trimmed !== '' && (MARKS.has(trimmed[0] ?? '') || MARKS.has(trimmed.at(-1) ?? ''))
}
