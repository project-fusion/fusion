#!/usr/bin/env node
/**
 * Installs the packages the way a consumer would, from outside the workspace.
 *
 * Every other check in this repository runs *inside* it, where bun links each
 * package from disk and every import resolves whatever the manifest says. That
 * is the one condition under which packaging faults cannot be seen. A missing
 * `files` entry, a subpath declared in `exports` that points at a file the build
 * does not emit, a `types` written after `default`, a `workspace:*` that was
 * never rewritten: all of them work here, all of them are a broken install
 * somewhere else, and the first report is from whoever tried to use it.
 *
 * So this packs what would be published, installs the tarballs into a scratch
 * project **outside the repository**, and asks the questions a consumer's build
 * asks:
 *
 * - **Does every declared export resolve to a file that exists?** Wildcards are
 *   expanded against what actually shipped rather than assumed, because `./*`
 *   claiming every subdirectory of `dist` is exactly the claim that goes stale.
 * - **Does TypeScript see types, from outside?** Run against the installed
 *   packages under `bundler` resolution, which is what a consumer's build uses.
 *
 *   Measured, so that it is not claimed to catch more than it does: reversing
 *   `types` and `default` in an `exports` condition does *not* fail here. When
 *   no `types` condition matches, TypeScript falls back to a declaration file
 *   sitting beside the JavaScript it resolved, and `tsc` emits `index.d.ts`
 *   next to `index.js` for every package in this repo. The ordering rule is
 *   still right and is still
 *   enforced by `fusion workspace`'s `publishable`, but it is fatal only where declarations do
 *   not sit beside their runtime files, which is a build layout we do not have.
 *   What this catches is a subpath that resolves to nothing at all.
 * - **Did anything unpublished come along?** A published package depending on an
 *   internal one 404s here rather than in someone's CI.
 *
 * Outside the repository matters and is not incidental. A scratch directory
 * inside it is matched by the root `workspaces` globs, so bun would link the
 * source packages straight back in and every one of these questions would be
 * answered by the thing being tested.
 *
 * The browser smoke (`bun run smoke:examples`) is the other half and is not replaced:
 * it renders every example and can say a component throws on upgrade. It runs
 * against source. This runs against the tarball.
 *
 * **Two sources, same questions.** By default it packs the working tree, which
 * is the pre-flight: a version cannot be unpublished, so the tarball is
 * interrogated before it leaves. Given `--registry-tag next` it installs the
 * published packages instead, which is the staging test proper: whatever
 * promotion is about to point `latest` at, asked from the outside, over the
 * network, exactly as a consumer would get it.
 *
 *   bun run smoke:template
 *   bun run smoke:template --domain helix --registry-tag next
 */
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { domainOf, manifests, publishes, root } from '@fusion.dev/scripts/workspace'

const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

const argument = (name) => {
  const at = process.argv.indexOf(`--${name}`)
  return at === -1 ? undefined : process.argv[at + 1]
}

const only = argument('domain')
const registryTag = argument('registry-tag')

const published = [...manifests()].filter(
  ([name, { manifest }]) =>
    domainOf(name) !== undefined &&
    publishes(manifest) &&
    (only === undefined || domainOf(name) === only),
)

/* Packed first, into the scratch tree, so nothing is written into the repo. */
const scratch = mkdtempSync(join(tmpdir(), 'helix-template-'))
const tarballs = join(scratch, 'tarballs')
mkdirSync(tarballs)

const problems = []
const packed = []
const dependencies = {}

/* One directory per package, so the tarball is found rather than named. `bun pm
   pack` derives the filename from the scope, the name and the version, and a
   guess at it would be a second copy of that rule. */
