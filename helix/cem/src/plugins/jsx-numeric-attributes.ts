import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { HelixManifest, Plugin } from '../types.js'

/**
 * An entry as the generators write it: a name, then its type as an indexed
 * access into the element class.
 *
 * The name is quoted where it has to be, `"default-page"` and Solid's
 * `"attr:default-page"`, and bare where it need not be, `minlength`. A property
 * entry has the same shape, `defaultPage?: HelixPagination["defaultPage"]`, and
 * is told apart by the manifest rather than by the pattern: only a name the
 * manifest records as an attribute, under a different name from its property,
 * is rewritten.
 */
const ENTRY =
  /^([ \t]*)("(?:attr:)?[a-z][a-z0-9-]*"|[a-z][a-z0-9]*)\?: ([A-Za-z_$][\w$]*)\[(['"])([A-Za-z_$][\w$]*)\4\];$/gm

/** The attribute a name token spells, without its quotes or Solid's prefix. */
const attributeOf = (token: string): string => token.replace(/^"(?:attr:)?|"$/g, '')

/**
 * The string spelling of a number, which is what an attribute carries.
 *
 * Escaped rather than quoted, because a `${` inside a plain string is what the
 * lint reads as a template literal somebody forgot to backtick.
 */
const NUMERIC_STRING = `\`\${number}\``

export interface JsxNumericAttributesOptions {
  /** Files the generators wrote, relative to the package root. */
  fileNames?: string[]
}

/**
 * Lets a numeric attribute take the string that spells its number.
 *
 * **The generators type an attribute as its property, and for a number that
 * is wrong by half.** `default-page` and `defaultPage` both come out as
 * `HelixPagination["defaultPage"]`, which is `number`. React assigns a prop as
 * a property when the element has one of that name and as an attribute when it
 * does not, so `defaultPage={1}` reaches the property and `default-page="1"`
 * reaches `setAttribute`, where Lit's converter turns the string back into the
 * number. The second is what an HTML attribute carries and what every example
 * in this repository writes, and the typings rejected it.
 *
 * **Only the attribute entry, and only where the name differs from the
 * property's.** A same-named attribute is the case CONVENTIONS warns about:
 * React prefers the property and assigns the value verbatim, so `value="42"`
 * on a meter arrives as a string the converter never sees. That entry keeps
 * `number` so the mistake stays a type error. Vue sets a prop the same way
 * React does, so `vue.d.ts` gets the same rewrite, and `svelte.d.ts` reuses
 * the JSX map and needs none.
 *
 * `` `${number}` `` rather than `string`, so `default-page="abc"` is still
 * refused: the converter would make `NaN` of it, and a type that admits it
 * promises less than the generator did. A boolean attribute is left alone,
 * because `mark-all="false"` is the attribute present, and a type that took the
 * string would teach that spelling.
 *
 * Which entries are numeric is read from the manifest, the way the generator
 * resolves the type: the property's declared type first, then the attribute's,
 * since an initializer-only property records a type on the member and none on
 * the attribute.
 *
 * Runs after the generators and before `jsxOptionalUndefined`, which wraps
 * whatever it finds here in the same `| undefined` as everything else.
 */
export const jsxNumericAttributes = ({
  fileNames = ['jsx.d.ts', 'vue.d.ts'],
}: JsxNumericAttributesOptions = {}): Plugin => ({
  name: 'helix-jsx-numeric-attributes',
  packageLinkPhase({ customElementsManifest }) {
    const numeric = numericAttributes(customElementsManifest as HelixManifest)
    if (numeric.size === 0) {
      return
    }
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
      const next = source.replace(
        ENTRY,
        (
          line: string,
          indent: string,
          name: string,
          element: string,
          quote: string,
          property: string,
        ) =>
          numeric.has(`${element} ${attributeOf(name)}`)
            ? `${indent}${name}?: ${element}[${quote}${property}${quote}] | ${NUMERIC_STRING};`
            : line,
      )
      if (next !== source) {
        writeFileSync(path, next)
      }
    }
  },
})

/**
 * Every attribute whose type is a number and whose name is not its property's,
 * as `<class> <attribute>`.
 */
const numericAttributes = (manifest: HelixManifest): Set<string> => {
  const found = new Set<string>()
  for (const module of manifest.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      const members = new Map(
        (declaration.members ?? []).map((member) => [member.name, member.type?.text]),
      )
      for (const attribute of declaration.attributes ?? []) {
        const { fieldName, name } = attribute
        if (!fieldName || fieldName === name) {
          continue
        }
        const type = members.get(fieldName) ?? attribute.type?.text
        if (type !== undefined && numeric(type)) {
          found.add(`${declaration.name} ${name}`)
        }
      }
    }
  }
  return found
}

/** Whether a type is `number`, allowing for the `| undefined` an optional one carries. */
const numeric = (type: string): boolean => {
  const parts = type.split('|').map((part) => part.trim())
  return (
    parts.includes('number') && parts.every((part) => part === 'number' || part === 'undefined')
  )
}
