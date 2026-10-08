#!/usr/bin/env node
/**
 * `proof` for a caller that reaches it through npm rather than through cargo.
 *
 * **A near-copy of `helix/cli/npm/bin.mjs`, deliberately.** Sharing it would
 * put a file in the helix domain on the publish path of a proof package, and
 * per-domain lockstep exists so a release of either does not wait on the other.
 * The reasoning for each step, and the measurements behind it, are in that file.
 *
 * **Resolution order.** `PROOF_BIN` first. Then the cargo target directory,
 * honoring `CARGO_TARGET_DIR`, newest build first. Then the binary npm
 * installed beside this, which is what a consumer has. Then whatever is on
 * `PATH`, named out loud in a checkout. Only then a build, and only in this
 * repository, the one place there is a crate to build.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, realpathSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CRATE = resolve(HERE, '..')
const WORKSPACE = resolve(CRATE, '../..')
const NAME = process.platform === 'win32' ? 'proof.exe' : 'proof'

const target = process.env.CARGO_TARGET_DIR
  ? resolve(process.env.CARGO_TARGET_DIR)
  : join(WORKSPACE, 'target')

/**
 * The most recently built binary, or undefined.
 *
 * **By modification time, not by profile.** One `cargo build --release` would
 * otherwise shadow every `cargo build` after it.
 */
const built = () =>
  [join(target, 'release', NAME), join(target, 'debug', NAME)]
    .filter((path) => existsSync(path))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
    .at(0)

/**
 * The platform package npm installed for this machine, named as they are
 * published: `@fusion.dev/proof-darwin-arm64` and the rest.
 */
const PLATFORM = `@fusion.dev/proof-${process.platform}-${process.arch}`

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
 * The first `proof` on `PATH`, resolved through its symlinks, or undefined.
 *
 * **Walked rather than spawned, because the spawn is the bug.** Under
 * `bun run` the first `proof` on `PATH` is `node_modules/.bin/proof`, a
 * symlink to this file, so a probe that spawned it would run this shim again
 * without end. `bin.spec.mjs` holds it.
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
      /* Through the symlink, so `node_modules/.bin/proof` is recognized as
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

/**
 * What the binary needs to start the capture driver: the runtime that ran this
 * shim, and the driver beside it. Set only where the caller has not set them,
 * so `PROOF_RUNTIME=node bun run proof` still means node.
 */
const DRIVER_ENV = {
  ...process.env,
  PROOF_DRIVER: process.env.PROOF_DRIVER ?? join(HERE, 'driver.mjs'),
  PROOF_RUNTIME: process.env.PROOF_RUNTIME ?? process.execPath,
}

const run = (binary) => {
  const { status, error } = spawnSync(binary, process.argv.slice(2), {
    env: DRIVER_ENV,
    stdio: 'inherit',
  })
  /* A status means it ran. Bun sets `error` on any exit but zero, to a
     `SystemError` reading "null", so asking `error` alone reported every failed
     check as a binary that would not start, and exited 70 for its 1. */
  if (error && status === null) {
    console.error(`proof: could not run \`${binary}\`: ${error.message}`)
    process.exit(70)
  }
  process.exit(status ?? 70)
}

/* **In this repository, cargo is asked first, and asking is cheap.** A binary
   under `target/` is whatever the last build left, so after an edit or a
   branch switch it would answer for a tree that is gone.

   **`--workspace`, the selection `rs:build` and CI build.** Cargo unifies
   features per selection, so a `-p` here would recompile on every switch
   between the two. */
if (process.env.PROOF_BIN === undefined && checkout && hasCargo()) {
  const fresh = spawnSync('cargo', ['build', '--workspace', '--quiet'], {
    cwd: WORKSPACE,
    stdio: 'inherit',
  })
  if (fresh.status !== 0) {
    console.error('proof: the build failed, so there is nothing current to run.')
    process.exit(fresh.status ?? 70)
  }
  const current = join(target, 'debug', NAME)
  if (existsSync(current)) {
    run(current)
  }
}

const found = process.env.PROOF_BIN ?? built() ?? packaged()
if (found && existsSync(found)) {
  run(found)
}

/* `PATH`, which is what an installed binary looks like. Resolved rather than
   probed: see `onPath`, where the probe this used to do is what recursed. */
const installed = onPath()
if (installed) {
  /* **In a checkout, say which binary this is before running it.** Getting here
     means no `target/`, no platform package and no cargo, so what runs was not
     built from this tree. For a consumer, a binary on `PATH` is the ordinary
     way to have one, so only a checkout is told. */
  if (checkout) {
    console.error(
      `proof: nothing built here, so running \`${installed}\` from PATH.\n` +
        '  It was not built from this checkout and need not agree with it.\n' +
        '  Install a Rust toolchain to build the one this tree defines, or point\n' +
        '  `PROOF_BIN` at the binary to run.',
    )
  }
  run(installed)
}

/* Installed from the registry, with no platform package for this machine. A
   build would be `cargo build` in somebody else's project, for a crate that is
   not in it. */
if (!checkout) {
  console.error(
    `proof: no binary for ${process.platform} ${process.arch}.\n\n` +
      `  It comes in \`${PLATFORM}\`, an optional dependency of\n` +
      '  `@fusion.dev/proof`, and it is not installed. Either this machine is not\n' +
      '  one there is a build for, or the install skipped optional dependencies\n' +
      '  (`--omit=optional`, `--no-optional`), in which case install again without it.\n' +
      '  `PROOF_BIN` names a binary to run instead.',
  )
  process.exit(69)
}

if (!hasCargo()) {
  console.error(
    'proof: no binary and no cargo.\n\n' +
      `  Looked at: $PROOF_BIN, ${join(target, 'release', NAME)},\n` +
      `             ${join(target, 'debug', NAME)}, and \`${NAME}\` on PATH.\n\n` +
      '  Either install the binary, point `PROOF_BIN` at one, or install a Rust\n' +
      '  toolchain so this can build it.',
  )
  process.exit(69)
}

console.error('proof: no binary yet, building it once (cargo build --workspace)')
const build = spawnSync('cargo', ['build', '--workspace'], {
  cwd: WORKSPACE,
  stdio: 'inherit',
})
if (build.status !== 0) {
  console.error('proof: the build failed, so there is nothing to run.')
  process.exit(build.status ?? 70)
}

const after = built()
if (!after) {
  console.error(
    `proof: cargo reported success and produced no \`${NAME}\` under ${target}.\n` +
      '  That usually means a different target directory. Try `CARGO_TARGET_DIR`.',
  )
  process.exit(70)
}
run(after)
