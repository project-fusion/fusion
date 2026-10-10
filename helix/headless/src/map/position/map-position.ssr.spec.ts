import { describe, expect, test } from 'bun:test'
import {
  hostAttributes,
  partTag,
  rendered,
  servedParts,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const served = () =>
  withoutStyles(
    ssr(
      html`<helix-headless-map-position label="Van 12" lat="30.27" lng="-97.74" description="Two stops away"></helix-headless-map-position>`,
    ),
  )

describe('map position server output', () => {
  test('the position is a picture named by its label in the served markup, before any script runs', () => {
    const picture = partTag(served(), 'position')
    expect(picture).toContain('role="img"')
    expect(picture).toContain('aria-label="Van 12"')
  })

  test('a position with no label is named Live position', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-map-position lat="1" lng="2"></helix-headless-map-position>`),
    )
    expect(partTag(markup, 'position')).toContain('aria-label="Live position"')
  })

  test('its description is in the status from the first paint, for a reader who comes to the map', () => {
    const markup = served()
    expect(partTag(markup, 'status')).toContain('role="status"')
    expect(rendered(markup, 'helix-headless-map-position')).toMatch(
      /part="status"[^>]*>(<!--[^>]*-->)*Two stops away/,
    )
  })

  test('every mark is served, so a stylesheet draws the point before the connector places it', () => {
    expect(servedParts(served())).toEqual([
      'accuracy',
      'arrow',
      'dot',
      'heading',
      'position',
      'pulse',
      'status',
    ])
  })

  test('the host carries the attributes the page wrote, and no placement', () => {
    /* The connector places it through a sheet in its own shadow root, in the
       browser, so a server writes no `style` onto the page's element. */
    expect(hostAttributes(served(), 'helix-headless-map-position')).toEqual([
      'description',
      'label',
      'lat',
      'lng',
    ])
    const bare = ssr(html`<helix-headless-map-position></helix-headless-map-position>`)
    expect(hostAttributes(bare, 'helix-headless-map-position')).toEqual([])
  })
})