for (const [name, { directory }] of registryTag === undefined ? published : []) {
  if (!existsSync(join(root, directory, 'dist')) && !existsSync(join(root, directory, 'src'))) {
    problems.push(`${directory}: nothing to pack. Run \`bun run build\` first.`)
    continue
  }
  const into = join(tarballs, name.replace('@', '').replace('/', '-'))
  mkdirSync(into, { recursive: true })
  try {
    run('bun', ['pm', 'pack', '--destination', into], join(root, directory))
  } catch (error) {
    problems.push(`${directory}: \`bun pm pack\` failed.\n${error.stderr ?? error.message}`)
    continue
  }
  const [file] = readdirSync(into)
  if (file === undefined) {
    problems.push(`${directory}: packed nothing.`)
    continue
  }
  dependencies[name] = `file:${join(into, file)}`
  packed.push(name)
}

if (problems.length > 0) {
  console.error(`Could not pack (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}

/* The consumer. Nothing in it is a workspace of anything. */
/* From the registry the dependency is the published range, and the tarballs are
   not built at all: the point is to ask for exactly what a consumer would get. */
if (registryTag !== undefined) {
  for (const [name] of published) {
    dependencies[name] = registryTag
    packed.push(name)
  }
}

const project = join(scratch, 'project')
mkdirSync(project)

/* Restricted packages need credentials, and the scratch project is outside the
   repository precisely so that it inherits nothing. Without this the install
   404s and the failure reads as "the package did not ship" rather than "you are
   not logged in", which is the most expensive kind of wrong error message.
   Written into the project rather than relying on `$HOME/.npmrc` being found,
   so this behaves the same in CI and on a laptop. */
if (registryTag !== undefined && process.env.NODE_AUTH_TOKEN) {
  writeFileSync(
    join(project, '.npmrc'),
    `//registry.npmjs.org/:_authToken=${process.env.NODE_AUTH_TOKEN}\n`,
  )
}
writeFileSync(
  join(project, 'package.json'),
  `${JSON.stringify(
    {
      dependencies,
      name: 'template',
      ...(registryTag === undefined ? { overrides: dependencies } : {}),
      private: true,
      type: 'module',
      version: '0.0.0',
    },
    null,
    2,
  )}\n`,
)

try {
  run('bun', ['install'], project)
} catch (error) {
  if (registryTag !== undefined && !process.env.NODE_AUTH_TOKEN) {
    console.error(
      'The published packages did not install, and no `NODE_AUTH_TOKEN` was set. These packages ' +
        'are restricted, so an unauthenticated install 404s exactly as a missing package would. ' +
        'Log in, or set the token, before reading this as a packaging fault.\n',
    )
  }
  console.error('The packages do not install together.\n')
  console.error(error.stdout ?? '')
  console.error(error.stderr ?? '')
  console.error(
    '\nA published package depending on one that is not published fails exactly here, ' +
      'which is the point: inside the workspace bun links it from disk and it resolves.',
  )
  process.exit(1)
}

/**
 * Every subpath a package publishes, resolved against what actually shipped.
 *
 * A wildcard is not enumerable from the pattern alone: `./*` mapping to
 * `./dist/*&#47;index.d.ts` claims a subpath per *directory* under `dist`, and
 * `./content/*` claims one per file. Guessing which from the shape of the entry
 * invents subpaths that were never exported, so each candidate is substituted
 * back into the target and kept only if the file it names is really there.
 */
function exported(installed, exports) {
  if (exports === undefined || typeof exports === 'string') {
    return [{ file: undefined, subpath: '.' }]
  }
  const keys = Object.keys(exports)
  if (keys.some((key) => !key.startsWith('.'))) {
    /* Conditions at the top level: the package exports its root and nothing else. */
    return [{ file: undefined, subpath: '.' }]
  }

  const found = []
  for (const key of keys) {
    const target = exports[key]
    const pattern = typeof target === 'string' ? target : (target?.types ?? target?.default)
    if (typeof pattern !== 'string') {
      continue
    }
    if (!key.includes('*')) {
      found.push({ file: pattern, subpath: key })
      continue
    }

    const prefix = pattern.split('*')[0]
    const base = join(installed, prefix.endsWith('/') ? prefix : dirname(prefix))
    if (!existsSync(base)) {
      continue
    }
    for (const entry of readdirSync(base)) {
      if (entry.startsWith('.')) {
        continue
      }
      const stems = [entry, entry.replace(/\.d\.ts$|\.[^.]+$/, '')]
      for (const stem of [...new Set(stems)]) {
        const file = pattern.replaceAll('*', stem)
        if (existsSync(join(installed, file))) {
          found.push({ file, subpath: key.replaceAll('*', stem) })
          break
        }
      }
    }
  }
  return found
}

