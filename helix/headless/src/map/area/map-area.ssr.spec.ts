import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  hostTag,
  rendered,
  servedParts,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('map area server output', () => {
  test('an area draws nothing of its own, the renderer being what draws it', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-map-area label="Zone" caption="A" points="1,1 2,2 1,3"></helix-headless-map-area>`,
      ),
    )
    // An empty shadow root: nothing between the template's tags but Lit's markers.
    expect(rendered(markup, 'helix-headless-map-area').replace(/<!--[^>]*-->/g, '')).toMatch(
      /^<template[^>]*><\/template>/,
    )
    expect(servedParts(markup)).toEqual([])
  })

  test('the host carries the attributes the page wrote, and no default of its own', () => {
    const written = ssr(
      html`<helix-headless-map-area label="Zone" caption="A" points="1,1 2,2 1,3"></helix-headless-map-area>`,
    )
    expect(hostAttributes(written, 'helix-headless-map-area')).toEqual([
      'caption',
      'label',
      'points',
    ])
    const bare = ssr(html`<helix-headless-map-area></helix-headless-map-area>`)
    expect(hostAttributes(bare, 'helix-headless-map-area')).toEqual([])
  })

  test('served in a frame, it is the frame’s child, and the frame lists it once the browser knows its children', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-map label="Deliveries"><helix-headless-map-area label="Delivery zone" points="1,1 2,2 1,3"></helix-headless-map-area></helix-headless-map>`,
      ),
    )
    /* The server renders the frame with no children to read, so the list of
       layers is written in the browser. */
    expect(hasPart(markup, 'layers')).toBe(false)
    // After the frame's own shadow root closes: light DOM, in the frame's slot.
    const child = hostTag(markup, 'helix-headless-map-area')
    expect(child).toContain('label="Delivery zone"')
    expect(markup.indexOf(child)).toBeGreaterThan(markup.indexOf('</template>'))
  })
})
