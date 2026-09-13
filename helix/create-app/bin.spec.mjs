import { afterEach, describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const LAUNCHER = join(dirname(fileURLToPath(import.meta.url)), 'bin.mjs')
const TEMPLATES = realpathSync(join(dirname(fileURLToPath(import.meta.url)), '../templates'))

const made = []
afterEach(() => {
  for (const directory of made.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

/**
 * A `helix` that says what it was asked, and with which templates.
 *
 * Reached through the real shim by `HELIX_BIN`, which is what the shim reads
 * first, so the launcher's whole path runs and only the binary is a stand-in.
 */
const helix = () => {
  const directory = mkdtempSync(join(tmpdir(), 'create-helix-app-'))
  made.push(directory)
  const file = join(directory, 'helix')
  writeFileSync(file, '#!/bin/sh\necho "args: $*"\necho "templates: $HELIX_TEMPLATES"\nexit 3\n')
  chmodSync(file, 0o755)
  return file
}

const launch = (args, environment = {}) =>
  spawnSync(process.execPath, [LAUNCHER, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...environment },
    timeout: 10_000,
  })

/* The stand-in is a shell script, which Windows does not run. */
if (process.platform !== 'win32') {
  describe('create-helix-app', () => {
    test('is `helix new`, with whatever was asked after it', () => {
      const ran = launch(['my-app', '--template', 'react-vite'], { HELIX_BIN: helix() })
      expect(ran.stdout).toContain('args: new my-app --template react-vite')
    })

    test('names the templates it came with, since where it runs has none', () => {
      const env = { ...process.env, HELIX_BIN: helix() }
      delete env.HELIX_TEMPLATES
      const ran = spawnSync(process.execPath, [LAUNCHER, 'my-app'], {
        encoding: 'utf8',
        env,
        timeout: 10_000,
      })
      const named = /templates: (.*)/.exec(ran.stdout)?.[1] ?? ''
      expect(realpathSync(named)).toBe(TEMPLATES)
    })

    test('and hands back the exit it was given', () => {
      expect(launch(['my-app'], { HELIX_BIN: helix() }).status).toBe(3)
    })
  })
}
