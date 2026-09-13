#!/usr/bin/env node
/**
 * `helix` for a caller that reaches it through npm rather than through cargo.
 *
 * **A near-copy of `fusion/cli/npm/bin.mjs`, deliberately.** Sharing it would
 * put a file in the fusion domain on the publish path of a helix package, and
 * per-domain lockstep exists so a release of either does not wait on the other.
 * It is the same trade the two `Rule` types make, for the same reason.
 *
 * **The binary is Rust and half this repository is not**, so the checks that
 * call it are `bun run` lines in a manifest and the people running them have
 * node on their path and may not have cargo. This resolves a built binary,
 * builds one if it can, and says exactly what is missing if it cannot.
 *
 * **Resolution order, and each step is there for a reason.** `HELIX_BIN` first,
 * because a caller that knows better should not have to argue. Then the cargo
 * target directory, release before debug, honoring `CARGO_TARGET_DIR` because a
 * shared target is common and guessing `./target` would miss it. Then the
 * binary npm installed beside this, which is what a consumer has: after the
 * target, so a checkout runs what it built rather than a binary a release once
 * placed. Then whatever is on `PATH`. Only then a build, and only in this
 * repository, the one place there is a crate to build.
 *
 * **A build is a fallback and not the plan.** It happens once, prints that it
 * is happening, and a CI pipeline that has already run `cargo build` never
 * reaches it. What it replaces is the failure this shim exists to prevent: a
 * check that dies with `spawn fusion ENOENT` and tells a reader nothing about
 * which of the four possible causes they have.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, realpathSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CRATE = resolve(HERE, '..')
const WORKSPACE = resolve(CRATE, '../..')
const NAME = process.platform === 'win32' ? 'helix.exe' : 'helix'

const target = process.env.CARGO_TARGET_DIR
  ? resolve(process.env.CARGO_TARGET_DIR)
  : join(WORKSPACE, 'target')

/**
 * The most recently built binary, or undefined.
 *
 * **By modification time, not by profile.** Preferring release outright is the
 * obvious rule and it is a trap on a development machine: one `cargo build
 * --release` leaves an artifact that shadows every `cargo build` after it, so a
 * rule added an hour ago is not there and the command reports a smaller, older
 * truth without saying anything is wrong. Measured: a release binary two commits
 * behind reported nine rules against the debug build's twelve, and one of them
 * as counting nothing. On a CI runner only one profile exists and this is the
 * same answer either way.
 */
const built = () =>
  [join(target, 'release', NAME), join(target, 'debug', NAME)]
    .filter((path) => existsSync(path))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
    .at(0)

/**
 * The platform package npm installed for this machine, named as they are
 * published: `@fusion.dev/helix-cli-darwin-arm64` and the rest.
 */
const PLATFORM = `@fusion.dev/helix-cli-${process.platform}-${process.arch}`

/**
 * The binary in this machine's platform package, or undefined.
 *
 * **One of several optional dependencies, and npm installs only the one whose
 * `os` and `cpu` match**, which is how Biome and esbuild ship a native binary
 * without a download of their own. Resolved as a module, so it is found
 * wherever the package manager put it, hoisted or not.
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

/** Whether cargo is on the path, asked once and cheaply. */
const hasCargo = () => spawnSync('cargo', ['--version'], { stdio: 'ignore' }).status === 0

/** This file, resolved, which is what the `PATH` entry has to not be. */
const SELF = realpathSync(fileURLToPath(import.meta.url))

/**
 * The first `helix` on `PATH`, resolved through its symlinks, or undefined.
 *
 * **Walked rather than spawned, because the spawn is the bug.** Probing with
 * `spawnSync('helix', ['--version'])` asks `PATH` to answer, and under
 * `bun run` the first answer is `node_modules/.bin/helix`, which is a symlink
 * to this file: the probe ran this shim, which had no built binary either, so
 * it probed `PATH` again. Nothing returns and nothing errors, because every
 * level is waiting on the level below it. Measured on a checkout with no
 * `target/`: 4,871 node processes before the machine stopped forking.
 *
 * `built()` answering first is why this was never seen. Any tree that has run
 * `cargo build` once takes the branch above and never reaches here, so the
 * trap is set for a fresh clone, which is what CI and a new contributor both
 * are.
 */
