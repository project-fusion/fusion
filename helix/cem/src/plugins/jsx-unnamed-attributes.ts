import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { HelixManifest, Plugin } from '../types.js'

/** The head of an element's props in either file, which names its class. */
const BLOCK = /^export type ([A-Za-z_$][\w$]*?)(?:SolidJsProps|VueProps|Props) = \{$/

/**
 * An entry the generators could not type: an attribute, quoted where it has to
 * be and with Solid's `attr:` prefix where it has one, typed `unknown`.
 */
const UNTYPED = /^([ \t]*)("(?:attr:)?([a-z][a-z0-9-]*)"|([a-z][a-z0-9]*))\?: unknown;$/

/**
 * The entry for the property such an attribute does not have, under the name
 * `undefined`, with the doc comment the generator writes above it.
 */
const STRAY =
  /^(?:[ \t]*\/\*\*(?:(?!\*\/)[\s\S])*\*\/\n)?[ \t]*(?:undefined|"prop:undefined")\?: unknown;\n/gm

export interface JsxUnnamedAttributesOptions {
  /** Files the generators wrote, relative to the package root. */
  fileNames?: string[]
}

/**
 * Types an attribute that names no field by its own type in the manifest.
 *
 * **The generators type an attribute as its property**, `HelixInput["label"]`,
 * and an attribute whose field is protected, private or `@internal` names no
 * field, so they have nothing to index and write `unknown`. `aria-label` on
 * every field is one: `MixinField` observes it through the protected
 * `namedBy`. JSX also gained a prop called `undefined` for each one, the
 * generator writing the missing field's name.
 *
 * The type is the attribute's own, without the `null` the field starts as,
 * because markup writes an attribute or leaves it out. An attribute recorded
 * with no type is a string, which is what markup carries.
 *
 * Runs after both generators and before `jsxOptionalUndefined`, which wraps
 * what this writes in the same `| undefined` as everything else.
 */
export const jsxUnnamedAttributes = ({
  fileNames = ['jsx.d.ts', 'vue.d.ts'],
}: JsxUnnamedAttributesOptions = {}): Plugin => ({
  name: 'helix-jsx-unnamed-attributes',
  packageLinkPhase({ customElementsManifest }) {
    const unnamed = unnamedAttributes(customElementsManifest as HelixManifest)
    for (const fileName of fileNames) {
      const path = join(process.cwd(), fileName)
      let source: string
      try {
        source = readFileSync(path, 'utf8')
      } catch {
        // No types for this package, which is the normal case for one that
        // ships no elements.
        continue
      }
      let element = ''
      const next = source
        .split('\n')
        .map((line) => {
          element = BLOCK.exec(line)?.[1] ?? element
          const found = UNTYPED.exec(line)
          const type = found && unnamed.get(`${element} ${found[3] ?? found[4]}`)
          return found && type ? `${found[1]}${found[2]}?: ${type};` : line
        })
        .join('\n')
        .replace(STRAY, '')
      if (next !== source) {
        writeFileSync(path, next)
      }
    }
  },
})

/**
 * A type as markup can write it: without `null` and `undefined`, or `string`
 * where nothing is left.
 *
 * A type with brackets in it is kept whole, since a `|` inside one is not a
 * member of the outer union.
 */
const written = (type: string): string => {
  if (/[()<>[\]{}]/.test(type)) {
    return type
  }
  const kept = type
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part !== '' && part !== 'null' && part !== 'undefined')
  return kept.length > 0 ? kept.join(' | ') : 'string'
}

/** Every attribute that names no field, as `<class> <attribute>`, with its type. */
const unnamedAttributes = (manifest: HelixManifest): Map<string, string> => {
  const found = new Map<string, string>()
  for (const module of manifest.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      for (const attribute of declaration.attributes ?? []) {
        if (attribute.fieldName) {
          continue
        }
        found.set(`${declaration.name} ${attribute.name}`, written(attribute.type?.text ?? ''))
      }
    }
  }
  return found
}
