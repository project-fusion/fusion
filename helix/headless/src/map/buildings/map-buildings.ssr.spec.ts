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

describe('map buildings server output', () => {
  test('buildings draw nothing of their own, the renderer being what raises them', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-map-buildings></helix-headless-map-buildings>`),
    )
    // An empty shadow root: nothing between the template's tags but Lit's markers.
    expect(rendered(markup, 'helix-headless-map-buildings').replace(/<!--[^>]*-->/g, '')).toMatch(
      /^<template[^>]*><\/template>/,
    )
    expect(servedParts(markup)).toEqual([])
  })

  test('the host carries the attributes the page wrote, and not its default name', () => {
    const written = ssr(
      html`<helix-headless-map-buildings description="From zoom 13" group="city"></helix-headless-map-buildings>`,
    )
    expect(hostAttributes(written, 'helix-headless-map-buildings')).toEqual([
      'description',
      'group',
    ])
    const bare = ssr(html`<helix-headless-map-buildings></helix-headless-map-buildings>`)
    expect(hostAttributes(bare, 'helix-headless-map-buildings')).toEqual([])
  })
})
