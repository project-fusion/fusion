import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, ssr, withoutStyles } from '@helix-io/testing/ssr'
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
    expect(markup).toContain('datetime="2026-08-19T09:12"')
  })

  test('and the whole record is in the served markup', () => {
    /* Which is the point of a connector drawn by each entry rather than counted
       by the list: there is nothing to work out on the client, so a record is
       complete and correctly joined up before any script runs. */
    const markup = withoutStyles(
      ssr(html`<helix-headless-timeline label="History">
        <helix-headless-timeline-item datetime="2026-08-19">Deployed</helix-headless-timeline-item>
      </helix-headless-timeline>`),
    )
    expect(markup).toContain('Deployed')
  })

  test('the host carries nothing the consumer did not write', () => {
    const markup = ssr(html`<helix-headless-timeline label="History"></helix-headless-timeline>`)
    expect(hostAttributes(markup, 'helix-headless-timeline')).toEqual(['label'])
  })
})
