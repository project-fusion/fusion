import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const group = html`<helix-base-button-group label="Text alignment">
  <helix-base-button>Left</helix-base-button>
  <helix-base-button>Right</helix-base-button>
</helix-base-button-group>`

describe('button group server output', () => {
  test('the buttons are served, not built on the client', () => {
    const markup = withoutStyles(ssr(group))
    expect(markup).toContain('Left')
    expect(markup).toContain('Right')
  })

  test('the group role is on internals, so the host stays as written', () => {
    expect(hostAttributes(ssr(group), 'helix-base-button-group')).toEqual(['label'])
  })
})
