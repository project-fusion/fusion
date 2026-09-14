import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  partTag,
  ssr,
  styles,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('divider server output', () => {
  test('both halves of the rule and the region between them ship', () => {
    const markup = withoutStyles(ssr(html`<helix-divider>OR</helix-divider>`))
    expect(markup.match(/<div\s[^>]*part="line"/g)).toHaveLength(2)
    expect(hasPart(markup, 'content')).toBe(true)
    expect(markup).toContain('OR')
  })

  test('a plain rule is presentation, and an announced one a separator with its axis', () => {
    expect(partTag(ssr(html`<helix-divider></helix-divider>`), 'line')).toContain(
      'role="presentation"',
    )
    const announced = partTag(
      ssr(html`<helix-divider announced orientation="vertical"></helix-divider>`),
      'line',
    )
    expect(announced).toContain('role="separator"')
    expect(announced).toContain('aria-orientation="vertical"')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(html`<helix-divider></helix-divider>`), 'helix-divider')).toEqual([])
    expect(
      hostAttributes(
        ssr(html`<helix-divider announced orientation="vertical"></helix-divider>`),
        'helix-divider',
      ),
    ).toEqual(['announced', 'orientation'])
  })

  test('declarative shadow DOM carries the styles', () => {
    const served = ssr(html`<helix-divider></helix-divider>`)
    expect(withoutStyles(served)).toContain('shadowrootmode="open"')
    expect(styles(served)).toContain('--divider-color')
  })
})
