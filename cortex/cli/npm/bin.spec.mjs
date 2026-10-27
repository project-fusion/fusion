import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SHIM = join(dirname(fileURLToPath(import.meta.url)), 'bin.mjs')
const NODE = dirname(process.execPath)

const scratch = () => mkdtempSync(join(tmpdir(), 'cortex-shim-'))

/** A `cortex` in a directory of its own, as a shell script. */
const script = (body) => {
  const directory = scratch()
  const file = join(directory, 'cortex')
  writeFileSync(file, `#!/bin/sh\n${body}\n`)
  chmodSync(file, 0o755)
  return { directory, file: realpathSync(file) }
}

/** An installed `cortex` whose `--version --json` names this package. */
const installed = (says) =>
  script(
    'if [ "$*" = "--version --json" ]; then\n' +
      `  echo '{"name":"cortex","package":"@fusion.dev/cortex-cli","version":"1.2.3"}'\n` +
      '  exit 0\n' +
      'fi\n' +
      `echo "${says}"`,
  )

/** Another program named `cortex`, which says the same whatever it is asked. */
const foreign = (says) => script(`echo "${says}"`)

/**
 * The shim as a consumer has it: copied into a project's `node_modules`, away
 * from any crate, with this machine's platform package beside it when `says`
 * is given.
 */
const consumer = (says) => {
  const project = scratch()
  const scope = join(project, 'node_modules', '@fusion.dev')
  const shim = join(scope, 'cortex-cli', 'bin.mjs')
  mkdirSync(dirname(shim), { recursive: true })
  copyFileSync(SHIM, shim)
  if (says !== undefined) {
    const platform = join(scope, `cortex-cli-${process.platform}-${process.arch}`)
    mkdirSync(platform)
    writeFileSync(join(platform, 'package.json'), '{"name": "platform"}\n')
    const binary = join(platform, 'cortex')
    writeFileSync(binary, `#!/bin/sh\necho "${says}"\n`)
    chmodSync(binary, 0o755)
  }
  return { project, shim }
}

/** The shim, with `PATH` under this test's control. The timeout catches a shim that runs itself. */
const run = (shim, directories, environment = {}) =>
  spawnSync(process.execPath, [shim, '--version'], {
    encoding: 'utf8',
    env: {
      HOME: process.env.HOME ?? '',
      PATH: [...directories, NODE].join(':'),
      ...environment,
    },
    timeout: 5_000,
  })

/* The shebang and the `sh` stubs are POSIX. */
if (process.platform !== 'win32') {
  describe('cortex resolving a binary', () => {
    test('runs the binary npm installed for this machine', () => {
      const { shim } = consumer('from the platform package')

      const result = run(shim, [])

      expect(result.status).toBe(0)
      expect(result.stdout.trim()).toBe('from the platform package')
    })

    test('and without one names the package it comes in', () => {
      const { shim } = consumer()

      const result = run(shim, [])

      expect(result.status).toBe(69)
      expect(result.stderr).toContain(`@fusion.dev/cortex-cli-${process.platform}-${process.arch}`)
    })

    test('skips another program named cortex on PATH, and names it', () => {
      const { shim } = consumer()
      const other = foreign('another cortex')

      const result = run(shim, [other.directory])

      expect(result.status).toBe(69)
      expect(result.stdout).not.toContain('another cortex')
      expect(result.stderr).toContain(other.file)
    })

    test('and takes this command line behind it on PATH', () => {
      const { shim } = consumer()
      const other = foreign('another cortex')
      const ours = installed('cortex 1.2.3')

      const result = run(shim, [other.directory, ours.directory])

      expect(result.status).toBe(0)
      expect(result.stdout.trim()).toBe('cortex 1.2.3')
    })

    test('does not run itself from PATH', () => {
      const { shim } = consumer()
      const linked = scratch()
      symlinkSync(shim, join(linked, 'cortex'))

      const result = run(shim, [linked])

      expect(result.status).toBe(69)
    })

    test('and `CORTEX_BIN` outranks the platform package', () => {
      const { shim } = consumer('from the platform package')
      const named = installed('named')

      const result = run(shim, [], { CORTEX_BIN: named.file })

      expect(result.stdout.trim()).toBe('named')
    })
  })
}
