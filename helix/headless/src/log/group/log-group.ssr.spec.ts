import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('log group server output', () => {
  const markup = ssr(html`<helix-headless-log-group heading="Install" status="failed" duration="12s"
    ><helix-headless-log-line>npm ERR!</helix-headless-log-line></helix-headless-log-group
  >`)

  test('the heading is a shut disclosure, its lines hidden until found', () => {
    const summary = partTag(markup, 'summary')
    expect(summary).toContain('aria-expanded="false"')
    expect(summary).toContain('aria-controls="content"')
    expect(partTag(markup, 'content')).toContain('hidden="until-found"')
  })

  test('the status, the heading, and the duration are served', () => {
    expect(partTag(markup, 'status')).toContain('aria-hidden="true"')
    const own = rendered(markup, 'helix-headless-log-group')
    const text = own.replace(/<!--[^>]*-->/g, '')
    expect(text).toContain('<slot name="heading">Install</slot>')
    expect(text).toMatch(/data-spoken[^>]*>failed</)
    expect(text).toMatch(/part="duration">12s</)
  })

  test('an open group is served open', () => {
    const open = ssr(
      html`<helix-headless-log-group heading="Test" default-open></helix-headless-log-group>`,
    )
    expect(partTag(open, 'summary')).toContain('aria-expanded="true"')
    expect(partTag(open, 'content')).not.toContain('hidden')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(markup, 'helix-headless-log-group').sort()).toEqual([
      'duration',
      'heading',
      'status',
    ])
  })
})
