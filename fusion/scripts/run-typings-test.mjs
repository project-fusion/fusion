#!/usr/bin/env bun
/**
 * Type-checks a project per framework against the framework typings Helix
 * ships, installed from packed tarballs, with `skipLibCheck` off.
 *
 * **The typings are generated text, and a regex over generated text cannot say
 * whether a framework accepts it.** `@fusion.dev/helix-cem` writes `jsx.d.ts`,
 * `vue.d.ts`, and `svelte.d.ts` from the manifest and corrects the generators'
 * output with a chain of plugins, and its specs hold the text to patterns. These
 * projects hold it to the checkers a consumer runs: `tsc` for React, Preact,
 * and Solid, `vue-tsc` for Vue, and `svelte-check` for Svelte.
 *
 * **Each project writes the bad usage beside the good.** A wrong enum value, a
 * misspelled prop or event, a wrong `detail` field read in a handler, a word
 * for a numeric attribute, an `@internal` member, and a removed name each sit
 * under a guard: `@ts-expect-error` in TypeScript, `@vue-expect-error` in a
 * Vue template, and `@expect-error` in Svelte markup, where `svelte-check`
 * honors no directive at all.
 *
 * **This script judges the guards, and not the checker.** Every guard is
 * renamed to a comment no checker reads, the project is checked once, and each
 * error is matched to the line it is on. A guarded line must raise an error and
 * every other line must raise none. That is what `@ts-expect-error` means, held
 * the same way in all five checkers, Svelte's markup included. `--list` prints
 * each guarded line with the error it raises.
 *
 * The projects live in `helix/cem/typings` and are copied outside the
 * repository to install, for the reason `run-template-test.mjs` gives: inside
 * it, the root `workspaces` globs link the source packages back in.
 *
 * Run `bun run build` and `bun run analyze` first; the tarballs are packed from
 * `dist`, and `files` names the typings `analyze` writes. `smoke:typings` does
 * both.
 *
 *   bun run smoke:typings               every project
 *   bun run smoke:typings vue           one project
 *   bun run smoke:typings --list        every guarded line, with its error
 *   bun fusion/scripts/run-typings-test.mjs --touched <base>
 *                                       whether a change since <base> reaches the typings
 */
