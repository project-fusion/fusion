import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  partTag,
  rendered,
  servedParts,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('timeline server output', () => {
  test('an entry ships with its mark, its line and its time', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-timeline-item datetime="2026-08-19T09:12">Deployed</helix-headless-timeline-item>`,
      ),
    )
    expect(hasPart(markup, 'marker')).toBe(true)
    expect(hasPart(markup, 'connector')).toBe(true)
    /* Against the whole render this passed on the consumer's own
       `datetime="2026-08-19T09:12"` in the host tag, so it held with the
       binding on the `<time>` emptied out. The instant the reader's agent gets
       is the one on the rendered element. */
    expect(partTag(markup, 'time')).toContain('datetime="2026-08-19T09:12"')
  })

  test('and the list works nothing out, so an entry arrives already joined up', () => {
    /* Which is the point of a connector drawn by each entry rather than counted
       by the list: there is nothing to work out on the client, so a record is
       complete and correctly joined up before any script runs.

       `toContain('Deployed')` said none of that. The word was the spec's own
       light-DOM entry, echoed back whatever the list did with it. What the list
       owes is a bare slot and no part of its own. */
    const markup = ssr(html`<helix-headless-timeline label="History"></helix-headless-timeline>`)
    expect(servedParts(markup)).toEqual([])
    expect(rendered(markup, 'helix-headless-timeline')).toContain('<slot></slot>')
  })

  test('the host carries nothing the consumer did not write', () => {
    const markup = ssr(html`<helix-headless-timeline label="History"></helix-headless-timeline>`)
    expect(hostAttributes(markup, 'helix-headless-timeline')).toEqual(['label'])
  })
})
