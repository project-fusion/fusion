#!/usr/bin/env node
/**
 * `npm create @fusion.dev/helix-app`: `helix new` for somebody with no project
 * yet.
 *
 * **One implementation, two doors.** The scaffolding belongs to the binary, and
 * this is the door for a reader with nothing installed: npm fetches this
 * package, the command it depends on, the binary for their machine and the
 * templates, and this runs `helix new` against the templates it came with.
 * Nothing here copies or substitutes, which is the part that would drift from
 * the other door.
 *
 * **It names the templates rather than letting the binary look.** `helix new`
 * walks up from where it is run for a `node_modules` holding them, and the
 * directory a reader runs this in has none: npm installed everything into its
 * own cache. So this hands over the package it resolved, which is the one
 * versioned with the binary beside it. `HELIX_TEMPLATES` already set wins, as it
 * does everywhere else it is read.
 *
 * **And it says when it is not the newest**, which the binary cannot: it has no
 * HTTP client, by design, and this door is the one that goes stale. Asked
 * without `@latest`, npm runs whatever copy it cached last time, so a reader can
 * scaffold from a release months old without anything saying so. See `newer`.
 */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const templates = dirname(require.resolve('@fusion.dev/helix-templates/templates.json'))
const helix = require.resolve('@fusion.dev/helix-cli/bin.mjs')
const own = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'package.json'), 'utf8'),
)

/** How long the registry gets, since a scaffold must never wait on it. */
const PATIENCE = 3000

/** `[major, minor, patch]`, or undefined for a pre-release or anything else. */
const release = (version) => {
  const found = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim())
  return found ? found.slice(1).map(Number) : undefined
}

/**
 * The version newer than this one that npm calls latest, or undefined.
 *
 * **Asked through npm rather than over HTTP**, because npm holds the reader's
 * registry and login. npm is on the path by definition, this having been started
 * by it.
 *
 * **Never in the way.** Given three seconds and killed after them, and every
 * failure is silence: offline, refused, slow, or answering something that is not
 * a version. Not asked in CI, where nobody reads it, nor from a pre-release,
 * which somebody chose on purpose, nor where `HELIX_NO_UPDATE_CHECK` is set.
 */
const newer = () => {
  const mine = release(own.version)
  if (mine === undefined || process.env.CI || process.env.HELIX_NO_UPDATE_CHECK) {
    return Promise.resolve(undefined)
  }
  return new Promise((resolve) => {
    let said = ''
    const asking = spawn('npm', ['view', `${own.name}@latest`, 'version'], {
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const done = (answer) => {
      clearTimeout(timer)
      resolve(answer)
    }
    const timer = setTimeout(() => {
      asking.kill()
      done(undefined)
    }, PATIENCE)
    asking.stdout.on('data', (chunk) => {
      said += chunk
    })
    asking.on('error', () => done(undefined))
    asking.on('close', (code) => {
      const latest = release(said)
      if (code !== 0 || latest === undefined) {
        done(undefined)
        return
      }
      const ahead = latest.findIndex((part, index) => part !== mine[index])
      done(ahead !== -1 && latest[ahead] > mine[ahead] ? said.trim() : undefined)
    })
  })
}

/* Asked while the project is written rather than before, so a reader waits on
   the registry only if it is slower than the scaffold. */
const checking = newer()

/**
 * What was asked, with the template put back where npm took it from.
 *
 * **npm reads `--template` as its own setting.** It drops the flag and passes the
 * value on, so `npm create @fusion.dev/helix-app my-app --template react-vite`
 * arrives here as two bare words, and `helix new` refused the second. Nothing
 * else is two bare words, so every package manager can use the one command.
 */
const asked = (args) =>
  args.length === 2 && !args.some((one) => one.startsWith('-'))
    ? [args[0], '--template', args[1]]
    : args

/** The package manager that ran this, from what each one sets, or npm. */
const manager = () =>
  /^(bun|pnpm|yarn)\//.exec(process.env.npm_config_user_agent ?? '')?.[1] ?? 'npm'

const running = spawn(process.execPath, [helix, 'new', ...asked(process.argv.slice(2))], {
  env: { ...process.env, HELIX_TEMPLATES: process.env.HELIX_TEMPLATES ?? templates },
  stdio: 'inherit',
})
running.on('error', (error) => {
  console.error(`create-helix-app: could not run helix: ${error.message}`)
  process.exit(70)
})
running.on('close', async (status) => {
  /* On stderr, so `--json` on stdout stays a document a script can read. */
  const latest = await checking
  if (latest !== undefined) {
    console.error(
      `\nHelix ${latest} is out, and this is ${own.version}. For the newest templates:\n\n` +
        `  ${manager()} create ${own.name.replace('create-', '')}@latest\n`,
    )
  }
  process.exit(status ?? 70)
})
