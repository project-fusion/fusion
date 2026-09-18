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
  test('an entry ships with its mark, the column its line is drawn in, and its time', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-timeline-item datetime="2026-08-19T09:12">Deployed</helix-headless-timeline-item>`,
      ),
    )
    expect(hasPart(markup, 'marker')).toBe(true)
    /* The rail, and no box for either half of the line: both are drawn on it,
       and a sheet arrives with the definition rather than in the markup. */
    expect(hasPart(markup, 'rail')).toBe(true)
    expect(hasPart(markup, 'connector')).toBe(false)
    /* Against the whole render this passed on the consumer's own
       `datetime="2026-08-19T09:12"` in the host tag, so it held with the
       binding on the `<time>` emptied out. The instant the reader's agent gets
       is the one on the rendered element. */
    expect(partTag(markup, 'time')).toContain('datetime="2026-08-19T09:12"')
  })

  test('and the list works nothing out, so an entry arrives already joined up', () => {
    /* Which is the point of a line each entry draws for itself rather than one
       counted by the list: there is nothing to work out on the client, so a
       record is complete and correctly joined up before any script runs.

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
