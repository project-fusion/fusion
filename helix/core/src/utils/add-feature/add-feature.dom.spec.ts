import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* A feature's entry adds to the class, and an element already drawn draws again. */

let addFeature: typeof import('./add-feature.js').addFeature

beforeAll(async () => {
  registerDom()
  ;({ addFeature } = await import('./add-feature.js'))
})

describe('addFeature', () => {
  test('adds to the class and redraws its elements on the page, in shadow roots too', () => {
    let drawn = 0
    class Board extends HTMLElement {
      requestUpdate(): void {
        drawn += 1
      }
    }
    customElements.define('x-feature-board', Board)
    const outer = document.createElement('div')
    outer.attachShadow({ mode: 'open' }).innerHTML = '<x-feature-board></x-feature-board>'
    document.body.innerHTML = '<x-feature-board></x-feature-board>'
    document.body.append(outer)
    const minimap = (): string => 'minimap'
    addFeature(Board, { minimap })
    expect((Board as unknown as { minimap: unknown }).minimap).toBe(minimap)
    expect(drawn).toBe(2)
  })
})
