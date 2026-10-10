import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
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

/**
 * An installed binary, which is the thing the `PATH` branch exists to find. It
 * answers `--version --json` as this command line does, naming its package.
 */
const installed = (says, code = 0) => {
  const directory = scratch()
  const file = join(directory, 'helix')
  writeFileSync(
    file,
    '#!/bin/sh\n' +
      'if [ "$*" = "--version --json" ]; then\n' +
      `  echo '{"name":"helix","package":"@fusion.dev/helix-cli","version":"1.2.3"}'\n` +
      '  exit 0\n' +
      'fi\n' +
      `echo "${says}"\nexit ${code}\n`,
  )
  chmodSync(file, 0o755)
  return directory
}

/**
 * Another program called `helix`, which prints the same line whatever it is
 * asked: the Helix text editor's version, or an old build of this command
 * line's, from before it answered `--version --json`.
 */
const foreign = (says) => {
  const directory = scratch()
  const file = join(directory, 'helix')
  writeFileSync(file, `#!/bin/sh\necho "${says}"\n`)
  chmodSync(file, 0o755)
  return { directory, file: realpathSync(file) }
}

/**
 * The shim as a consumer has it: copied into a project's `node_modules`, away
 * from any crate, with this machine's platform package beside it when `says`
 * is given. The copy is the point, a shim run from this repository always
 * having a crate to fall back to.
 */
const consumer = (says) => {
  const project = scratch()
  const scope = join(project, 'node_modules', '@fusion.dev')
  const shim = join(scope, 'helix-cli', 'bin.mjs')
  mkdirSync(dirname(shim), { recursive: true })
  copyFileSync(SHIM, shim)
  if (says !== undefined) {
    const platform = join(scope, `helix-cli-${process.platform}-${process.arch}`)
    mkdirSync(platform)
    writeFileSync(join(platform, 'package.json'), '{"name": "platform"}\n')
    const binary = join(platform, 'helix')
    writeFileSync(binary, `#!/bin/sh\necho "${says}"\n`)
    chmodSync(binary, 0o755)
  }
  return { project, shim }
}

/**
 * The shim, with `PATH` and the target directory under this test's control.
 *
 * **The timeout is an assertion and not a courtesy.** The fault guarded against
 * here is unbounded recursion, and a recursing shim never fails: every level
 * blocks on the level below it, so the run hangs and takes the machine's
 * process table with it rather than returning anything to check.
 */
