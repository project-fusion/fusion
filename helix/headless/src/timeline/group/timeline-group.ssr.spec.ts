import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, servedParts, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const TAG = 'helix-headless-timeline-group'

/* A group is served whole: its heading is a property, so the day is in the
   markup before anything runs. */
describe('timeline group server output', () => {
  const markup = ssr(
    html`<helix-headless-timeline-group label="Yesterday"></helix-headless-timeline-group>`,
  )

  test('serves the heading and the list of entries', () => {
    expect(servedParts(markup)).toEqual(['entries', 'heading'])
    expect(partTag(markup, 'heading')).toContain('role="heading"')
    expect(partTag(markup, 'entries')).toContain('role="list"')
  })

  test('the label is served as the fallback of the slot that replaces it', () => {
    expect(rendered(markup, TAG)).toMatch(/<slot name="heading">(<!--[^>]*-->)*Yesterday/)
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(markup, TAG)).toEqual(['label'])
  })
})
