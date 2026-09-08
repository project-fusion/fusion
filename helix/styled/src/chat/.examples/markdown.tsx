import { closeMarkdown } from '@fusion.dev/helix-core'
import { useCallback, useEffect, useRef, useState } from 'react'
import './markdown.css'

const SOURCE = `### What changed

Three things landed, and one of them moves a default.

| Package | Version |
| --- | --- |
| helix | 0.16.3 |
| helix-core | 0.16.3 |

- \`Button\` lost its width axis
- The small dialog footer fits again
- Nothing generated is tracked any more

Upgrade with:

\`\`\`sh
bun add @fusion.dev/helix
\`\`\`
`

/* **A renderer small enough to read, because the point is the seam and not the
   parser.** Chat renders no markdown and takes no dependency on one: a turn is
   the consumer's own markup, so this is the consumer's job and this is what
   doing it looks like. Swap it for whichever library you already ship. */
const inline = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

const render = (source: string) => {
  const out: string[] = []
  const lines = source.split('\n')
  let at = 0

  while (at < lines.length) {
    const line = lines[at] ?? ''
    if (line.startsWith('```')) {
      const code: string[] = []
      at += 1
      while (at < lines.length && !(lines[at] ?? '').startsWith('```')) {
        code.push(lines[at] ?? '')
        at += 1
      }
      at += 1
      out.push(`<pre><code>${inline(code.join('\n'))}</code></pre>`)
      continue
    }
    if (line.startsWith('|')) {
      const rows: string[] = []
      while (at < lines.length && (lines[at] ?? '').startsWith('|')) {
        rows.push(lines[at] ?? '')
        at += 1
      }
      const cells = (row: string) =>
        row
          .split('|')
          .slice(1, -1)
          .map((one) => one.trim())
      const head = cells(rows[0] ?? '')
      const body = rows.slice(2).map(cells)
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>` +
          `<tbody>${body
            .map((row) => `<tr>${row.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
            .join('')}</tbody></table>`,
      )
      continue
    }
    if (line.startsWith('- ')) {
      const items: string[] = []
      while (at < lines.length && (lines[at] ?? '').startsWith('- ')) {
        items.push((lines[at] ?? '').slice(2))
        at += 1
      }
      out.push(`<ul>${items.map((one) => `<li>${inline(one)}</li>`).join('')}</ul>`)
      continue
    }
    const heading = /^(#{1,6}) (.*)$/.exec(line)
    if (heading) {
      const level = (heading[1] ?? '').length
      out.push(`<h${level}>${inline(heading[2] ?? '')}</h${level}>`)
      at += 1
      continue
    }
    if (line.trim() !== '') {
      out.push(`<p>${inline(line)}</p>`)
    }
    at += 1
  }
  return out.join('')
}

export function Example() {
  const [shown, setShown] = useState(SOURCE.length)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const run = useCallback(() => {
    clearTimeout(timer.current)
    /* Photographed with reduced motion forced, so the resting state is the
       finished answer rather than whichever word the shutter caught. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(SOURCE.length)
      return
    }
    let at = 0
    setShown(0)
    const step = () => {
      at = Math.min(at + 12, SOURCE.length)
      setShown(at)
      if (at < SOURCE.length) {
        timer.current = setTimeout(step, 40)
      }
    }
    step()
  }, [])

  useEffect(() => {
    run()
    return () => clearTimeout(timer.current)
  }, [run])

  /* **`closeMarkdown` is the whole reason this reads as an answer rather than as
     a page rebuilding itself.** A prefix of markdown is rarely valid markdown:
     the moment the fence opens, everything after it is code that has not been
     told it is code, and a renderer handed that draws paragraphs and then
     redraws the lot when the closing fence lands. This closes what is open, so
     every frame is a whole document. */
  const html = render(closeMarkdown(SOURCE.slice(0, shown)))

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-chat
        className="markdown"
        label="Assistant"
      >
        <helix-text
          as="strong"
          slot="header"
          variant="body-strong"
        >
          Assistant
        </helix-text>

        <helix-chat-message
          author="me"
          state="sent"
        >
          What changed in 0.16?
        </helix-chat-message>

        {/* `data-prose` is what styles the rendered markup. The recipe lives in
            the base layer because a shadow root cannot reach into slotted
            content: `::slotted()` matches the assigned node and never its
            descendants, so a rule for a table's cells has to be written where
            the cells are. */}
        <helix-chat-message
          author="them"
          dangerouslySetInnerHTML={{ __html: html }}
          data-prose
          separation="plain"
          state={shown === SOURCE.length ? 'sent' : 'streaming'}
        ></helix-chat-message>
      </helix-chat>

      <helix-button onClick={run}>Replay</helix-button>
    </helix-flex>
  )
}
