import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'
import '../../checkbox/index.js'

const group = html`<helix-checkbox-group label="Verticals" name="verticals">
  <helix-checkbox value="design">Design</helix-checkbox>
  <helix-checkbox value="mind">Mind</helix-checkbox>
</helix-checkbox-group>`

describe('checkbox group server output', () => {
  test('every box is in the served markup', () => {
    const markup = withoutStyles(ssr(group))
    expect(markup).toContain('Design')
    expect(markup).toContain('Mind')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(group), 'helix-checkbox-group')).toEqual(['label', 'name'])
  })
})
