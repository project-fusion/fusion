import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('callout server output', () => {
  test('the tone icon and its name are in the served markup', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-callout tone="warning">Careful</helix-headless-callout>`),
    )
    expect(markup).toContain('aria-label="Warning"')
    expect(markup).toContain('role="img"')
  })

  test('the host carries nothing the consumer did not write', () => {
    // The note role goes through `ElementInternals`, which writes no attribute.
    // Writing `role` onto the host in `willUpdate` instead puts it in the
    // served markup, and a React consumer renders the tag themselves: their
    // markup never has it, so hydration mismatches on every callout.
    expect(
      hostAttributes(
        ssr(html`<helix-headless-callout>x</helix-headless-callout>`),
        'helix-headless-callout',
      ),
    ).toEqual([])
  })

  test('the default icon ships as slot fallback, so a replacement needs no JavaScript', () => {
    const markup = withoutStyles(ssr(html`<helix-headless-callout>x</helix-headless-callout>`))
    expect(markup).toContain('<slot name="icon">')
    expect(markup).toContain('<svg')
  })
})