const onPath = () => {
  const extensions = process.platform === 'win32' ? ['', '.exe', '.cmd', '.bat'] : ['']
  for (const directory of (process.env.PATH ?? '').split(delimiter)) {
    if (directory === '') {
      continue
    }
    for (const extension of extensions) {
      const candidate = join(directory, NAME + extension)
      if (!existsSync(candidate)) {
        continue
      }
      /* Through the symlink, so `node_modules/.bin/helix` is recognized as
         this file rather than as an installed binary that happens to share a
         name. A path that cannot be resolved is not one to hand to `spawn`. */
      let real
      try {
        real = realpathSync(candidate)
      } catch {
        continue
      }
      /* Skipped and not given up on: an entry earlier in `PATH` being this file
         says nothing about a real one later in it, and returning here would
         make an installed binary invisible whenever a checkout was in front of
         it. */
      if (real === SELF) {
        continue
      }
      return real
    }
  }
  return undefined
}

const run = (binary) => {
  const { status, error } = spawnSync(binary, process.argv.slice(2), { stdio: 'inherit' })
  /* A status means it ran. Bun sets `error` on any exit but zero, to a
     `SystemError` reading "null", so asking `error` alone reported every failed
     check as a binary that would not start, and exited 70 for its 1. */
  if (error && status === null) {
    console.error(`helix: could not run \`${binary}\`: ${error.message}`)
    process.exit(70)
  }
  process.exit(status ?? 70)
}

const found = process.env.HELIX_BIN ?? built() ?? packaged()
if (found && existsSync(found)) {
  run(found)
}

/* `PATH`, which is what an installed binary looks like. Resolved rather than
   probed: see `onPath`, where the probe this used to do is what recursed. */
const installed = onPath()
if (installed) {
  run(installed)
}

/* Installed from the registry, with no platform package for this machine. A
   build would be `cargo build` in somebody else's project, for a crate that is
   not in it. */
if (!checkout) {
  console.error(
    `helix: no binary for ${process.platform} ${process.arch}.\n\n` +
      `  It comes in \`${PLATFORM}\`, an optional dependency of\n` +
      '  `@fusion.dev/helix-cli`, and it is not installed. Either this machine is not\n' +
      '  one there is a build for, or the install skipped optional dependencies\n' +
      '  (`--omit=optional`, `--no-optional`), in which case install again without it.\n' +
      '  `HELIX_BIN` names a binary to run instead.',
  )
  process.exit(69)
}

if (!hasCargo()) {
  console.error(
    'helix: no binary and no cargo.\n\n' +
      `  Looked at: $HELIX_BIN, ${join(target, 'release', NAME)},\n` +
      `             ${join(target, 'debug', NAME)}, and \`${NAME}\` on PATH.\n\n` +
      '  Either install the binary, point `HELIX_BIN` at one, or install a Rust\n' +
      '  toolchain so this can build it.',
  )
  process.exit(69)
}

console.error('helix: no binary yet, building it once (cargo build -p fusion-helix-cli)')
const build = spawnSync('cargo', ['build', '-p', 'fusion-helix-cli'], {
  cwd: WORKSPACE,
  stdio: 'inherit',
})
if (build.status !== 0) {
  console.error('helix: the build failed, so there is nothing to run.')
  process.exit(build.status ?? 70)
}

const after = built()
if (!after) {
  console.error(
    `helix: cargo reported success and produced no \`${NAME}\` under ${target}.\n` +
      '  That usually means a different target directory. Try `CARGO_TARGET_DIR`.',
  )
  process.exit(70)
}
run(after)
