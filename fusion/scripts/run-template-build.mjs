#!/usr/bin/env bun
/**
 * Scaffolds every template with `helix new`, installs it from freshly packed
 * tarballs, and runs its own `build`.
 *
 * **`smoke:template` asks whether the packages install; this asks whether a
 * project does.** A template carries dependencies of its own, a framework, a
 * bundler and a TypeScript, and nothing else here installs them, so a template
 * could ship not building while every check passed. Measured on 14 Sep 2026:
 * the Next.js template imported `./helix-elements.js`, which Turbopack does not
 * map back to `.tsx`, and neither template declared `@types/react`, so both
 * failed their first `build` on a fresh project and had since they were
 * written. A dependency bot bumping a template's framework was reviewed against
 * a green CI that had never built one.
 *
 * **Through `helix new`, not a copy.** The scaffolder is what a consumer runs,
 * and it is the part that fills the placeholders, so copying the directory would
 * test a project nobody gets.
 *
 * **Every published package is packed and every one is an override**, so the
 * `@fusion.dev` dependencies a template names, and the ones they name in turn,
 * resolve to this tree rather than to a registry holding an older version or
 * none at all. The framework and its tooling come from the registry, which is
 * the point: they are what a bump changes.
 *
 * Run `bun run build` and `bun run analyze` first; the tarballs are packed from
 * `dist`.
 *
 *   bun fusion/scripts/run-template-build.mjs              every template
 *   bun fusion/scripts/run-template-build.mjs react-vite   one of them
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { manifests, publishes, root } from '@fusion.dev/scripts/workspace'

const only = process.argv.slice(2).find((argument) => !argument.startsWith('--'))

const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

const scratch = mkdtempSync(join(tmpdir(), 'helix-scaffold-'))
const tarballs = join(scratch, 'tarballs')
mkdirSync(tarballs)

/* A platform package holds a binary the release places, so there is nothing in
   it to pack and nothing a template imports. */
const overrides = {}
for (const [name, { directory, manifest }] of manifests()) {
  if (!name.startsWith('@fusion.dev/') || !publishes(manifest) || manifest.os !== undefined) {
    continue
  }
  const into = join(tarballs, name.replace('@', '').replace('/', '-'))
  mkdirSync(into)
  run('bun', ['pm', 'pack', '--destination', into], join(root, directory))
  const [file] = readdirSync(into)
  overrides[name] = `file:${join(into, file)}`
}

const register = JSON.parse(readFileSync(join(root, 'helix/templates/templates.json'), 'utf8'))
const templates = register.templates
  .map((one) => one.id)
  .filter((id) => only === undefined || id === only)
if (templates.length === 0) {
  console.error(`templates: no template called \`${only}\`.`)
  process.exit(1)
}

const failed = []
for (const id of templates) {
  const project = join(scratch, id)
  run('bun', ['run', 'helix', 'new', 'meridian', '--template', id, '--into', project], root)

  const file = join(project, 'package.json')
  const manifest = JSON.parse(readFileSync(file, 'utf8'))
  for (const section of ['dependencies', 'devDependencies']) {
    for (const name of Object.keys(manifest[section] ?? {})) {
      if (overrides[name] !== undefined) {
        manifest[section][name] = overrides[name]
      }
    }
  }
  manifest.overrides = overrides
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)

  try {
    run('bun', ['install'], project)
    run('bun', ['run', 'build'], project)
    console.log(`  ${id}: installed and built`)
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim().split('\n').slice(-12)
    failed.push(`${id}\n    ${output.join('\n    ')}`)
    console.error(`  ${id}: failed`)
  }
}

if (failed.length > 0) {
  console.error(`\ntemplates: ${failed.length} did not build.\n\n  ${failed.join('\n\n  ')}\n`)
  process.exit(1)
}
console.log(
  `templates: ${templates.length} scaffolded by \`helix new\`, installed from packed tarballs, and built`,
)
