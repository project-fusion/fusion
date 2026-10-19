#!/usr/bin/env bun
/**
 * Writes `src/sandbox/compile-worker.generated.ts`: the compiler's worker as the
 * text the preview starts it from, and the version of its messages.
 *
 * **`compile-worker.ts` is the one copy of the program.** It ships as a file of
 * its own for a page whose policy refuses `blob:` workers, and the preview
 * starts the same program from a `blob:` address everywhere else, so the
 * address needs the program as text. This minifies the file into that text,
 * which no minifier of a consumer's would read, being a string.
 *
 * **`PROTOCOL` is read from the file's source, and not by importing it**,
 * since importing the worker would run it: it answers messages on whatever
 * scope it lands in.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'src/sandbox/compile-worker.ts')
const out = join(root, 'src/sandbox/compile-worker.generated.ts')

const protocol = /^export const PROTOCOL = (\d+)$/m.exec(await Bun.file(source).text())?.[1]
if (!protocol) {
  throw new Error(`${source} declares no \`export const PROTOCOL = <number>\`.`)
}

const built = await Bun.build({
  entrypoints: [source],
  format: 'esm',
  minify: true,
  target: 'browser',
})
if (!built.success || !built.outputs[0]) {
  throw new AggregateError(built.logs, `${source} did not build.`)
}
const program = (await built.outputs[0].text()).trim()

await mkdir(dirname(out), { recursive: true })
await writeFile(
  out,
  `/* Written by \`bun run compile-worker\` from \`compile-worker.ts\`. */\n\n` +
    `/** The version of the messages \`compile-worker.ts\` answers with. */\n` +
    `export const PROTOCOL = ${protocol}\n\n` +
    `/** \`compile-worker.ts\`, minified, for the preview to start from a \`blob:\` address. */\n` +
    `export const WORKER = ${JSON.stringify(program)}\n`,
)
