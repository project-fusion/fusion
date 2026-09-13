import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SHIM = join(dirname(fileURLToPath(import.meta.url)), 'bin.mjs')
const NODE = dirname(process.execPath)

const scratch = () => mkdtempSync(join(tmpdir(), 'helix-shim-'))

/**
 * What `node_modules/.bin/helix` is: a symlink to this shim.
 *
 * A symlink and not a wrapper script, because that is the whole question. The
 * shim resolves a `PATH` entry through its links and compares the answer to
 * itself, so a stand-in that merely runs the shim would be a different file and
 * would prove nothing.
 */
const shimOnPath = () => {
  const directory = scratch()
  symlinkSync(SHIM, join(directory, 'helix'))
  return directory
}

/** An installed binary, which is the thing the `PATH` branch exists to find. */
const installed = (says, code = 0) => {
  const directory = scratch()
  const file = join(directory, 'helix')
  writeFileSync(file, `#!/bin/sh\necho "${says}"\nexit ${code}\n`)
  chmodSync(file, 0o755)
  return directory
}

/**
 * The shim, with `PATH` and the target directory under this test's control.
 *
 * **The timeout is an assertion and not a courtesy.** The fault guarded against
 * here is unbounded recursion, and a recursing shim never fails: every level
 * blocks on the level below it, so the run hangs and takes the machine's
 * process table with it rather than returning anything to check.
 */
const run = (directories, environment = {}) =>
  spawnSync(process.execPath, [SHIM, '--version'], {
    encoding: 'utf8',
    env: {
      HOME: process.env.HOME ?? '',
      PATH: [...directories, NODE].join(':'),
      ...environment,
    },
    timeout: 5_000,
  })

/* The shebang, the `sh` stub and the symlink are all POSIX, and so is the
   fault: npm writes `.cmd` wrappers on Windows, which is not what `helix.exe`
   resolves to. */
if (process.platform !== 'win32') {
  describe('helix resolving a binary', () => {
    test('reports rather than hanging when it is the only thing on PATH', () => {
      /* The weaker half of the pair, and worth saying so: a recursing shim
         bottoms out once the machine refuses to fork, and every level then
         prints this same message, so a process-capped run of the broken code
         passes this. What it does hold is that the run ends and says something
         a reader can act on. The test below is the one that fails when the
         skip regresses. */
      const self = shimOnPath()
      const target = scratch()
      const ran = run([self], { CARGO_TARGET_DIR: target })

      expect(ran.signal).toBe(null)
      expect(ran.stderr).toContain('no binary and no cargo')

      rmSync(self, { force: true, recursive: true })
      rmSync(target, { force: true, recursive: true })
    })

    test('takes a real one sitting behind it on PATH', () => {
      /* **This is the regression guard.** Two ways to fail it, and the broken
         shim failed it both ways at once: probing `PATH` with a spawn finds
         this file first, runs it, and gets back whatever that copy exited with
         rather than an answer about the real binary, so the branch is skipped
         and the installed `helix` is never reached. Returning at the first
         match instead of stepping past self has the same effect from the other
         direction. Verified against the unfixed shim, where it fails and the
         test above does not. */
      const self = shimOnPath()
      const real = installed('helix from PATH')
      const target = scratch()
      const ran = run([self, real], { CARGO_TARGET_DIR: target })

      expect(ran.stdout).toContain('helix from PATH')

      rmSync(self, { force: true, recursive: true })
      rmSync(real, { force: true, recursive: true })
      rmSync(target, { force: true, recursive: true })
    })

    test('hands back the exit it was given, a finding being no failure to start', () => {
      /* Under bun a child that exits 1 comes back with an `error` as well as the
         status, so a shim reading the one reported a check's findings as a
         binary it could not run, and CI saw 70. */
      const real = installed('one finding', 1)
      const target = scratch()
      const ran = run([real], { CARGO_TARGET_DIR: target })

      expect(ran.status).toBe(1)
      expect(ran.stderr).not.toContain('could not run')

      rmSync(real, { force: true, recursive: true })
      rmSync(target, { force: true, recursive: true })
    })

    test('and `HELIX_BIN` outranks both', () => {
      const named = installed('from the variable')
      const other = installed('from PATH')
      const target = scratch()
      const ran = run([other], {
        CARGO_TARGET_DIR: target,
        HELIX_BIN: join(named, 'helix'),
      })

      expect(ran.stdout).toContain('from the variable')

      rmSync(named, { force: true, recursive: true })
      rmSync(other, { force: true, recursive: true })
      rmSync(target, { force: true, recursive: true })
    })
  })
}
