import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const banded = html`<helix-meter
  high="80"
  label="Disk"
  low="50"
  optimum="0"
  show-value
  value="94"
></helix-meter>`

describe('meter server output', () => {
  test('the reading is drawn on the server, from numbers it already has', () => {
    expect(partTag(ssr(banded), 'indicator')).toContain('--_meter-fraction: 0.94')
  })

  test('and so is its band, rather than being colored on hydration', () => {
    expect(partTag(ssr(banded), 'indicator')).toContain('data-band="poor"')
  })

  test('the thresholds ship as marks', () => {
    expect(hasPart(ssr(banded), 'tick')).toBe(true)
  })

  test('an unbanded meter ships neither', () => {
    // A gauge with nothing said about it is a reading, not good news.
    const plain = html`<helix-meter label="Disk" value="20"></helix-meter>`
    expect(partTag(ssr(plain), 'indicator')).not.toContain('data-band')
    expect(hasPart(ssr(plain), 'tick')).toBe(false)
  })

  test('the reading is in the served markup', () => {
    expect(withoutStyles(ssr(banded))).toContain('94%')
  })

  test('the role is on internals, so the host stays as written', () => {
    expect(hostAttributes(ssr(banded), 'helix-meter')).toEqual([
      'high',
      'label',
      'low',
      'optimum',
      'show-value',
      'value',
    ])
  })
})
