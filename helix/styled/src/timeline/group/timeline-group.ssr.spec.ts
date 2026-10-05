import { describe, expect, test } from 'bun:test'
import { hostAttributes, servedParts, ssr, styles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-timeline-group'

/* The styled group serves what the base does, with the sheet that sets its
   heading and lays its entries out in the timeline's direction. */
describe('styled timeline group server output', () => {
  const markup = ssr(html`<helix-timeline-group label="Today"></helix-timeline-group>`)

  test('serves the heading and the entries, and nothing on the host', () => {
    expect(servedParts(markup)).toEqual(['entries', 'heading'])
    expect(hostAttributes(markup, TAG)).toEqual(['label'])
  })

  test('the entries follow the timeline across the page', () => {
    expect(styles(markup)).toContain('var(--_timeline-direction, column)')
    expect(styles(markup)).toContain('var(--timeline-group-heading-color,')
  })
})
