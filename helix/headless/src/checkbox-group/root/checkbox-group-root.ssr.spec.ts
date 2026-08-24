import { describe, expect, test } from 'bun:test'
import { hostAttributes, ssr, withoutStyles } from '@helix-io/testing/ssr'
import { html } from 'lit'
import '../index.js'
import '../../checkbox/index.js'

const group = html`<helix-headless-checkbox-group label="Verticals" name="verticals">
  <helix-headless-checkbox value="design">Design</helix-headless-checkbox>
  <helix-headless-checkbox value="mind">Mind</helix-headless-checkbox>
</helix-headless-checkbox-group>`

describe('checkbox group server output', () => {
  test('every box is in the served markup', () => {
    const markup = withoutStyles(ssr(group))
    expect(markup).toContain('Design')
    expect(markup).toContain('Mind')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(group), 'helix-headless-checkbox-group')).toEqual(['label', 'name'])
  })
})