const run = (directories, environment = {}, shim = SHIM) =>
  spawnSync(process.execPath, [shim, '--version'], {
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

    test('runs the binary npm installed for this machine', () => {
      const { project, shim } = consumer('from the platform package')
      const ran = run([], { CARGO_TARGET_DIR: join(project, 'target') }, shim)

      expect(ran.stdout).toContain('from the platform package')

      rmSync(project, { force: true, recursive: true })
    })

    test('and a cargo target outside a checkout does not outrank it', () => {
      /* A consumer's own `target/`, or a shared `CARGO_TARGET_DIR`, can hold a
         `helix` that is another program or an old build of this one. Only a
         checkout of this repository has a build of ours to prefer. */
      const { project, shim } = consumer('from the platform package')
      const shared = scratch()
      for (const target of [join(project, 'target'), shared]) {
        mkdirSync(join(target, 'release'), { recursive: true })
        writeFileSync(join(target, 'release', 'helix'), '#!/bin/sh\necho "from a cargo target"\n')
        chmodSync(join(target, 'release', 'helix'), 0o755)
      }

      expect(run([], {}, shim).stdout).toContain('from the platform package')
      expect(run([], { CARGO_TARGET_DIR: shared }, shim).stdout).toContain(
        'from the platform package',
      )

      rmSync(project, { force: true, recursive: true })
      rmSync(shared, { force: true, recursive: true })
    })

    test('and without one names the package, rather than building a crate that is not there', () => {
      /* An install that skipped optional dependencies, or a machine there is no
         build for. What it must not do is reach for cargo, which in a
         consumer's project builds nothing of ours. */
      const { project, shim } = consumer()
      const ran = run([], { CARGO_TARGET_DIR: join(project, 'target') }, shim)

      expect(ran.status).toBe(69)
      expect(ran.stderr).toContain(`helix-cli-${process.platform}-${process.arch}`)
      expect(ran.stderr).not.toContain('cargo build')

      rmSync(project, { force: true, recursive: true })
    })

    test('skips another program named helix on PATH, and names it', () => {
      /* On Arch Linux `helix` is the Helix text editor, and running it from a
         project's script opens an editor where a scan was asked for. */
      const { project, shim } = consumer()
      const editor = foreign('helix 25.07.1 (a05c151b)')
      const ran = run([editor.directory], { CARGO_TARGET_DIR: join(project, 'target') }, shim)

      expect(ran.status).toBe(69)
      expect(ran.stdout).not.toContain('25.07.1')
      expect(ran.stderr).toContain(`helix-cli-${process.platform}-${process.arch}`)
      expect(ran.stderr).toContain(`Not run, from PATH: \`${editor.file}\``)

      rmSync(project, { force: true, recursive: true })
      rmSync(editor.directory, { force: true, recursive: true })
    })

    test('and takes this command line behind it, past an old build of its own', () => {
      const editor = foreign('helix 25.07.1 (a05c151b)')
      const old = foreign('helix 0.0.0-dev')
      const real = installed('helix from PATH')
      const target = scratch()
      const ran = run([editor.directory, old.directory, real], { CARGO_TARGET_DIR: target })

      expect(ran.stdout).toContain('helix from PATH')
      expect(ran.stdout).not.toContain('0.0.0-dev')

      for (const directory of [editor.directory, old.directory, real, target]) {
        rmSync(directory, { force: true, recursive: true })
      }
    })

    test('and a copy of this shim it runs to check does not search PATH in turn', () => {
      /* Two consumers' copies with no binary between them, each on the
         other's PATH: each would run the other without end. */
      const one = consumer()
      const two = consumer()
      const linked = scratch()
      symlinkSync(two.shim, join(linked, 'helix'))
      const ran = run([linked], { CARGO_TARGET_DIR: join(one.project, 'target') }, one.shim)

      expect(ran.signal).toBe(null)
      expect(ran.status).toBe(69)
      expect(ran.stderr).toContain(`Not run, from PATH: \`${realpathSync(two.shim)}\``)

      for (const directory of [one.project, two.project, linked]) {
        rmSync(directory, { force: true, recursive: true })
      }
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

  describe('helix naming the templates for `helix new`', () => {
    test('names the copy this package depends on', () => {
      /* `npx @fusion.dev/helix-cli new` runs from a directory with no
         `node_modules`, so the binary's own walk for the templates finds
         nothing there. The package installed beside the shim is the one it
         depends on. */
      const { project, shim } = consumer('templates: $HELIX_TEMPLATES')
      const templates = join(project, 'node_modules', '@fusion.dev', 'helix-templates')
      mkdirSync(templates)
      writeFileSync(
        join(templates, 'package.json'),
        '{"name": "@fusion.dev/helix-templates", "exports": {"./templates.json": "./templates.json"}}\n',
      )
      writeFileSync(join(templates, 'templates.json'), '{}\n')
      const ran = run([], { CARGO_TARGET_DIR: join(project, 'target') }, shim)

      expect(ran.stdout).toContain(`templates: ${realpathSync(templates)}`)

      rmSync(project, { force: true, recursive: true })
    })

    test('and leaves the templates a caller named', () => {
      const { project, shim } = consumer('templates: $HELIX_TEMPLATES')
      const ran = run(
        [],
        { CARGO_TARGET_DIR: join(project, 'target'), HELIX_TEMPLATES: '/named/by/the/caller' },
        shim,
      )

      expect(ran.stdout).toContain('templates: /named/by/the/caller')

      rmSync(project, { force: true, recursive: true })
    })
  })
}
