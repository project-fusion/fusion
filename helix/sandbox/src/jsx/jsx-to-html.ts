/**
 * Reads a JSX example back as the markup it stands for.
 *
 * The inverse of `htmlToJsx`, and it exists so the file on screen is the file
 * that runs. A preview renders markup into a document; it does not run React,
 * and putting a compiler in there to make it look as though it did would ship a
 * megabyte to answer a question nobody asked. Converting is honest and small:
 * the JSX in a sandbox is Helix elements with attributes, which is the same
 * tree said differently.
 *
 * **It converts markup, not programs.** An expression, a prop holding a value
 * rather than a literal, a component of the consumer's own: none of those have
 * an HTML form, and none appears in an example. What arrives with one is left
 * as it is rather than guessed at, so the preview shows something wrong in a
 * way that is visible instead of silently dropping it.
 */

/** A tag that closes itself in HTML, where every other tag needs a pair. */
const VOID = new Set([
  'area',
  'headless',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
])

const RENAMED: Record<string, string> = { className: 'class', htmlFor: 'for' }

/** `{{ backgroundColor: 'red' }}` reads back as `background-color: red`. */
const styleText = (object: string): string =>
  object
    .replace(/^\{\{|\}\}$/g, '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const at = entry.indexOf(':')
      const key = entry
        .slice(0, at)
        .trim()
        .replace(/^['"]|['"]$/g, '')
      const value = entry
        .slice(at + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '')
      // A custom property keeps its dashes; anything else came from camelCase.
      const name = key.startsWith('--')
        ? key
        : key.replace(/[A-Z]/g, (up) => `-${up.toLowerCase()}`)
      return `${name}: ${value}`
    })
    .join('; ')

const ATTR = /([^\s=/>]+)(?:\s*=\s*(\{\{[^}]*\}\}|"[^"]*"|'[^']*'))?/g

const attributes = (source: string): string => {
  const out: string[] = []
  for (const match of source.matchAll(ATTR)) {
    const name = RENAMED[match[1] as string] ?? (match[1] as string)
    const raw = match[2]
    if (raw === undefined) {
      out.push(name)
    } else if (raw.startsWith('{{')) {
      out.push(`${name}="${styleText(raw)}"`)
    } else {
      out.push(`${name}=${raw.startsWith("'") ? `"${raw.slice(1, -1)}"` : raw}`)
    }
  }
  return out.length > 0 ? ` ${out.join(' ')}` : ''
}

/** The markup a JSX example stands for. */
export const jsxToHtml = (jsx: string): string => {
  /* The import becomes the link again, so switching syntax twice returns the
     file it started as. Read before the wrapper is stripped, because the strip
     begins at `return (` and would take it with everything else above. */
  const stylesheet = jsx.match(/^\s*import\s+['"]\.\/([^'"]+)['"]\s*$/m)
  const linked = stylesheet ? `<link rel="stylesheet" href="${stylesheet[1]}" />\n\n` : ''

  // The component wrapper is scaffolding around the tree, not part of it.
  // `[^\S\n]*` rather than `\s*` at every line end: `\s` includes the newline
  // and would eat the next line's indentation with it, leaving the first line
  // flush and nothing for the dedent below to measure against.
  const inner = jsx
    .replace(/^[\s\S]*?return[^\S\n]*\([^\S\n]*\n?/, '')
    .replace(/\n?[^\S\n]*\)[^\S\n]*\n?\}[\s]*$/, '')
    .replace(/^[^\S\n]*<>[^\S\n]*\n?/, '')
    .replace(/\n?[^\S\n]*<\/>[\s]*$/, '')

  const lines = inner.split('\n').filter((line) => line.trim() !== '')
  // Dedent by the shallowest line, so the tree keeps its own shape.
  const indent = Math.min(
    ...lines.map((line) => line.length - line.trimStart().length),
    Number.POSITIVE_INFINITY,
  )
  const body = lines.map((line) => line.slice(Number.isFinite(indent) ? indent : 0)).join('\n')

  return `${linked}${body
    .replace(/\{\/\*([\s\S]*?)\*\/\}/g, (_, text: string) => `<!--${text}-->`)
    .replace(
      /<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^>]*?)?)\s*(\/?)>/g,
      (whole, tag: string, rest: string, closed: string) => {
        if (whole.startsWith('</')) {
          return whole
        }
        const written = attributes(rest)
        if (closed !== '/') {
          return `<${tag}${written}>`
        }
        // Self-closing is JSX's, not HTML's: only void elements may do it, and
        // anything else has to be given the pair it was written without.
        return VOID.has(tag.toLowerCase()) ? `<${tag}${written} />` : `<${tag}${written}></${tag}>`
      },
    )
    .trim()}\n`
}
