import { Fragment, type ReactNode } from 'react'

/**
 * A span in backticks, as Markdown writes inline code. It can run across a line
 * break, as a doc comment wraps it, and the break reads as a space.
 */
const CODE = /`([^`]+)`/

/** Where Markdown opens or closes bold, as doc comments write it. */
const BOLD = '**'

/**
 * A run of hyphens that opens a word, with the character after it: the `--` of
 * a custom property, the `-` of `-apple-system`, the `-webkit-` after `::`.
 * Not one inside a word, where a line may break after it as it does in prose.
 */
const OPENING_HYPHENS = /(?<![\w-])(-+[^\s-]?)/g

/**
 * Inline code whose opening hyphens stay with the word they open.
 *
 * **A browser breaks a line after any hyphen**, and one that opens a word is
 * no exception: measured at 390, the docs ended lines on `system-ui, -` with
 * `apple-system` below it, and on `var(--` with the property's name below. A
 * lone hyphen at a line's end reads as a dash, or as nothing. The run and the
 * character after it are held on one line by a span that does not wrap, which
 * leaves the text a reader copies as it was written: a word joiner would have
 * been copied into the custom property's name with it.
 */
export function Code({ children }: { children: string }) {
  const pieces = children.split(OPENING_HYPHENS)
  /* Keyed by where each piece starts in the text, which is unique within it
     once the empty pieces are dropped: a name that opens with its hyphens,
     as `--color-ink` does, splits into an empty piece at 0 and the hyphens at
     0, and the two keys of 0 were 26 React errors on the color page. */
  let offset = 0
  return (
    <helix-code>
      {pieces.map((piece, at) => {
        const key = offset
        offset += piece.length
        if (piece === '') {
          return null
        }
        return at % 2 === 1 ? (
          <span key={key} style={{ whiteSpace: 'nowrap' }}>
            {piece}
          </span>
        ) : (
          <Fragment key={key}>{piece}</Fragment>
        )
      })}
    </helix-code>
  )
}

/**
 * Text from the manifest, with each span in backticks shown as inline code and
 * each span in double asterisks in bold.
 *
 * Doc comments mark names with backticks and their one rule in bold, as
 * Markdown does. Printed as plain text, the reference showed the marks
 * themselves: "Ignored once `open` is written", and a sentence wrapped in
 * asterisks. A backtick without a partner stays as it is, and so does an
 * asterisk pair without one. Asterisks inside code are code.
 */
export function CodeText({ children }: { children: string }) {
  const pieces = children.split(new RegExp(CODE.source, 'g'))
  /* Only the pairs: an odd one out is left as the reader would type it. */
  let pairs = pieces.reduce(
    (count, piece, at) => (at % 2 === 1 ? count : count + piece.split(BOLD).length - 1),
    0,
  )
  pairs -= pairs % 2
  const nodes: ReactNode[] = []
  let strong = false
  /* Keyed by where each span starts in the source text, which is stable for a
     given string and unique within it. */
  let offset = 0
  const add = (key: number, node: ReactNode): void => {
    nodes.push(strong ? <strong key={key}>{node}</strong> : <Fragment key={key}>{node}</Fragment>)
  }
  for (const [at, piece] of pieces.entries()) {
    if (at % 2 === 1) {
      add(offset, <Code>{piece.replace(/\s+/g, ' ')}</Code>)
      offset += piece.length + 2
      continue
    }
    for (const [step, run] of piece.split(BOLD).entries()) {
      let text = run
      if (step > 0) {
        if (pairs > 0) {
          strong = !strong
          pairs -= 1
        } else {
          text = BOLD + run
          offset -= BOLD.length
        }
        offset += BOLD.length
      }
      if (text !== '') {
        add(offset, text)
      }
      offset += text.length
    }
  }
  return <>{nodes}</>
}

/** The same text with the backticks and the bold marks removed, for a title, a share image, or search. */
export const plainText = (text: string): string =>
  text
    .replace(new RegExp(CODE.source, 'g'), (_, code: string) => code.replace(/\s+/g, ' '))
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
