#!/usr/bin/env node
/**
 * `cortex` for a caller that installed it through npm.
 *
 * **A near-copy of `helix/cli/npm/bin.mjs`, deliberately.** Sharing it would
 * put a file in the helix domain on the publish path of a cortex package, and
 * per-domain lockstep exists so a release of either does not wait on the other.
 *
 * **Resolution order.** `CORTEX_BIN` first, because a caller that knows better
 * should not have to argue. Then, in a checkout, the newest build in the cargo
 * target directory, honoring `CARGO_TARGET_DIR`. Then the binary npm installed
 * beside this, which is what a consumer has. Then a `cortex` on `PATH` whose
 * `cortex --version --json` names this package, since another program can
 * share the name. Then, in a checkout with cargo, one build. Otherwise it says
 * what is missing.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, realpathSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CRATE = resolve(HERE, '..')
const WORKSPACE = resolve(CRATE, '../..')
const NAME = process.platform === 'win32' ? 'cortex.exe' : 'cortex'
const PACKAGE = '@fusion.dev/cortex-cli'

const target = process.env.CARGO_TARGET_DIR
  ? resolve(process.env.CARGO_TARGET_DIR)
  : join(WORKSPACE, 'target')

/**
 * The most recently built binary, or undefined. By modification time, so a
 * release build from last week does not shadow the debug build from a minute
 * ago: `helix/cli/npm/bin.mjs` measured that trap.
 */
const built = () =>
  [join(target, 'release', NAME), join(target, 'debug', NAME)]
    .filter((path) => existsSync(path))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
    .at(0)

/** The platform package for this machine, named as they are published. */
const PLATFORM = `${PACKAGE}-${process.platform}-${process.arch}`

/**
 * The binary in this machine's platform package, or undefined. npm installs
 * only the optional dependency whose `os` and `cpu` match, and it is resolved
 * as a module so it is found wherever the package manager put it.
 */
const packaged = () => {
  let manifest
  try {
    manifest = createRequire(import.meta.url).resolve(`${PLATFORM}/package.json`)
  } catch {
    return undefined
  }
  const binary = join(dirname(manifest), NAME)
  return existsSync(binary) ? binary : undefined
}

/** Whether this is the repository's own copy, where there is a crate to build. */
const checkout = existsSync(join(CRATE, 'Cargo.toml'))

/** Whether cargo is on the path. */
const hasCargo = () => spawnSync('cargo', ['--version'], { stdio: 'ignore' }).status === 0

/** This file, resolved, which a `PATH` entry must not be. */
const SELF = realpathSync(fileURLToPath(import.meta.url))

/**
 * Each `cortex` on `PATH`, in order, resolved through its symlinks.
 *
 * **Walked and never spawned by name.** `node_modules/.bin/cortex` is a
 * symlink to this file, so asking `PATH` to run `cortex` can run this shim
 * again, which asks again: `helix/cli/npm/bin.mjs` measured 4,871 processes
 * before the machine stopped forking.
 */
function* onPath() {
  const extensions = process.platform === 'win32' ? ['', '.exe', '.cmd', '.bat'] : ['']
  const seen = new Set()
  for (const directory of (process.env.PATH ?? '').split(delimiter)) {
    if (directory === '') {
      continue
    }
    for (const extension of extensions) {
      const candidate = join(directory, NAME + extension)
      if (!existsSync(candidate)) {
        continue
      }
      let real
      try {
        real = realpathSync(candidate)
      } catch {
        continue
      }
      if (real === SELF || seen.has(real)) {
        continue
      }
      seen.add(real)
      yield real
    }
  }
}

/**
 * Set while this shim asks a `PATH` entry for `--version --json`, so a copy of
 * this shim asked that way never searches `PATH` itself.
 */
const PROBE = 'CORTEX_SHIM_PROBE'

/**
 * Whether `binary` is this command line: its `--version --json` names this
 * package. Another program named `cortex` exits with an error or prints
 * something else.
 */
const ours = (binary) => {
  const asked = spawnSync(binary, ['--version', '--json'], {
    encoding: 'utf8',
    env: { ...process.env, [PROBE]: '1' },
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 2_000,
  })
  try {
    return JSON.parse(asked.stdout ?? '').package === PACKAGE
  } catch {
    return false
  }
}

const run = (binary) => {
  const { status, error } = spawnSync(binary, process.argv.slice(2), { stdio: 'inherit' })
  /* A status means it ran. Bun sets `error` on any exit but zero, so asking
     `error` alone would report every failed command as one that did not
     start. */
  if (error && status === null) {
    console.error(`cortex: could not run \`${binary}\`: ${error.message}`)
    process.exit(70)
  }
  process.exit(status ?? 70)
}

const found = process.env.CORTEX_BIN ?? (checkout ? built() : undefined) ?? packaged()
if (found && existsSync(found)) {
  run(found)
}

const skipped = []
for (const candidate of process.env[PROBE] === undefined ? onPath() : []) {
  if (ours(candidate)) {
    run(candidate)
  }
  skipped.push(candidate)
}

/** The `cortex` binaries on `PATH` that are some other program, named. */
const foreign = () =>
  skipped.length === 0
    ? ''
    : `\n\n  Not run, from PATH: ${skipped.map((path) => `\`${path}\``).join(', ')}.\n` +
      `  Its \`--version --json\` does not name \`${PACKAGE}\`, so it is another program.`

if (!checkout) {
  console.error(
    `cortex: no binary for ${process.platform} ${process.arch}.\n\n` +
      `  It comes in \`${PLATFORM}\`, an optional dependency of\n` +
      `  \`${PACKAGE}\`, and it is not installed. Either this machine is not\n` +
      '  one there is a build for, or the install skipped optional dependencies\n' +
      '  (`--omit=optional`, `--no-optional`), in which case install again without it.\n' +
      `  \`CORTEX_BIN\` names a binary to run instead.${foreign()}`,
  )
  process.exit(69)
}

if (!hasCargo()) {
  console.error(
    'cortex: no binary and no cargo.\n\n' +
      `  Looked at: $CORTEX_BIN, ${join(target, 'release', NAME)},\n` +
      `             ${join(target, 'debug', NAME)}, and \`${NAME}\` on PATH.\n\n` +
      '  Either point `CORTEX_BIN` at a binary, or install a Rust toolchain so\n' +
      `  this can build it.${foreign()}`,
  )
  process.exit(69)
}

console.error('cortex: no binary yet, building it once (cargo build -p fusion-cortex-cli)')
const build = spawnSync('cargo', ['build', '-p', 'fusion-cortex-cli'], {
  cwd: WORKSPACE,
  stdio: 'inherit',
})
if (build.status !== 0) {
  console.error('cortex: the build failed, so there is nothing to run.')
  process.exit(build.status ?? 70)
}
const after = built()
if (!after) {
  console.error(
    `cortex: cargo reported success and produced no \`${NAME}\` under ${target}.\n` +
      '  That usually means a different target directory. Try `CARGO_TARGET_DIR`.',
  )
  process.exit(70)
}
run(after)
