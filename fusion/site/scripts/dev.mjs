#!/usr/bin/env bun
/**
 * `next dev`, with the catalog and the frame kept current beside it.
 *
 * **The catalog is generated, so the dev server only knew what existed when it
 * started.** A family added while it ran was a "That page is not here", and an
 * edited example showed its old markup, until somebody remembered to run the
 * catalog again or restarted the server. `bun run watch` at the root already
 * regenerates both from their own inputs in `turbo.json`, so this starts it
 * alongside the server rather than writing a second list of what to watch.
 *
 * `new-only` output, because a change re-walks the whole dependency graph as
 * cache hits and replaying every one of their logs buries the two lines that
 * say something was rebuilt.
 *
 * Either process ending takes the other with it, so the server never runs on
 * with a watcher that has quietly died, and the exit code is the one that
 * ended it.
 */
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const children = [
  spawn('next', ['dev', ...process.argv.slice(2)], { stdio: 'inherit' }),
  spawn('bun', ['run', 'watch', '--output-logs=new-only'], {
    cwd: root,
    stdio: ['ignore', 'inherit', 'inherit'],
  }),
]

const stop = (code) => {
  for (const child of children) {
    if (child.exitCode === null) {
      child.kill('SIGTERM')
    }
  }
  process.exitCode = code
}

for (const child of children) {
  child.on('exit', (code) => stop(code ?? 1))
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => stop(0))
}
