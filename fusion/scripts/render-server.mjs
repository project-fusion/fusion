#!/usr/bin/env bun
/**
 * Renders markup the way a server running Lit SSR does, to declarative shadow
 * DOM.
 *
 *   render-server.mjs <in.json> <out.json>
 *
 * `in.json` is `[{ id, markup }]` and `out.json` is `{ [id]: { server } | { error } }`.
 *
 * **A process of its own, always.** Lit's SSR shim patches `HTMLElement`,
 * `customElements` and the rest onto the global scope, and a process that also
 * drives a browser or registers a DOM is then running two worlds at once. The
 * checks that need a server's markup spawn this and read the file it writes.
 *
 * Both tiers are registered, because a headless example names headless tags.
 * Each piece of markup is rendered on its own and a failure is recorded against
 * it rather than thrown, so one component that cannot render on a server is one
 * finding and not the end of the run.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const [input, output] = process.argv.slice(2)
const { ssr } = await import('@fusion.dev/helix-testing/ssr')
await import('@fusion.dev/helix-headless')
await import('@fusion.dev/helix')
const { html } = await import('lit')

const rendered = {}
for (const { id, markup } of JSON.parse(readFileSync(input, 'utf8'))) {
  try {
    rendered[id] = { server: ssr(html(Object.assign([markup], { raw: [markup] }))) }
  } catch (error) {
    rendered[id] = { error: error instanceof Error ? error.message : String(error) }
  }
}
writeFileSync(output, JSON.stringify(rendered))

/* Out, rather than left to drain: something a component starts on a server
   keeps the loop alive after the last render, and the caller waits on this
   process ending. */
process.exit(0)
