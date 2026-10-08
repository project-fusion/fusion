import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* A feature's sheet goes after the element's own, once however often it draws. */

let adoptSheet: typeof import('./adopt-sheet.js').adoptSheet
let css: typeof import('lit').css

beforeAll(async () => {
  registerDom()
  ;({ adoptSheet } = await import('./adopt-sheet.js'))
  ;({ css } = await import('lit'))
})

describe('adoptSheet', () => {
  test('adds the sheet after the root’s own, once', () => {
    const host = document.createElement('div')
    const root = host.attachShadow({ mode: 'open' })
    const own = new CSSStyleSheet()
    root.adoptedStyleSheets = [own]
    const feature = css`
      :host {
        color: red;
      }
    `
    adoptSheet(host, feature)
    adoptSheet(host, feature)
    expect(root.adoptedStyleSheets.length).toBe(2)
    expect(root.adoptedStyleSheets[0]).toBe(own)
    expect(root.adoptedStyleSheets[1]).toBe(feature.styleSheet as CSSStyleSheet)
  })

  test('does nothing without a shadow root or a sheet', () => {
    const host = document.createElement('div')
    expect(() => adoptSheet(host, undefined)).not.toThrow()
    const root = host.attachShadow({ mode: 'open' })
    adoptSheet(host, undefined)
    expect(root.adoptedStyleSheets.length).toBe(0)
  })
})
