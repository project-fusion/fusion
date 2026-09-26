import { describe, expect, test } from 'bun:test'
import { rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('map route and area server output', () => {
  test('a route and an area draw nothing of their own, the renderer being what draws them', () => {
    for (const tag of ['helix-headless-map-route', 'helix-headless-map-area'] as const) {
      const markup = withoutStyles(
        ssr(
          tag === 'helix-headless-map-route'
            ? html`<helix-headless-map-route label="Depot to Mission" points="1,1 2,2"></helix-headless-map-route>`
            : html`<helix-headless-map-area label="Zone" points="1,1 2,2 1,3"></helix-headless-map-area>`,
        ),
      )
      // An empty shadow root: nothing between the template's tags but Lit's markers.
      expect(rendered(markup, tag).replace(/<!--[^>]*-->/g, '')).toMatch(
        /^<template[^>]*><\/template>/,
      )
    }
  })
})
