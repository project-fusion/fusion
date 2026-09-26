import { Fragment, type ReactNode } from 'react'

/**
 * A span in backticks, as Markdown writes inline code. It can run across a line
 * break, as a doc comment wraps it, and the break reads as a space.
 */
const CODE = /`([^`]+)`/

/**
 * Text from the manifest, with each span in backticks shown as inline code.
 *
 * Doc comments mark names with backticks, as Markdown does. Printed as plain
 * text, the reference showed the backticks themselves: "Ignored once `open` is
 * written." A backtick without a partner stays as it is.
 */
export function CodeText({ children }: { children: string }) {
  const nodes: ReactNode[] = []
  /* Keyed by where each span starts in the source text, which is stable for a
     given string and unique within it. */
  let offset = 0
  for (const [at, part] of children.split(new RegExp(CODE.source, 'g')).entries()) {
    const code = at % 2 === 1
    if (!code && part === '') {
      continue
    }
    nodes.push(
      code ? (
        <helix-code key={offset}>{part.replace(/\s+/g, ' ')}</helix-code>
      ) : (
        <Fragment key={offset}>{part}</Fragment>
      ),
    )
    offset += part.length + (code ? 2 : 0)
  }
  return <>{nodes}</>
}

/** The same text with the backticks removed, for a title, a share image, or search. */
export const plainText = (text: string): string =>
  text.replace(new RegExp(CODE.source, 'g'), (_, code: string) => code.replace(/\s+/g, ' '))
