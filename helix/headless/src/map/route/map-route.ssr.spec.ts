import { describe, expect, test } from 'bun:test'
import { rendered, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('map route server output', () => {
  test('a route draws nothing of its own, the renderer being what draws it', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-map-route label="Depot to Mission" points="1,1 2,2"></helix-headless-map-route>`,
      ),
    )
    // An empty shadow root: nothing between the template's tags but Lit's markers.
    expect(rendered(markup, 'helix-headless-map-route').replace(/<!--[^>]*-->/g, '')).toMatch(
      /^<template[^>]*><\/template>/,
    )
  })
})
