import { describe, expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'
import '../../checkbox/index.js'

const group = html`<helix-headless-checkbox-group label="Verticals" name="verticals">
  <helix-headless-checkbox value="design">Design</helix-headless-checkbox>
  <helix-headless-checkbox value="mind">Mind</helix-headless-checkbox>
</helix-headless-checkbox-group>`

describe('checkbox group server output', () => {
  test('the region every box lands in is served', () => {
    /* `toContain('Design')` read the group's own light-DOM children back out of
       the render, so it passed with the group rendering no slot at all. Read
       off a group with no children: the only shadow root is the group's own. */
    const markup = ssr(
      html`<helix-headless-checkbox-group
        label="Verticals"
        name="verticals"
      ></helix-headless-checkbox-group>`,
    )
    expect(rendered(markup, 'helix-headless-checkbox-group')).toMatch(
      /part="items">(\s|<!--[^>]*-->)*<slot\s*>/,
    )
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(group), 'helix-headless-checkbox-group')).toEqual(['label', 'name'])
  })
})
