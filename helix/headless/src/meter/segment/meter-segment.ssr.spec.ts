import { describe, expect, test } from 'bun:test'
import { partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('meter segment server output', () => {
  test('the slice carries its amount, from the number it was given', () => {
    const served = ssr(
      html`<helix-headless-meter-segment label="Tools" value="200"></helix-headless-meter-segment>`,
    )
    expect(partTag(served, 'fill')).toContain('--meter-segment-value: 200')
  })

  test('a value that is not a number serves as nothing', () => {
    const served = ssr(
      html`<helix-headless-meter-segment value="-4"></helix-headless-meter-segment>`,
    )
    expect(partTag(served, 'fill')).toContain('--meter-segment-value: 0')
  })

  test('the track serves the span, so a segment is sized before the page has script', () => {
    const served = ssr(
      html`<helix-headless-meter label="Disk" max="80" min="20"></helix-headless-meter>`,
    )
    expect(partTag(served, 'track')).toContain('--meter-span: 60')
  })
})
