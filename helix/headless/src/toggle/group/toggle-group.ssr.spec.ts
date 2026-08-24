import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const group = html`<helix-headless-toggle-group label="Color mode" value="light">
  <helix-headless-toggle value="light">Light</helix-headless-toggle>
  <helix-headless-toggle value="dark">Dark</helix-headless-toggle>
</helix-headless-toggle-group>`

describe('toggle group server output', () => {
  test('the labels are served, not built on the client', () => {
    expect(withoutStyles(ssr(group))).toContain('Light')
  })

  test('the group role is on internals, so the host stays as written', () => {
    expect(hostAttributes(ssr(group), 'helix-headless-toggle-group')).toEqual(['label', 'value'])
  })

  test('an item carries only the attributes the consumer gave it', () => {
    // `selected` is resolved from the group's value on the client. Reflecting
    // it on the server would put an attribute on markup React never had.
    expect(hostAttributes(ssr(group), 'helix-headless-toggle')).toEqual(['value'])
  })
})
