import { describe, expect, test } from 'bun:test'
import { hasPart, ssr } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('command server output', () => {
  test('the palette ships shut', () => {
    // The server has no reader to have pressed anything, and a palette that
    // arrived open would cover the page before a single script had run.
    const markup = ssr(html`<helix-command label="Commands"></helix-command>`)
    expect(markup).not.toContain('open=""')
  })

  test('the list ships with it, so what is in it is server-rendered too', () => {
    const markup = ssr(html`<helix-command label="Commands"></helix-command>`)
    expect(hasPart(markup, 'listbox')).toBe(true)
  })
})
