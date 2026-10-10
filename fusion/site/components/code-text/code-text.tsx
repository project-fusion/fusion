import { Fragment, type ReactNode } from 'react'

/**
 * A span in backticks, as Markdown writes inline code. It can run across a line
 * break, as a doc comment wraps it, and the break reads as a space.
 */
const CODE = /`([^`]+)`/

/** Where Markdown opens or closes bold, as doc comments write it. */
const BOLD = '**'

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
      add(offset, <helix-code>{piece.replace(/\s+/g, ' ')}</helix-code>)
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
