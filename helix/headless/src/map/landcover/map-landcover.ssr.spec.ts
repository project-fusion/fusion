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

describe('map landcover server output', () => {
  test('land cover draws nothing of its own, the renderer being what colors the ground', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-map-landcover></helix-headless-map-landcover>`),
    )
    // An empty shadow root: nothing between the template's tags but Lit's markers.
    expect(rendered(markup, 'helix-headless-map-landcover').replace(/<!--[^>]*-->/g, '')).toMatch(
      /^<template[^>]*><\/template>/,
    )
    expect(servedParts(markup)).toEqual([])
  })

  test('the host carries the attributes the page wrote, and not its default name', () => {
    const written = ssr(
      html`<helix-headless-map-landcover label="Vegetation" description="Forest and grass"></helix-headless-map-landcover>`,
    )
    expect(hostAttributes(written, 'helix-headless-map-landcover')).toEqual([
      'description',
      'label',
    ])
    const bare = ssr(html`<helix-headless-map-landcover></helix-headless-map-landcover>`)
    expect(hostAttributes(bare, 'helix-headless-map-landcover')).toEqual([])
  })
})
