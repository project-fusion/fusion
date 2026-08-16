import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('drilldown server output', () => {
  test('the top page is served, because it is the consumer"s own markup', () => {
    const markup = withoutStyles(
      ssr(html`<helix-drilldown label="Settings"
        ><helix-drilldown-item value="about">About</helix-drilldown-item></helix-drilldown
      >`),
    )
    expect(markup).toContain('About')
    expect(hasPart(markup, 'page')).toBe(true)
  })

  test('no header is served, since nothing has been drilled into yet', () => {
    const markup = ssr(html`<helix-drilldown label="Settings"></helix-drilldown>`)
    expect(hasPart(markup, 'header')).toBe(false)
    expect(hasPart(markup, 'back')).toBe(false)
  })

  test('a row is served as a row, since it is on the top page by default', () => {
    // `onPage` defaults to true, so a stack nobody has touched renders. A
    // default of false would serve an empty region and fill it on hydration.
    expect(
      hasPart(ssr(html`<helix-drilldown-item value="a">A</helix-drilldown-item>`), 'item'),
    ).toBe(true)
  })

  test('the host carries only what the consumer wrote', () => {
    // The role goes through internals, and `data-drilled` is not written on the
    // server: it is decided by a tree the server cannot walk.
    expect(
      hostAttributes(
        ssr(html`<helix-drilldown label="Settings"></helix-drilldown>`),
        'helix-drilldown',
      ),
    ).toEqual(['label'])
  })
})
