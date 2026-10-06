import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'
import { styles } from './pagination-root.css.js'

const buttons = html`<helix-pagination default-page="7" pages="12"></helix-pagination>`
const links = html`<helix-pagination
  default-page="3"
  href="/results?p={page}"
  pages="6"
></helix-pagination>`

describe('pagination server output', () => {
  test('the run is in the served markup, not built on connect', () => {
    // The truncation is arithmetic over two numbers, both of which the server
    // has, so there is nothing here to wait for hydration to work out.
    expect(hasPart(ssr(buttons), 'list')).toBe(true)
    expect(hasPart(ssr(buttons), 'page')).toBe(true)
  })

  test('the list ships with the role that list-style would otherwise strip', () => {
    expect(partTag(ssr(buttons), 'list')).toContain('role="list"')
  })

  test('the landmark role is on internals, so the host stays as written', () => {
    expect(hostAttributes(ssr(buttons), 'helix-pagination')).toEqual(['default-page', 'pages'])
  })

  test('the page on show is already marked in the served markup', () => {
    // The one control carrying `page-current` is the one that has to carry
    // `aria-current`, so ask that control rather than the render.
    expect(partTag(ssr(buttons), 'page-current')).toContain('aria-current="page"')
  })

  test('links are real links in the served markup, so a crawler follows them', () => {
    // The reason `href` exists at all. A button renders nothing a crawler can
    // follow, and a paged result whose pages have their own URLs should have
    // them reachable without the page running.
    const shadow = rendered(ssr(links), 'helix-pagination')
    expect(shadow).toContain('href="/results?p=1"')
    expect(shadow).toContain('href="/results?p=6"')
  })

  test('the spent step ships without an href rather than as a disabled link', () => {
    const first = html`<helix-pagination
      default-page="1"
      href="/results?p={page}"
      pages="6"
    ></helix-pagination>`
    expect(partTag(ssr(first), 'previous')).not.toContain('href=')
    expect(partTag(ssr(first), 'previous')).toContain('aria-disabled="true"')
  })

  test('the page total is worked out on the server, from numbers it has', () => {
    // Arithmetic over two properties, so there is nothing here to wait for: the
    // run ships with ten pages in it rather than one that grows on hydration.
    const counted = html`<helix-pagination
      default-page="1"
      page-size="25"
      total="248"
    ></helix-pagination>`
    expect(rendered(ssr(counted), 'helix-pagination')).toContain('>10<')
  })

  test('the jump to either end ships with the rest, under `ends`', () => {
    const ends = html`<helix-pagination default-page="4" ends pages="12"></helix-pagination>`
    expect(hasPart(ssr(ends), 'first')).toBe(true)
    expect(hasPart(ssr(ends), 'last')).toBe(true)
    expect(hasPart(ssr(buttons), 'first')).toBe(false)
  })

  test('compact ships its reading rather than a run to be replaced', () => {
    const compact = html`<helix-pagination compact default-page="7" pages="24"></helix-pagination>`
    expect(hasPart(ssr(compact), 'list')).toBe(false)
    expect(rendered(ssr(compact), 'helix-pagination')).toContain('7 of 24')
  })
})

/* Four hooks covered the fill, the gap and the box; the text, the radius, the
   current page's edge and weight, the spent controls and the marks were fixed. */
describe('pagination hooks', () => {
  test('every visual decision in the row is a hook the sheet reads', () => {
    const text = styles.cssText
    for (const hook of [
      '--pagination-current-border-color',
      '--pagination-current-font-weight',
      '--pagination-current-foreground-color',
      '--pagination-disabled-foreground-color',
      '--pagination-disabled-opacity',
      '--pagination-ellipsis-foreground-color',
      '--pagination-font-size',
      '--pagination-font-weight',
      '--pagination-foreground-color',
      '--pagination-hover-foreground-color',
      '--pagination-icon-size',
      '--pagination-padding',
      '--pagination-radius',
      '--pagination-status-foreground-color',
    ]) {
      expect(text).toMatch(new RegExp(`var\\(\\s*${hook},`))
    }
  })
})
