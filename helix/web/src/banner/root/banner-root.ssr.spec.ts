import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('banner server output', () => {
  test('the message is in the served markup', () => {
    const markup = withoutStyles(ssr(html`<helix-banner>Trial ending</helix-banner>`))
    expect(markup).toContain('Trial ending')
  })

  test('the dismiss control ships with it, so it works before hydration', () => {
    expect(hasPart(ssr(html`<helix-banner dismissible>x</helix-banner>`), 'dismiss')).toBe(true)
  })

  test('the host carries only what the consumer wrote', () => {
    // The role and the live region go through `ElementInternals`, which writes
    // no attribute at all.
    const markup = ssr(html`<helix-banner severity="warning">x</helix-banner>`)
    expect(hostAttributes(markup, 'helix-banner')).toEqual(['severity'])
  })
})
