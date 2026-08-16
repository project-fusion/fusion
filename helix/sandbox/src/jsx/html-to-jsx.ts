/**
 * Rewrites an example's markup as the JSX a consumer would write.
 *
 * Derived rather than authored. An example is one file, and its React form is
 * the same file said differently: two hand-written copies drift the first time
 * one is edited, and the sandbox would be showing a component that is not the
 * one it is previewing.
 *
 * Small on purpose. What it converts is the handful of things HTML and JSX
 * genuinely spell differently, and nothing else:
 *
 * - `class` is `className`, `for` is `htmlFor`.
 * - A bare attribute is `true`, which JSX writes by naming it alone.
 * - `style` is an object, because React refuses a string there.
 * - A comment is an expression.
 *
 * **Hyphenated attributes stay as they are**, which is the part that looks
 * wrong and is not. Every camelCase property in Helix declares a hyphenated
 * attribute for exactly this reason, and React sets it on a custom element
 * verbatim, so `field-label` reaches `fieldLabel` and `fieldLabel` would reach
 * nothing.
 */

/** A tag that never has children, so JSX has to close it itself. */
const VOID = new Set([
  'area',
  'base',
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

const RENAMED: Record<string, string> = { class: 'className', for: 'htmlFor' }

/** `background-color: red` becomes `backgroundColor: 'red'`, `--x` stays `--x`. */
const styleObject = (value: string): string => {
  const entries = value
    .split(';')
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => {
      const at = rule.indexOf(':')
      const name = rule.slice(0, at).trim()
      const said = rule.slice(at + 1).trim()
      // A custom property has to keep its dashes, so it is quoted rather than
      // camel-cased. Anything else is a CSS property React knows by its
      // camelCase name.
      const key = name.startsWith('--')
        ? `'${name}'`
        : name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
      return `${key}: '${said.replaceAll("'", "\\'")}'`
    })
  return `{{ ${entries.join(', ')} }}`
}

const ATTR = /([^\s=/>]+)(?:\s*=\s*"([^"]*)"|\s*=\s*'([^']*)')?/g

const attributes = (source: string): string => {
  const out: string[] = []
  for (const match of source.matchAll(ATTR)) {
    const name = RENAMED[match[1] as string] ?? (match[1] as string)
    const value = match[2] ?? match[3]
    if (value === undefined) {
      // Bare, so it is `true`, and JSX says that by saying nothing.
      out.push(name)
    } else if (name === 'style') {
      out.push(`style=${styleObject(value)}`)
    } else {
      out.push(`${name}="${value}"`)
    }
  }
  return out.length > 0 ? ` ${out.join(' ')}` : ''
}

/** A stylesheet an example declares, which each syntax states its own way. */
const STYLESHEET = /<link\b[^>]*\brel=(["'])stylesheet\1[^>]*\bhref=(["'])([^"']+)\2[^>]*>\s*/i

/** The example's markup, as the body of a React component. */
export const htmlToJsx = (html: string, name = 'Example'): string => {
  /* A `<link>` in HTML is an `import` in React, so the example says the same
     thing in whichever syntax is being read. Both are what that consumer
     actually writes, which is the point of showing the stylesheet at all: an
     example whose CSS arrives invisibly is an example that does not work when
     it is copied. */
  const stylesheet = html.match(STYLESHEET)
  const imported = stylesheet ? `import './${stylesheet[3]}'\n\n` : ''

  const body = html
    .replace(STYLESHEET, '')
    .replace(/<!--([\s\S]*?)-->/g, (_, text: string) => `{/*${text}*/}`)
    .replace(
      /<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^>]*?)?)\s*(\/?)>/g,
      (whole, tag: string, rest: string, closed: string) => {
        if (whole.startsWith('</')) {
          return whole
        }
        const written = attributes(rest)
        return VOID.has(tag.toLowerCase()) || closed === '/'
          ? `<${tag}${written} />`
          : `<${tag}${written}>`
      },
    )
    .trim()

  // Indented to sit inside the return, and wrapped only when it has to be:
  // a fragment around a single root is noise a reader has to look past.
  const indented = body
    .split('\n')
    .map((line) => (line === '' ? line : `      ${line}`))
    .join('\n')
  const roots = body.match(/^<([a-zA-Z][a-zA-Z0-9-]*)/gm) ?? []
  const fragment = roots.length > 1

  return `${imported}export function ${name}() {
  return (
${fragment ? '    <>\n' : ''}${indented}
${fragment ? '    </>\n' : ''}  )
}
`
}
