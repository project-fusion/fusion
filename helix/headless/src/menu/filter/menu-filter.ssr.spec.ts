import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { hasPart, hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'
import './index.js'

/* The entry gives a filterable menu its field on the server too, so the
   panel a reader opens before hydration holds the field it will type in. */
describe('a filterable menu on the server, with the filter entry imported', () => {
  const menu = (filterable: boolean): string =>
    ssr(html`<helix-headless-menu label="Move to" ?filterable=${filterable}>
      <helix-headless-menu-item value="inbox">Inbox</helix-headless-menu-item>
    </helix-headless-menu>`)

  test('serves the field, and the rows in a `menu` beside it', () => {
    const markup = menu(true)
    expect(hasPart(markup, 'search-field')).toBe(true)
    expect(rendered(markup, 'helix-headless-menu')).toMatch(/id="items"\s+role="menu"/)
  })

  test('serves a menu that does not filter as it served one before the entry', () => {
    expect(hasPart(menu(false), 'search-field')).toBe(false)
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(menu(true), 'helix-headless-menu')).toEqual(['filterable', 'label'])
  })
})

/**
 * The entry under Lit's global DOM shim, which a server can opt into. Its
 * `document` has no `querySelectorAll`, and the entry walked the page at
 * import and threw. In a process of its own, because the shim's globals would
 * reach every spec after this one.
 *
 * **The process starts in the package's folder**, because Bun 1.4 reads the
 * tsconfig where a process starts and not beside each file: started beside
 * this spec, it found none with `experimentalDecorators`, and Lit refused the
 * standard decorators it compiled instead.
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
    { cwd: fileURLToPath(new URL('../../..', import.meta.url)) },
  )
  return [run.exitCode, run.stderr.toString()]
}

describe('the filter entry under Lit’s global DOM shim', () => {
  test('imports', () => {
    expect(
      importsUnderShim(`await import('${new URL('./index.js', import.meta.url).href}')`),
    ).toEqual([0, ''])
  })
})
