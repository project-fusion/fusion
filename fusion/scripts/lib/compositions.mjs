/**
 * Where a component renders another component, and what that costs a consumer.
 *
 * Read by `check:api:exportparts`, which holds a composition to publishing what it
 * renders.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

export const TIERS = ['helix/headless/src', 'helix/styled/src']

export const walk = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path, found)
    } else if (path.endsWith('.ts') && !path.endsWith('.css.ts') && !path.includes('.spec.')) {
      found.push(path)
    }
  }
  return found
}

/**
 * Comments are markup's worst impostor: a JSDoc quoting a template is not one.
 *
 * **Blanked to the same length rather than removed**, so an offset into this
 * string is an offset into the file. Collapsing a comment to one space moves
 * every character after it, which is fine for counting and wrong for anything
 * that reports a line or writes an edit back.
 */
export const withoutComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, (found) => found.replace(/[^\n]/g, ' '))
    .replace(
      /^([ \t]*)\/\/.*$/gm,
      (found, indent) => indent + ' '.repeat(found.length - indent.length),
    )

/** The family a file belongs to, which is the directory under a tier. */
export const familyOf = (path) => path.split('/')[3] ?? ''

/**
 * Reads the open tag that starts at `from`, and returns its attributes.
 *
 * **A fixed window of N characters is not good enough.** An open tag here
 * carries Lit bindings, so it holds `${…}` with nested braces, quotes inside
 * those braces, and `>` inside arrow functions: measured, a fixed window cut
 * four of the twenty-eight composition sites in half and silently reported them
 * as carrying no `exportparts`. So this scans, tracking interpolation depth and
 * quoting, and stops at the first `>` that is really the end of the tag.
 */
export const openTag = (source, from) => {
  let depth = 0
  let quote = ''
  for (let at = from; at < source.length; at += 1) {
    const char = source[at]
    if (quote) {
      if (char === quote) {
        quote = ''
      }
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '$' && source[at + 1] === '{') {
      depth += 1
      at += 1
      continue
    }
    if (char === '{' && depth > 0) {
      depth += 1
      continue
    }
    if (char === '}' && depth > 0) {
      depth -= 1
      continue
    }
    if (char === '>' && depth === 0) {
      return source.slice(from, at)
    }
  }
  return source.slice(from)
}

/**
 * Every part a tag publishes, by the tag's suffix, resolved through `extends`.
 *
 * **By tag and not by directory.** `this.tag('menu-item')` names an element that
 * lives in `menu/item/`, so a directory lookup asks for a family called
 * `menu-item`, finds none, and reports nine of the twenty-eight composition
 * sites as having nothing to forward.
 *
 * **Unioned across both tiers**, because a styled component usually renders
 * none of its own markup and takes it from the headless class it extends. The
 * two tiers publish one part surface and a consumer reaches it through whichever
 * element they rendered.
 */
