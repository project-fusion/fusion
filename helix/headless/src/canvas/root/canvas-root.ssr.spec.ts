import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  partTag,
  rendered,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const BOARD = {
  edges: [{ fromNode: 'a', id: 'e1', toNode: 'b' }],
  nodes: [
    { height: 100, id: 'a', text: 'First', type: 'text' as const, width: 200, x: 0, y: 0 },
    { height: 100, id: 'b', text: 'Second', type: 'text' as const, width: 200, x: 260, y: 0 },
  ],
}

const served = (extra = {}) =>
  withoutStyles(
    ssr(
      html`<helix-headless-canvas label="A board" .data=${{ ...BOARD, ...extra }}></helix-headless-canvas>`,
    ),
  )

describe('canvas server output', () => {
  test('the whole board is in the served markup, not drawn after hydration', () => {
    /* This is why the document is a property rather than a URL: what a fetch
       returns cannot be server-rendered, and a board that arrived only with the
       JavaScript would be empty to a crawler and to a reader before it lands. */
    const markup = served()
    expect(rendered(markup, 'helix-headless-canvas')).toContain('First')
    expect(rendered(markup, 'helix-headless-canvas')).toContain('Second')
    expect(hasPart(markup, 'board')).toBe(true)
  })

  test('the cards ship placed, so nothing jumps when the JavaScript lands', () => {
    expect(partTag(markup(), 'card')).toContain('--_canvas-card-x')
  })

  test('the connectors ship drawn', () => {
    expect(hasPart(served(), 'edges')).toBe(true)
    expect(partTag(served(), 'edge')).toContain('d="M')
  })

  test('the reading list ships with the board, which is the point of it', () => {
    /* A list built on the client is a way around the board that a reader without
       JavaScript does not have. */
    const markup = served()
    expect(hasPart(markup, 'index')).toBe(true)
    expect(partTag(markup, 'index')).toContain('aria-label="Cards on this board"')
  })

  test('the name is on the host through internals rather than as an attribute', () => {
    expect(hostAttributes(served(), 'helix-headless-canvas')).not.toContain('aria-label')
    expect(partTag(served(), 'region')).toContain('aria-label="A board"')
  })

  test('the tab stop is served, so the keys work before hydration finishes', () => {
    expect(partTag(served(), 'region')).toContain('tabindex="0"')
  })
})

/** The served markup, for the assertions that read one part of it. */
const markup = () => served()
