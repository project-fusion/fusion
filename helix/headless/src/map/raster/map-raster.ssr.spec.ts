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

describe('map raster server output', () => {
  test('a raster draws nothing of its own, the renderer being what draws the tiles', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-map-raster label="Radar" src="radar/{z}/{x}/{y}.png"></helix-headless-map-raster>`,
      ),
    )
    // An empty shadow root: nothing between the template's tags but Lit's markers.
    expect(rendered(markup, 'helix-headless-map-raster').replace(/<!--[^>]*-->/g, '')).toMatch(
      /^<template[^>]*><\/template>/,
    )
    expect(servedParts(markup)).toEqual([])
  })

  test('the host carries the attributes the page wrote, and not the frame shown or the opacity', () => {
    const written = ssr(
      html`<helix-headless-map-raster label="Radar" frames="a/{z}/{x}/{y}.png b/{z}/{x}/{y}.png" playing interval="400"></helix-headless-map-raster>`,
    )
    expect(hostAttributes(written, 'helix-headless-map-raster')).toEqual([
      'frames',
      'interval',
      'label',
      'playing',
    ])
    const bare = ssr(html`<helix-headless-map-raster></helix-headless-map-raster>`)
    expect(hostAttributes(bare, 'helix-headless-map-raster')).toEqual([])
  })

  test('playing frames start no timer on the server, which would hold the render open', () => {
    const started: number[] = []
    const was = globalThis.setInterval
    globalThis.setInterval = ((...args: Parameters<typeof setInterval>) => {
      started.push(Number(args[1]))
      return was(...args)
    }) as typeof setInterval
    try {
      ssr(
        html`<helix-headless-map-raster label="Radar" frames="a b c" playing interval="100"></helix-headless-map-raster>`,
      )
    } finally {
      globalThis.setInterval = was
    }
    expect(started).toEqual([])
  })
})