export const partsByTag = () => {
  /** class -> { bases, parts, tags } */
  const classes = new Map()
  for (const tier of TIERS) {
    for (const path of walk(tier)) {
      const text = readFileSync(path, 'utf8')
      const declaration = /export class (\w+)(?: extends ([\s\S]*?))?\s*\{/.exec(text)
      if (!declaration) {
        continue
      }
      const [, name, base = ''] = declaration
      const code = withoutComments(text)
      const parts = new Set()
      for (const [, value] of code.matchAll(/(?<!\[)part="([a-z0-9 -]+)"/g)) {
        for (const one of value.split(/\s+/)) {
          parts.add(one)
        }
      }
      const tags = [...code.matchAll(/@customElement\(\s*['"]([a-z0-9-]+)['"]/g)].map((m) => m[1])
      classes.set(name, {
        bases: [...base.matchAll(/(\w+)/g)].map((m) => m[1]),
        parts,
        tags,
      })
    }
  }

  const resolve = (name, seen = new Set()) => {
    const entry = classes.get(name)
    if (!entry || seen.has(name)) {
      return []
    }
    seen.add(name)
    return [...entry.parts, ...entry.bases.flatMap((base) => resolve(base, seen))]
  }

  const byTag = new Map()
  for (const [name, entry] of classes) {
    for (const tag of entry.tags) {
      const suffix = tag.replace(/^helix-(headless-)?/, '')
      const found = byTag.get(suffix) ?? new Set()
      for (const part of resolve(name)) {
        found.add(part)
      }
      byTag.set(suffix, found)
    }
  }
  return byTag
}

/**
 * What each tag's parts are called, by tag suffix, resolved through `extends`.
 *
 * The description is the child's own, because a forwarded part is the child's
 * part: a parent inventing a second description for it is two pages saying
 * different things about one element.
 */
export const partDocsByTag = () => {
  const classes = new Map()
  for (const tier of TIERS) {
    for (const path of walk(tier)) {
      const text = readFileSync(path, 'utf8')
      const declaration = /export class (\w+)(?: extends ([\s\S]*?))?\s*\{/.exec(text)
      if (!declaration) {
        continue
      }
      const [, name, base = ''] = declaration
      const docs = new Map()
      for (const [, part, description] of text.matchAll(/@csspart\s+([a-z0-9-]+)\s+-\s+(.*)/g)) {
        docs.set(part, description.trim())
      }
      const tags = [
        ...withoutComments(text).matchAll(/@customElement\(\s*['"]([a-z0-9-]+)['"]/g),
      ].map((m) => m[1])
      classes.set(name, {
        bases: [...base.matchAll(/(\w+)/g)].map((m) => m[1]),
        docs,
        tags,
      })
    }
  }
  const resolve = (name, seen = new Set()) => {
    const entry = classes.get(name)
    if (!entry || seen.has(name)) {
      return []
    }
    seen.add(name)
    return [...entry.bases.flatMap((base) => resolve(base, seen)), ...entry.docs]
  }
  const byTag = new Map()
  for (const [name, entry] of classes) {
    for (const tag of entry.tags) {
      const suffix = tag.replace(/^helix-(headless-)?/, '')
      const found = byTag.get(suffix) ?? new Map()
      for (const [part, description] of resolve(name)) {
        found.set(part, description)
      }
      byTag.set(suffix, found)
    }
  }
  return byTag
}

/**
 * What a child's part is called once it is forwarded.
 *
 * Prefixed with the role the parent gave the child, so two levels agreeing on a
 * word cannot collide: `command` forwarded the listbox's `search-field` under a
 * name it also rendered itself, and `helix-command::part(search-field)` matched
 * two elements.
 *
 * **Except where the part already is the role**, which is the stutter the rule
 * would otherwise produce: a `dialog` inside a `part="dialog"` is `dialog`, not
 * `dialog-dialog`.
 */
export const exposedAs = (role, part) => (part === role ? role : `${role}-${part}`)

/**
 * Every site where a component renders another, with what it forwards.
 *
 * A site is `<${this.tag('child')} …>`, which is the only way a component may
 * name another (see `helix component`'s `composed`). The `part` on that element is the role
 * the child plays here, and is what a forwarded name is prefixed with.
 */
export const compositions = () => {
  const found = []
  for (const tier of TIERS) {
    for (const path of walk(tier)) {
      const code = withoutComments(readFileSync(path, 'utf8'))
      for (const match of code.matchAll(/<\$\{this\.tag\(\s*['"]([a-z-]+)['"]\s*\)\}/g)) {
        const attributes = openTag(code, match.index + match[0].length)
        const role = /(?:^|\s)part="([a-z0-9-]+)"/.exec(attributes)?.[1]
        const raw = /exportparts="([^"]*)"/.exec(attributes)?.[1] ?? ''
        const forwarded = new Map()
        for (const one of raw.split(',')) {
          const [inner, outer] = one.split(':').map((half) => half.trim())
          if (inner) {
            forwarded.set(inner, outer || inner)
          }
        }
        found.push({
          at: match.index + match[0].length,
          attributes,
          child: match[1],
          family: familyOf(path),
          forwarded,
          path,
          role,
        })
      }
    }
  }
  return found
}
