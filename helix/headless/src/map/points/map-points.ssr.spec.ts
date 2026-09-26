import { describe, expect, test } from 'bun:test'
import { rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('map points server output', () => {
  test('points draw nothing of their own, the renderer being what draws them', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-map-points label="Cafés" src="/cafes.geojson"></helix-headless-map-points>`,
      ),
    )
    expect(rendered(markup, 'helix-headless-map-points').replace(/<!--[^>]*-->/g, '')).toMatch(
      /^<template[^>]*><\/template>/,
    )
  })
})
