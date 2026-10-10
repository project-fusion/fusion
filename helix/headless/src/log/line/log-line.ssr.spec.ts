import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('log line server output', () => {
  const markup = ssr(html`<helix-headless-log-line level="error" at="2026-10-09T12:00:00Z"
    >Build failed</helix-headless-log-line
  >`)

  test('the row and the text are served, with the line’s own text in a slot', () => {
    expect(partTag(markup, 'line')).toContain('line-error')
    const own = rendered(
      ssr(html`<helix-headless-log-line></helix-headless-log-line>`),
      'helix-headless-log-line',
    ).replace(/<!--[^>]*-->/g, '')
    expect(own).toMatch(/part="text"><slot>/)
  })

  test('no number and no time are served, since only the log can say them', () => {
    expect(partTag(markup, 'number')).toBe('')
    expect(partTag(markup, 'time')).toBe('')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(markup, 'helix-headless-log-line').sort()).toEqual(['at', 'level'])
  })
})
