import { describe, expect, test } from 'bun:test'
import { exportParts } from './export-parts.js'

describe('parts forwarded under a prefix', () => {
  test('each part is exported as the prefix, a hyphen and its own name', () => {
    expect(exportParts(['button', 'text', 'spinner'], 'copy')).toBe(
      'button: copy-button, text: copy-text, spinner: copy-spinner',
    )
  })

  test('no parts is an empty list, which forwards nothing', () => {
    expect(exportParts([], 'copy')).toBe('')
  })
})
