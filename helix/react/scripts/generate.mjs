#!/usr/bin/env node
/**
 * Generates React wrappers from `@helix-io/web`'s custom elements manifest.
 *
 * Wrappers are generated rather than written because the manifest already
 * describes every prop, event, and type: hand-writing them means the React API
 * and the element API drift the moment someone adds a property and forgets the
 * wrapper. The manifest is the single source, and `bun run generate` is how it
 * reaches React.
 *
 * Composition groups come from `helix.group` and `helix.part`, so
 * `Card.Root` / `Card.Header` fall out of the file layout rather than being
 * maintained by hand.
 *
 * One family per module, so a consumer importing `Disclosure` never pulls
 * `Table` into the bundle.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGE = join(HERE, '..')
const MANIFESTS = [
  { path: join(PACKAGE, '..', 'web', 'custom-elements.json'), pkg: '@helix-io/web' },
  { path: join(PACKAGE, '..', 'headless', 'custom-elements.json'), pkg: '@helix-io/headless' },
]
const OUT = join(PACKAGE, 'src', 'generated')

const kebabToCamel = (value) => value.replace(/-([a-z])/g, (_, c) => c.toUpperCase())

/**
 * Members a consumer can actually set.
 *
 * `readonly` matters: a getter like `isOpen` reads as a boolean field in the
 * manifest, but assigning to it throws. Emitting it as a writable prop hands
 * consumers an API that fails at runtime.
 */
const isAuthorable = (member) =>
  member.kind === 'field' &&
  (!member.privacy || member.privacy === 'public') &&
  !member.static &&
  !member.readonly &&
  member.name !== 'styles'

/**
 * Non-primitive props must be assigned as properties: an attribute stringifies,
 * so an object arrives as `[object Object]`. Booleans go the same way because
 * `false` as an attribute is the string "false", which is truthy.
 */
const mustBeProperty = (member) => {
  const type = member.type?.text ?? ''
  return (
    type.includes('boolean') ||
    type.includes('[]') ||
    type.includes('Array') ||
    type.includes('{') ||
    type.includes('=>')
  )
}

const propType = (member) => {
  const text = member.type?.text
  if (!text) {
    return 'unknown'
  }
  // Literal unions carry through verbatim; that is the whole reason the
  // analyzer is configured to expand them rather than emit an alias name.
  return text.replace(/\s*\|\s*undefined/g, '')
}

/** group -> [{ declaration, part, pkg }] */
const groups = new Map()

/** Each module paired with the package that ships it, for event-type imports. */
const modules = MANIFESTS.flatMap(({ path, pkg }) =>
  (JSON.parse(readFileSync(path, 'utf8')).modules ?? []).map((module) => ({ module, pkg })),
)

for (const { module, pkg } of modules) {
  for (const declaration of module.declarations ?? []) {
    const helix = declaration.helix ?? {}
    // Both tiers are wrapped. The headless tier is a supported entry point
    // for consumers bringing their own styling, and it groups as `BaseCard`.
    const wrappable = helix.tier === 'styled' || helix.tier === 'headless'
    if (declaration.kind !== 'class' || !wrappable || !declaration.tagName) {
      continue
    }
    const group = helix.group ?? declaration.name.replace(/^Helix/, '')
    const part = helix.part ?? 'Root'
    if (!groups.has(group)) {
      groups.set(group, [])
    }
    groups.get(group).push({ declaration, part, pkg })
  }
}

if (groups.size === 0) {
  console.error('generate: manifests contained no components. Run `bun run analyze` first.')
  process.exit(1)
}

rmSync(OUT, { force: true, recursive: true })
mkdirSync(OUT, { recursive: true })

const files = []

