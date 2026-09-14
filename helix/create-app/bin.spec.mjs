import { afterEach, describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const LAUNCHER = join(HERE, 'bin.mjs')
const TEMPLATES = realpathSync(join(HERE, '../templates'))
const OWN = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8')).version

const made = []
afterEach(() => {
  for (const directory of made.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

const scratch = () => {
  const directory = mkdtempSync(join(tmpdir(), 'create-helix-app-'))
  made.push(directory)
  return directory
}

/**
 * A `helix` that says what it was asked, and with which templates.
 *
 * Reached through the real shim by `HELIX_BIN`, which is what the shim reads
 * first, so the launcher's whole path runs and only the binary is a stand-in.
 */
const helix = () => {
  const file = join(scratch(), 'helix')
  writeFileSync(file, '#!/bin/sh\necho "args: $*"\necho "templates: $HELIX_TEMPLATES"\nexit 3\n')
  chmodSync(file, 0o755)
  return file
}

/**
 * An `npm` on `PATH` that answers `view` with `says`, or sleeps where `says` is
 * `null`, and leaves a mark whenever it is asked.
 */
const registry = (says) => {
  const directory = scratch()
  const file = join(directory, 'npm')
  const answer = says === null ? 'sleep 10' : `echo "${says}"`
  writeFileSync(file, `#!/bin/sh\ntouch "${join(directory, 'asked')}"\n${answer}\n`)
  chmodSync(file, 0o755)
  return directory
}

/** The launcher, with the update check off unless an `npm` is handed in. */
const launch = (args, { npm, environment = {} } = {}) => {
  const env = { ...process.env, HELIX_BIN: helix(), ...environment }
  delete env.CI
  delete env.HELIX_TEMPLATES
  if (npm === undefined) {
    env.HELIX_NO_UPDATE_CHECK = '1'
  } else {
    env.PATH = `${npm}${delimiter}${process.env.PATH}`
  }
  return spawnSync(process.execPath, [LAUNCHER, ...args], {
    encoding: 'utf8',
    env,
    timeout: 15_000,
  })
}

/** A version past this one, whatever this one is. */
const ahead = OWN.split('.')
  .map((part, index) => (index === 0 ? Number(part) + 1 : part))
  .join('.')

/* The stand-ins are shell scripts, which Windows does not run. */
if (process.platform !== 'win32') {
  describe('create-helix-app', () => {
    test('is `helix new`, with whatever was asked after it', () => {
      const ran = launch(['my-app', '--template', 'react-vite'])
      expect(ran.stdout).toContain('args: new my-app --template react-vite')
    })

    test('names the templates it came with, since where it runs has none', () => {
      const named = /templates: (.*)/.exec(launch(['my-app']).stdout)?.[1] ?? ''
      expect(realpathSync(named)).toBe(TEMPLATES)
    })

    test('and hands back the exit it was given', () => {
      expect(launch(['my-app']).status).toBe(3)
    })
  })

  describe('saying a newer Helix is out', () => {
    test('says so after the scaffold, naming the door that gets it', () => {
      const ran = launch(['my-app'], { npm: registry(ahead) })
      expect(ran.stderr).toContain(`Helix ${ahead} is out, and this is ${OWN}`)
      expect(ran.stderr).toContain('npm create @fusion.dev/helix-app@latest')
      expect(ran.status).toBe(3)
    })

    test('and says nothing when this is the newest', () => {
      const ran = launch(['my-app'], { npm: registry(OWN) })
      expect(ran.stderr).not.toContain('is out')
    })

    test('and does not wait on a registry that does not answer', () => {
      /* Three seconds and no more: the stand-in sleeps for ten. */
      const started = Date.now()
      const ran = launch(['my-app'], { npm: registry(null) })
      expect(Date.now() - started).toBeLessThan(8_000)
      expect(ran.stderr).not.toContain('is out')
      expect(ran.status).toBe(3)
    })

    test('and does not ask at all when told not to', () => {
      const npm = registry(ahead)
      const ran = launch(['my-app'], { environment: { HELIX_NO_UPDATE_CHECK: '1' }, npm })
      expect(existsSync(join(npm, 'asked'))).toBe(false)
      expect(ran.stderr).not.toContain('is out')
    })
  })
}