const imports = []
for (const name of packed) {
  const installed = join(project, 'node_modules', name)
  if (!existsSync(installed)) {
    problems.push(`${name}: installed nothing. The tarball is not what the manifest describes.`)
    continue
  }
  const manifest = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'))

  for (const field of ['dependencies', 'peerDependencies']) {
    for (const [dependency, range] of Object.entries(manifest[field] ?? {})) {
      if (String(range).startsWith('workspace:')) {
        problems.push(
          `${name}: ships \`${dependency}: ${range}\` in ${field}. The workspace protocol was ` +
            'never rewritten, so this cannot install anywhere but here.',
        )
        continue
      }
      /* `bun pm pack` reads a sibling's version from `bun.lock`, not from that
         sibling's manifest, so a release that stamps the manifests and packs
         without reinstalling pins every sibling at the previous version. It is
         silent, it is a broken install for everyone, and it looks exactly like
         a correct tarball from the inside. Lockstep is what makes it checkable:
         within a domain the two versions are one number, or the release is wrong. */
      if (domainOf(dependency) === domainOf(name) && range !== manifest.version) {
        problems.push(
          `${name}@${manifest.version} pins \`${dependency}@${range}\`, which is not the version ` +
            'being published. Lockstep says these are one number. `bun pm pack` takes it from ' +
            '`bun.lock`, so the release stamped the manifests and packed without running ' +
            '`bun install` in between.',
        )
      }
    }
  }

  for (const { file, subpath } of exported(installed, manifest.exports)) {
    if (file !== undefined && !existsSync(join(installed, file))) {
      problems.push(
        `${name}: exports \`${subpath}\` as \`${file}\`, which did not ship. Declared in ` +
          '`exports` and missing from `files`, most likely.',
      )
      continue
    }
    /* Only what TypeScript can be asked about. Content and stylesheets are
       resolved by a bundler, and their existence above is the whole check. */
    if (file === undefined || /\.(m?js|m?ts|d\.ts)$/.test(file)) {
      imports.push(subpath === '.' ? name : `${name}/${subpath.slice(2)}`)
    }
  }
}

/* TypeScript is what reads `exports` conditions in order, so it is what fails
   on a `types` written after `default`. Nothing else in CI asks from outside. */
writeFileSync(
  join(project, 'probe.ts'),
  `${imports.map((specifier, index) => `import * as m${index} from '${specifier}'`).join('\n')}\n` +
    `export const loaded = [${imports.map((_, index) => `m${index}`).join(', ')}]\n`,
)
writeFileSync(
  join(project, 'tsconfig.json'),
  `${JSON.stringify(
    {
      compilerOptions: {
        module: 'esnext',
        moduleResolution: 'bundler',
        noEmit: true,
        skipLibCheck: true,
        strict: true,
        target: 'es2022',
        types: [],
      },
      include: ['probe.ts'],
    },
    null,
    2,
  )}\n`,
)

try {
  run('bunx', ['--bun', 'tsc', '-p', 'tsconfig.json'], project)
} catch (error) {
  problems.push(
    'TypeScript cannot resolve the installed packages the way a consumer would:\n' +
      `${(error.stdout ?? error.message).trim().split('\n').join('\n    ')}`,
  )
}

if (problems.length > 0) {
  console.error(`The published packages do not work when installed (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  console.error(`  Scratch project left at ${project}\n`)
  process.exit(1)
}
console.log(
  `template: ${packed.length} packages installed from ` +
    (registryTag === undefined ? 'freshly packed tarballs' : `the registry at \`${registryTag}\``) +
    `, outside the workspace, ${imports.length} exported subpaths resolve with types`,
)
