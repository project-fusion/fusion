import { expect, test } from 'bun:test'
import { hostAttributes, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

test('a preset serves its slot, and its host carries only what the page wrote', () => {
  const markup = ssr(
    html`<helix-headless-quick-filter view='{"sort":"a:asc"}'>A</helix-headless-quick-filter>`,
  )
  expect(rendered(markup, 'helix-headless-quick-filter')).toContain('<slot>')
  expect(hostAttributes(markup, 'helix-headless-quick-filter')).toEqual(['view'])
})
