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

describe('map terrain server output', () => {
  test('terrain draws nothing of its own, the renderer being what shades and raises the ground', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-map-terrain src="dem/{z}/{x}/{y}.png" raised></helix-headless-map-terrain>`,
      ),
    )
    // An empty shadow root: nothing between the template's tags but Lit's markers.
    expect(rendered(markup, 'helix-headless-map-terrain').replace(/<!--[^>]*-->/g, '')).toMatch(
      /^<template[^>]*><\/template>/,
    )
    expect(servedParts(markup)).toEqual([])
  })

  test('the host carries the attributes the page wrote, and not the encoding or exaggeration it defaults to', () => {
    const written = ssr(
      html`<helix-headless-map-terrain src="dem/{z}/{x}/{y}.png" raised exaggeration="1.5"></helix-headless-map-terrain>`,
    )
    expect(hostAttributes(written, 'helix-headless-map-terrain')).toEqual([
      'exaggeration',
      'raised',
      'src',
    ])
    const bare = ssr(html`<helix-headless-map-terrain></helix-headless-map-terrain>`)
    expect(hostAttributes(bare, 'helix-headless-map-terrain')).toEqual([])
  })
})
