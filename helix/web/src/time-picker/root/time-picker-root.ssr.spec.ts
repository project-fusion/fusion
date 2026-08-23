import { describe, expect, test } from 'bun:test'
import { hasPart, ssr } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const markup = ssr(
  html`<helix-time-picker locale="en-GB" max="09:30" min="09:00" value="09:15"></helix-time-picker>`,
)

describe('time server output', () => {
  test('every offered time ships, so the list is there before any script runs', () => {
    expect(hasPart(markup, 'list')).toBe(true)
    for (const at of ['09:00', '09:15', '09:30']) {
      expect(markup).toContain(`value="${at}"`)
    }
  })

  test('and each one is written the way the locale writes it', () => {
    // `Intl` runs on the server too, which is the whole reason the label is not
    // computed on the client.
    expect(markup).toContain('09:15')
  })
})
