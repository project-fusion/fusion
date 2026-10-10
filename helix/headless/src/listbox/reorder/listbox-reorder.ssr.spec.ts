import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'
import '../../option/index.js'
import './index.js'

/* The entry gives a list what it does in a browser, and nothing to serve: a
   reorderable list with it imported serves what a list without it does. */
describe('a reorderable listbox on the server, with the reorder entry imported', () => {
  const list = (reorderable: boolean): string =>
    ssr(html`<helix-headless-listbox label="Order" ?reorderable=${reorderable}>
      <helix-headless-option value="a">Alpha</helix-headless-option>
    </helix-headless-listbox>`)

  test('serves the markup of a list that does not reorder', () => {
    /* The attribute aside, which is the consumer's own. The options are in
       the same markup, so neither the list nor an option serves a state or a
       sheet of the entry's. */
    expect(rendered(list(true), 'helix-headless-listbox').replace(' reorderable', '')).toBe(
      rendered(list(false), 'helix-headless-listbox'),
    )
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(list(true), 'helix-headless-listbox')).toEqual(['label', 'reorderable'])
  })
})

/**
 * The entry under Lit's global DOM shim, which a server can opt into. Its
 * `document` has no `querySelectorAll`, and the entry walked the page at
 * import and threw. In a process of its own, because the shim's globals would
 * reach every spec after this one.
 */
const importsUnderShim = (script: string): [number, string] => {
  const run = Bun.spawnSync(
    [
      process.execPath,
      '--conditions',
      'helix-development',
      '-e',
      `await import('@lit-labs/ssr/lib/install-global-dom-shim.js'); ${script}`,
    ],
    { cwd: fileURLToPath(new URL('.', import.meta.url)) },
  )
  return [run.exitCode, run.stderr.toString()]
}

describe('the reorder entry under Lit’s global DOM shim', () => {
  test('imports', () => {
    expect(importsUnderShim("await import('./index.js')")).toEqual([0, ''])
  })
})
