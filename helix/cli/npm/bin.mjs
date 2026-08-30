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
import { existsSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CRATE = resolve(HERE, '..')
const WORKSPACE = resolve(CRATE, '../..')
const NAME = process.platform === 'win32' ? 'helix.exe' : 'helix'

/**
 * Set on the `PATH` probe below, so this shim can decline to be its own answer.
 *
 * A shim that starts with this set is being asked whether an installed binary
 * exists, and it is not one. Exiting non-zero is that answer.
 */
const SELF = 'HELIX_NPM_SHIM_PROBE'
if (process.env[SELF]) {
  process.exit(70)
}

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

const run = (binary) => {
  const { status, error } = spawnSync(binary, process.argv.slice(2), { stdio: 'inherit' })
  if (error) {
    console.error(`helix: could not run \`${binary}\`: ${error.message}`)
    process.exit(70)
  }
  process.exit(status ?? 70)
}

const found = process.env.HELIX_BIN ?? built()
if (found && existsSync(found)) {
  run(found)
}

/* `PATH`, which is what an installed binary looks like. `--version` rather than
   a bare run, because a bare run of a command line that requires a subcommand
   exits 2 and would read as absent.

   **The probe has to be able to not find this file, and could not.** `bun run`
   and `turbo` both put `node_modules/.bin` on `PATH`, and `helix` there is a
   symlink to this shim, so `spawnSync('helix')` re-entered it, which probed
   again. Every child was the parent of the next: measured 30 Aug 2026 at 4,880
   processes accumulating around twenty-five a minute, until `posix_spawn`
   returned `EAGAIN` and nothing on the machine could fork, which is a fork bomb
   in a `--version` check.

   `SELF` is what breaks it. The probe sets it, and a shim that starts with it
   set refuses at the top rather than searching, so the probe reports absent and
   the fall-through builds instead. Not a resolved-path comparison, which is the
   other obvious fix and does not survive the symlink, a second checkout, or a
   worktree with its own `node_modules`: this one is true wherever it runs. */
if (
  spawnSync(NAME, ['--version'], {
    env: { ...process.env, [SELF]: '1' },
    stdio: 'ignore',
  }).status === 0
) {
  run(NAME)
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
