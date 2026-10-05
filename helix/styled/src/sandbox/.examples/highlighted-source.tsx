import type { SandboxToken } from '@fusion.dev/helix'

// A small highlighter for HTML: tags, attribute names and quoted values.
// One built on Lezer, Prism or Shiki returns runs of the same shape.
const PIECES = /(<\/?[\w-]+|[\w-]+(?==)|"[^"]*"|\/?>)/

const kindOf = (text: string): string | undefined => {
  if (text.startsWith('<')) {
    return 'tag'
  }
  if (text.startsWith('"')) {
    return 'string'
  }
  return text.endsWith('>') ? undefined : 'name'
}

// `split` puts each captured piece at an odd index, between the plain text.
const highlight = (source: string): SandboxToken[] =>
  source
    .split(PIECES)
    .map((text, at) => ({ kind: at % 2 ? kindOf(text) : undefined, text }))
    .filter((run) => run.text)

export function Example() {
  return (
    <helix-sandbox-source
      highlight={highlight}
      name="html"
      value='<p class="lead">Edited here, colored as you type.</p>'
    />
  )
}