import { execFile, execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { promisify } from 'node:util'
import { argument, flag } from '@fusion.dev/scripts/argv'
import { manifests, publishes, root } from '@fusion.dev/scripts/workspace'

const PROJECTS = join(root, 'helix/cem/typings')

/** A guard, in whichever comment holds it. */
const GUARD = /@(ts-|vue-)?expect-error\b/g

/** What a guard is renamed to before the check, a word no checker reads. */
const UNGUARDED = '@unguarded'

/** A line holding nothing a checker reports on, which a guard reaches past. */
const BLANK = /^\s*(\/\/|\/\*|\{\/\*|<!--|$)/

const list = flag('list')
const touched = argument('touched')

const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const runAsync = promisify(execFile)

const named = readdirSync(PROJECTS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
const only =
  touched === undefined
    ? process.argv.slice(2).find((argument) => !argument.startsWith('--'))
    : undefined
if (only !== undefined && !named.includes(only)) {
  console.error(`typings: no project called \`${only}\`. There are: ${named.join(', ')}.`)
  process.exit(1)
}
const projects = named.filter((id) => only === undefined || id === only)

/** A project's `package.json`, as it is in the repository. */
const manifestOf = (id) => JSON.parse(readFileSync(join(PROJECTS, id, 'package.json'), 'utf8'))

/* The packages a project names, and every workspace package they depend on in
   turn, each packed once and each an override, so a dependency resolves to
   this tree and never to a registry holding an older version or none. Only
   these are packed, so `smoke:typings` builds only these. */
const workspace = manifests()
const wanted = projects.flatMap((id) =>
  Object.keys(manifestOf(id).dependencies ?? {}).filter((name) => workspace.has(name)),
)
const packing = new Set()
while (wanted.length > 0) {
  const name = wanted.pop()
  if (packing.has(name)) {
    continue
  }
  packing.add(name)
  const { dependencies = {}, peerDependencies = {} } = workspace.get(name).manifest
  wanted.push(
    ...Object.keys({ ...dependencies, ...peerDependencies }).filter((dependency) =>
      workspace.has(dependency),
    ),
  )
}

/* **`--touched <base>` answers whether a change can reach the typings**, as
   `true` or `false`, for `verify.yml` to decide whether to run this. The
   reach is what the typings are written from and what judges them: the
   packages packed above, the generators in `helix/cem` with these projects,
   the manifest builder, and this file. Derived from the same set the run
   packs, so a package the projects come to depend on is covered the day they
   do. An unresolvable base reaches everything. */
if (touched !== undefined) {
  const reach = [
    ...[...packing].map((name) => `${workspace.get(name).directory}/`),
    'helix/cem/',
    'helix/cli/src/manifest/',
    relative(root, import.meta.filename),
  ]
  let changed
  try {
    changed = run('git', ['diff', '--name-only', touched, 'HEAD'], root).split('\n')
  } catch {
    console.log('true')
    process.exit(0)
  }
  console.log(String(changed.some((path) => reach.some((prefix) => path.startsWith(prefix)))))
  process.exit(0)
}

const scratch = mkdtempSync(join(tmpdir(), 'helix-typings-'))
const tarballs = join(scratch, 'tarballs')
mkdirSync(tarballs)

const overrides = {}
for (const name of [...packing].sort()) {
  const { directory, manifest } = workspace.get(name)
  if (!publishes(manifest)) {
    console.error(`typings: \`${name}\` is not published, so no consumer can install it.`)
    process.exit(1)
  }
  const into = join(tarballs, name.replace('@', '').replace('/', '-'))
  mkdirSync(into)
  run('bun', ['pm', 'pack', '--destination', into], join(root, directory))
  const [file] = readdirSync(into)
  overrides[name] = `file:${join(into, file)}`
}

/** Every file in a project that a checker reads, relative to the project. */
const sources = (directory, at = directory) =>
  readdirSync(at, { withFileTypes: true }).flatMap((entry) => {
    const path = join(at, entry.name)
    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : sources(directory, path)
    }
    return /\.(ts|tsx|vue|svelte)$/.test(entry.name) ? [relative(directory, path)] : []
  })

/**
 * Takes the guards out of a project's files, and returns each as the file, the
 * one-based line it guards, and the reason written after it. The guarded line
 * is the next one holding code, as it is for `@ts-expect-error`.
 */
const unguard = (project) =>
  sources(project).flatMap((file) => {
    const path = join(project, file)
    const text = readFileSync(path, 'utf8')
    const lines = text.split('\n')
    const found = lines.flatMap((line, index) => {
      if (!line.match(GUARD)) {
        return []
      }
      let guarded = index + 1
      while (guarded < lines.length && BLANK.test(lines[guarded])) {
        guarded += 1
      }
      const reason = line
        .replace(/^.*@(ts-|vue-)?expect-error:?\s*/, '')
        .replace(/\s*(\*\/\}?|-->)\s*$/, '')
      return [{ file, line: guarded + 1, reason }]
    })
    if (found.length > 0) {
      writeFileSync(path, text.replaceAll(GUARD, UNGUARDED))
    }
    return found
  })

/**
 * The errors a checker printed, as file, one-based line, and message. `tsc`
 * and `vue-tsc` print `file(line,col): error TS…`, and `svelte-check` with
 * `--output machine` prints `… ERROR "file" line:col "message"`.
 */
const diagnostics = (output) => {
  const found = []
  for (const line of output.split('\n')) {
    const typescript = /^(.+?)\((\d+),\d+\): error (TS\d+: .*)$/.exec(line)
    if (typescript !== null) {
      found.push({ file: typescript[1], line: Number(typescript[2]), message: typescript[3] })
      continue
    }
    const svelte = /^\d+ (?:ERROR|WARNING) "(.+?)" (\d+):\d+ "(.*)"$/.exec(line)
    if (svelte !== null) {
      found.push({ file: svelte[1], line: Number(svelte[2]), message: svelte[3] })
    }
  }
  return found
}

/** Installs and checks one project, and says what failed, or nothing. */
const check = async (id) => {
  const project = join(scratch, id)
  cpSync(join(PROJECTS, id), project, {
    filter: (source) => !source.includes('node_modules'),
    recursive: true,
  })

  const file = join(project, 'package.json')
  const manifest = JSON.parse(readFileSync(file, 'utf8'))
  for (const name of Object.keys(manifest.dependencies ?? {})) {
    if (overrides[name] !== undefined) {
      manifest.dependencies[name] = overrides[name]
    }
  }
  manifest.overrides = overrides
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)

  try {
    await runAsync('bun', ['install'], { cwd: project, encoding: 'utf8' })
  } catch (error) {
    return `${id}: did not install.\n${error.stdout ?? ''}${error.stderr ?? ''}`
  }

  const guards = unguard(project)
  let output = ''
  try {
    const { stderr, stdout } = await runAsync('bun', ['run', 'check'], {
      cwd: project,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
    output = `${stdout}${stderr}`
  } catch (error) {
    output = `${error.stdout ?? ''}${error.stderr ?? ''}`
  }

  const errors = diagnostics(output)
  const on = (guard) => (error) => error.file.endsWith(guard.file) && error.line === guard.line
  const quiet = guards.filter((guard) => !errors.some(on(guard)))
  const stray = errors.filter((error) => !guards.some((guard) => on(guard)(error)))

  if (list) {
    const raised = guards.map((guard) => {
      const error = errors.find(on(guard))
      return `  ${guard.file}:${guard.line} ${guard.reason}\n    ${error?.message ?? 'no error'}`
    })
    console.log(`${id}: ${guards.length} guarded lines\n${raised.join('\n')}`)
  }

  /* No error anywhere is a checker that did not run, or typings that take
     anything, such as a tag typed `any`. Said as that, with what the checker
     printed, since each guard alone would read as one case that compiles. */
  if (errors.length === 0 && guards.length > 0) {
    return (
      `${id}: no line raised an error, so the checker did not run or the typings accept ` +
      `anything.\n${output.trim()}`
    )
  }
  if (quiet.length === 0 && stray.length === 0) {
    return undefined
  }
  return [
    `${id}:`,
    ...quiet.map(
      (guard) => `  ${guard.file}:${guard.line} compiles, and is guarded as ${guard.reason}`,
    ),
    ...stray.map((error) => `  ${error.file}:${error.line} ${error.message}`),
  ].join('\n')
}

const results = await Promise.all(projects.map((id) => check(id)))
const failures = results.filter((result) => result !== undefined)
if (failures.length > 0) {
  console.error(
    `\ntypings: ${failures.length} of ${projects.length} projects failed. A guarded line that ` +
      'compiles is bad usage the typings accept, and an error elsewhere is good usage they ' +
      `refuse.\n\n${failures.join('\n\n')}\n`,
  )
  console.error(`Scratch projects left at ${scratch}`)
  process.exit(1)
}
console.log(
  `typings: ${projects.length} projects installed from packed tarballs and type-checked with ` +
    `\`skipLibCheck\` off, every guarded line refused and nothing else: ${projects.join(', ')}`,
)
