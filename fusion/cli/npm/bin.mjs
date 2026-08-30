#!/usr/bin/env node
/**
 * `fusion` for a caller that reaches it through npm rather than through cargo.
 *
 * **The binary is Rust and half this repository is not**, so the checks that
 * call it are `bun run` lines in a manifest and the people running them have
 * node on their path and may not have cargo. This resolves a built binary,
 * builds one if it can, and says exactly what is missing if it cannot.
 *
 * **Resolution order, and each step is there for a reason.** `FUSION_BIN` first,
 * because a caller that knows better should not have to argue. Then the cargo
 * target directory, release before debug, honoring `CARGO_TARGET_DIR` because a
 * shared target is common and guessing `./target` would miss it. Then whatever
 * is on `PATH`, which is what an installed binary looks like. Only then a
 * build, and only when cargo is present.
 *
 * **A build is a fallback and not the plan.** It happens once, prints that it
 * is happening, and a CI pipeline that has already run `cargo build` never
 * reaches it. What it replaces is the failure this shim exists to prevent: a
 * check that dies with `spawn fusion ENOENT` and tells a reader nothing about
 * which of the four possible causes they have.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, realpathSync, statSync } from 'node:fs'
import { delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CRATE = resolve(HERE, '..')
const WORKSPACE = resolve(CRATE, '../..')
const NAME = process.platform === 'win32' ? 'fusion.exe' : 'fusion'

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

/** Whether cargo is on the path, asked once and cheaply. */
const hasCargo = () => spawnSync('cargo', ['--version'], { stdio: 'ignore' }).status === 0

/** This file, resolved, which is what the `PATH` entry has to not be. */
const SELF = realpathSync(fileURLToPath(import.meta.url))

/**
 * The first `fusion` on `PATH`, resolved through its symlinks, or undefined.
 *
 * **Walked rather than spawned, because the spawn is the bug.** Probing with
 * `spawnSync('fusion', ['--version'])` asks `PATH` to answer, and under
 * `bun run` the first answer is `node_modules/.bin/fusion`, which is a symlink
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
      /* Through the symlink, so `node_modules/.bin/fusion` is recognized as
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
  if (error) {
    console.error(`fusion: could not run \`${binary}\`: ${error.message}`)
    process.exit(70)
  }
  process.exit(status ?? 70)
}

const found = process.env.FUSION_BIN ?? built()
if (found && existsSync(found)) {
  run(found)
}

/* `PATH`, which is what an installed binary looks like. Resolved rather than
   probed: see `onPath`, where the probe this used to do is what recursed. */
const installed = onPath()
if (installed) {
  run(installed)
}

if (!hasCargo()) {
  console.error(
    'fusion: no binary and no cargo.\n\n' +
      `  Looked at: $FUSION_BIN, ${join(target, 'release', NAME)},\n` +
      `             ${join(target, 'debug', NAME)}, and \`${NAME}\` on PATH.\n\n` +
      '  Either install the binary, point `FUSION_BIN` at one, or install a Rust\n' +
      '  toolchain so this can build it.',
  )
  process.exit(69)
}

console.error('fusion: no binary yet, building it once (cargo build -p fusion-cli)')
const build = spawnSync('cargo', ['build', '-p', 'fusion-cli'], {
  cwd: WORKSPACE,
  stdio: 'inherit',
})
if (build.status !== 0) {
  console.error('fusion: the build failed, so there is nothing to run.')
  process.exit(build.status ?? 70)
}

const after = built()
if (!after) {
  console.error(
    `fusion: cargo reported success and produced no \`${NAME}\` under ${target}.\n` +
      '  That usually means a different target directory. Try `CARGO_TARGET_DIR`.',
  )
  process.exit(70)
}
run(after)
