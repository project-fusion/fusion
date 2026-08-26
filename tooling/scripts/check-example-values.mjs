#!/usr/bin/env node
/**
 * An example may only ask for an attribute value the component accepts.
 *
 * **The failure this was written for, and why nothing else saw it.** Icon
 * Button's `shapes` example set `shape="square"`. The component takes `'circle'`
 * or nothing, so the middle button rendered the default, stood beside an
 * identical one, and the page claimed to show two shapes while showing one. The
 * summary line said "round or square" and had said it for as long as the file
 * existed.
 *
 * Nothing failed, which is the whole problem. An unknown attribute value is not
 * an error anywhere: the element keeps its default, the page renders, the
 * screenshot looks deliberate, and the only way to notice is to know what the
 * component offers and count the differences. That is a reference site teaching
 * an API that does not exist.
 *
 * `check:attributes` is a different question, whether a *document rule* selects
 * on something a component reflects. This one is about the markup in the
 * examples, and it reads the manifest rather than a list kept here: the union in
 * `custom-elements.json` is what the component's own type says, so this cannot
 * drift from the component the way a second list would.
 *
 * **Only closed unions, and deliberately.** An attribute typed `string` accepts
 * anything and there is nothing to check; one typed `QrStyle` resolves in the
 * manifest to its members and is checked. Anything the manifest does not state
 * as a union of string literals is left alone rather than guessed at, because a
 * check that reports a value it merely failed to understand is a check people
 * turn off.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

const TIERS = [
  { manifest: 'helix/headless/custom-elements.json', source: 'helix/headless/src' },
  { manifest: 'helix/styled/custom-elements.json', source: 'helix/styled/src' },
]

/** Every literal in a union type, or nothing where the type is not one. */
const literals = (text) => {
  if (typeof text !== 'string' || !text.includes("'")) {
    return undefined
  }
  const parts = text.split('|').map((part) => part.trim())
  const values = []
  for (const part of parts) {
    if (part === 'undefined' || part === 'null') {
      continue
    }
    const quoted = /^'([^']*)'$/.exec(part)
    if (!quoted) {
      /* One member this cannot read makes the whole union unreadable: a partial
         list would report every value it did not happen to parse. */
      return undefined
    }
    values.push(quoted[1])
  }
  return values.length > 0 ? values : undefined
}

/** tag -> attribute -> the values it takes. */
const allowed = new Map()
for (const tier of TIERS) {
  const path = join(root, tier.manifest)
  if (!existsSync(path)) {
    continue
  }
  const manifest = JSON.parse(readFileSync(path, 'utf8'))
  for (const module of manifest.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      const tag = declaration.tagName
      if (!tag) {
        continue
      }
      for (const attribute of declaration.attributes ?? []) {
        const values = literals(attribute.type?.text)
        if (!values) {
          continue
        }
        const attributes = allowed.get(tag) ?? new Map()
        attributes.set(attribute.name, values)
        allowed.set(tag, attributes)
      }
    }
  }
}

const findings = []
let checked = 0

for (const tier of TIERS) {
  const source = join(root, tier.source)
  if (!existsSync(source)) {
    continue
  }
  for (const family of readdirSync(source, { withFileTypes: true })) {
    const examples = join(source, family.name, '.examples')
    if (!family.isDirectory() || !existsSync(examples)) {
      continue
    }
    for (const file of readdirSync(examples)) {
      if (!file.endsWith('.html')) {
        continue
      }
      const markup = readFileSync(join(examples, file), 'utf8')
      /* Opening tags only, and the attributes inside one. A closing tag carries
         nothing to check and a comment is not markup. */
      for (const tag of markup.matchAll(/<(helix-[a-z0-9-]+)([^>]*)>/g)) {
        const attributes = allowed.get(tag[1])
        if (!attributes) {
          continue
        }
        for (const pair of tag[2].matchAll(/([a-z][a-z0-9-]*)="([^"]*)"/g)) {
          const values = attributes.get(pair[1])
          if (!values) {
            continue
          }
          checked += 1
          if (!values.includes(pair[2])) {
            findings.push(
              `${tier.source}/${family.name}/.examples/${file}: <${tag[1]} ${pair[1]}="${pair[2]}"> ` +
                `is not one of ${values.map((one) => `\`${one}\``).join(', ')}`,
            )
          }
        }
      }
    }
  }
}

if (findings.length > 0) {
  console.error(
    `example values: ${findings.length} ask for something the component does not take.\n  ` +
      `${findings.join('\n  ')}\n\n` +
      '  An unknown value is not an error at runtime: the element keeps its\n' +
      '  default and the example looks deliberate. Use one the component states,\n' +
      '  or give the component the value the example wants.',
  )
  process.exit(1)
}

console.log(
  `example values: ${checked} attribute values across the examples, every one in the union its component states`,
)
