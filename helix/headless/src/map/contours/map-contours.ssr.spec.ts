import { describe, expect, test } from 'bun:test'
import {
  hostAttributes,
  rendered,
  servedParts,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('map contours server output', () => {
  test('contour lines draw nothing of their own, the renderer being what traces them', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-map-contours src="dem/{z}/{x}/{y}.png"></helix-headless-map-contours>`,
      ),
    )
    // An empty shadow root: nothing between the template's tags but Lit's markers.
    expect(rendered(markup, 'helix-headless-map-contours').replace(/<!--[^>]*-->/g, '')).toMatch(
      /^<template[^>]*><\/template>/,
    )
    expect(servedParts(markup)).toEqual([])
  })

  test('the host carries the attributes the page wrote, and not the encoding or unit it defaults to', () => {
    const written = ssr(
      html`<helix-headless-map-contours src="dem/{z}/{x}/{y}.png" unit="feet" max-zoom="12" attribution="Elevation by Example"></helix-headless-map-contours>`,
    )
    expect(hostAttributes(written, 'helix-headless-map-contours')).toEqual([
      'attribution',
      'max-zoom',
      'src',
      'unit',
    ])
    const bare = ssr(html`<helix-headless-map-contours></helix-headless-map-contours>`)
    expect(hostAttributes(bare, 'helix-headless-map-contours')).toEqual([])
  })
})
