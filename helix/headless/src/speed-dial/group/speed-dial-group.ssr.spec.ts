import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('speed dial group server output', () => {
  test('the group and its name are in the served markup', () => {
    const served = ssr(
      html`<helix-headless-speed-dial-group label="Share"></helix-headless-speed-dial-group>`,
    )
    expect(partTag(served, 'group')).toContain('role="group"')
    expect(partTag(served, 'group')).toContain('aria-labelledby="label"')
    expect(served).toContain('Share')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(
      hostAttributes(
        ssr(
          html`<helix-headless-speed-dial-group label="Share"></helix-headless-speed-dial-group>`,
        ),
        'helix-headless-speed-dial-group',
      ),
    ).toEqual(['label'])
  })
})
