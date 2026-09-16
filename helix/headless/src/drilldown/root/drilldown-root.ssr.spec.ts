import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('drilldown server output', () => {
  test("the top page is served, because it is the consumer's own markup", () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-drilldown label="Settings"
        ><helix-headless-drilldown-item value="about">About</helix-headless-drilldown-item></helix-headless-drilldown
      >`),
    )
    expect(markup).toContain('About')
    expect(hasPart(markup, 'page')).toBe(true)
  })

  test('no header is served, since nothing has been drilled into yet', () => {
    const markup = ssr(html`<helix-headless-drilldown label="Settings"></helix-headless-drilldown>`)
    expect(hasPart(markup, 'header')).toBe(false)
    expect(hasPart(markup, 'back')).toBe(false)
  })

  test('a row is served as a row, since it is on the top page by default', () => {
    // `onPage` defaults to true, so a stack nobody has touched renders. A
    // default of false would serve an empty region and fill it on hydration.
    expect(
      hasPart(
        ssr(html`<helix-headless-drilldown-item value="a">A</helix-headless-drilldown-item>`),
        'item',
      ),
    ).toBe(true)
  })

  test('the host carries only what the consumer wrote', () => {
    // The role and the depth both go through internals, so neither reaches the
    // markup: the depth is decided by a tree the server cannot walk anyway.
    expect(
      hostAttributes(
        ssr(html`<helix-headless-drilldown label="Settings"></helix-headless-drilldown>`),
        'helix-headless-drilldown',
      ),
    ).toEqual(['label'])
  })
})
