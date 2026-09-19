import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * Which way the line runs, and what is answered where nothing can say.
 *
 * The direction itself is read from the computed style, which is what lays the
 * row out. The guard is the part worth asserting: eight of the callers this
 * was extracted from asked without one, and `ScatterChart` asks from its
 * render path, where a server shim is what answers.
 */
let isRtl: (element: Element) => boolean

beforeAll(async () => {
  registerDom()
  isRtl = (await import('./is-rtl.js')).isRtl
})

const host = (markup: string): HTMLElement => {
  document.body.innerHTML = markup
  return document.body.firstElementChild as HTMLElement
}

describe('which way the line an element sits on runs', () => {
  test('a document says nothing, so the line runs left to right', () => {
    expect(isRtl(host('<div></div>'))).toBe(false)
  })

  test('`dir` on the element itself is read the way a browser resolves it', () => {
    expect(isRtl(host('<div dir="rtl"></div>'))).toBe(true)
  })

  test('and `direction` without any attribute is read too, which is the whole point', () => {
    expect(isRtl(host('<div style="direction: rtl"></div>'))).toBe(true)
  })

  test('it is inherited, since a line belongs to the page and not to one box', () => {
    const outer = host('<div dir="rtl"><span></span></div>')
    expect(isRtl(outer.firstElementChild as Element)).toBe(true)
  })

  test('without `getComputedStyle` there is no layout, so the answer is left to right', () => {
    const element = host('<div dir="rtl"></div>')
    const measure = globalThis.getComputedStyle
    try {
      // @ts-expect-error a server shim is what this stands in for, and it has none
      globalThis.getComputedStyle = undefined
      expect(isRtl(element)).toBe(false)
    } finally {
      globalThis.getComputedStyle = measure
    }
  })
})