for (const [group, parts] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
  parts.sort((a, b) =>
    a.part === 'Root' ? -1 : b.part === 'Root' ? 1 : a.part.localeCompare(b.part),
  )

  const body = []
  const exported = []
  const elementImports = new Set()
  const sourcePackage = parts[0]?.pkg ?? '@helix-io/web'

  for (const { declaration, part } of parts) {
    // The component identifier always carries its part, because the namespace
    // object below owns the bare group name.
    const name = `${group}${part}`
    const propsName = `${group}${part === 'Root' ? '' : part}Props`
    const members = (declaration.members ?? []).filter(isAuthorable)
    const events = declaration.events ?? []

    body.push(`/**`)
    body.push(` * ${declaration.description ?? declaration.summary ?? `${group} ${part}.`}`)
    body.push(` *`)
    body.push(` * Renders \`<${declaration.tagName}>\`.`)
    body.push(` */`)
    body.push(`export interface ${propsName} extends BaseProps {`)
    for (const member of members.sort((a, b) => a.name.localeCompare(b.name))) {
      if (member.description) {
        body.push(`  /** ${member.description.replace(/\s+/g, ' ').trim()} */`)
      }
      body.push(`  ${member.name}?: ${propType(member)}`)
    }
    for (const event of events.sort((a, b) => a.name.localeCompare(b.name))) {
      const prop = event.reactProp ?? `on${kebabToCamel(`-${event.name}`)}`
      // `@event {HelixOpenChangeEvent} open-change` puts the class name in the
      // manifest. Without it the callback degrades to a bare Event, which is
      // the difference between `event.detail.open` type-checking and not.
      const eventType = event.type?.text ?? 'Event'
      if (!/^(?:Event|CustomEvent)\b/.test(eventType)) {
        elementImports.add(eventType)
      }
      if (event.description) {
        body.push(`  /** ${event.description.replace(/\s+/g, ' ').trim()} */`)
      }
      body.push(`  ${prop}?: (event: ${eventType}) => void`)
    }
    body.push('}')
    body.push('')

    const propertyNames = members.filter(mustBeProperty).map((m) => `'${m.name}'`)
    const eventMap = events
      .map((e) => `'${e.name}': '${e.reactProp ?? `on${kebabToCamel(`-${e.name}`)}`}'`)
      .join(', ')

    body.push(`export const ${name} = createComponent<${declaration.name}, ${propsName}>({`)
    body.push(`  events: { ${eventMap} },`)
    body.push(`  properties: [${propertyNames.join(', ')}],`)
    body.push(`  tagName: '${declaration.tagName}',`)
    body.push('})')
    body.push('')
    elementImports.add(declaration.name)
    exported.push({ name, part, propsName })
  }

  body.push(`/**`)
  body.push(` * ${group}, as a composition namespace.`)
  body.push(` *`)
  body.push(
    ` * \`${group}.Root\`${exported.length > 1 ? `, \`${group}.${exported[1].part}\`` : ''} and so on. The system is built around`,
  )
  body.push(` */`)
  body.push(`export const ${group} = {`)
  for (const { name, part } of exported) {
    body.push(`  ${part}: ${name},`)
  }
  body.push('} as const')
  body.push('')

  // Imports are assembled last because the event types are only known after
  // every part has been emitted.
  const header = [
    // Wrappers use hooks to attach listeners and assign properties, so the
    // React Server Components boundary puts them on the client. Without this
    // an App Router build fails outright rather than degrading.
    "'use client'",
    '',
    '// Generated by `bun run generate`. Do not edit.',
    "import { createComponent, type BaseProps } from '../create-component.js'",
    // Element classes are imported for the `ref` type, event classes for the
    // callback signature. Both come from the tier that ships them.
    `import type { ${[...elementImports].sort().join(', ')} } from '${sourcePackage}'`,
    '',
  ]

  const file = `${group.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}.ts`
  writeFileSync(join(OUT, file), `${[...header, ...body].join('\n')}`)
  files.push({
    file: file.replace(/\.ts$/, ''),
    group,
    names: exported.map((e) => e.name),
    types: exported.map((e) => e.propsName),
  })
}

writeFileSync(
  join(OUT, 'index.ts'),
  `// Generated by \`bun run generate\`. Do not edit.\n${files
    .map(
      ({ file, group, names, types }) =>
        `export { ${[group, ...names].join(', ')}${types.map((t) => `, type ${t}`).join('')} } from './${file}.js'`,
    )
    .join('\n')}\n`,
)

// Format the output with the same tool that checks it. Without this, every
// build rewrites these files unformatted and `biome ci` fails on a tree that
// `bun run check` had just cleaned, so generate and check permanently disagree.
execFileSync('bunx', ['biome', 'check', '--write', '--no-errors-on-unmatched', OUT], {
  cwd: join(PACKAGE, '..', '..'),
  stdio: 'ignore',
})

console.log(`generated ${files.length} component families: ${files.map((f) => f.group).join(', ')}`)
