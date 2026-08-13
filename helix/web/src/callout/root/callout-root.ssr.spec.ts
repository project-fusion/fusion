import { describe, expect, test } from 'bun:test'
import { hostTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('callout server output', () => {
  test('the severity icon and its name are in the served markup', () => {
    const markup = withoutStyles(
      ssr(html`<helix-callout severity="warning">Careful</helix-callout>`),
    )
    expect(markup).toContain('aria-label="Warning"')
    expect(markup).toContain('role="img"')
  })

  test('the note role is rendered, not applied on connect', () => {
    // On the host, written in `willUpdate`, which the server does call.
    expect(hostTag(ssr(html`<helix-callout>x</helix-callout>`), 'helix-callout')).toContain(
      'role="note"',
    )
  })

  test('the default icon ships as slot fallback, so a replacement needs no JavaScript', () => {
    const markup = withoutStyles(ssr(html`<helix-callout>x</helix-callout>`))
    expect(markup).toContain('<slot name="icon">')
    expect(markup).toContain('<svg')
  })
})
