import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('styled log server output', () => {
  const markup = ssr(html`<helix-log label="Deploy" wrap>
    <helix-log-group heading="Build" status="failed" default-open>
      <helix-log-line level="error">Build failed</helix-log-line>
    </helix-log-group>
  </helix-log>`)

  test('serves the log as the headless tier does', () => {
    expect(partTag(markup, 'log')).toContain('role="log"')
    expect(partTag(markup, 'summary')).toContain('aria-expanded="true"')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(markup, 'helix-log').sort()).toEqual(['label', 'wrap'])
  })
})
