import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'

let deepContains: (root: Node, node: Node | null) => boolean

beforeAll(async () => {
  registerDom()
  ;({ deepContains } = await import('./focusable-elements.js'))
})

/** A host with a shadow root holding one button, the shape every control has. */
const control = (): { host: HTMLElement; inner: HTMLElement } => {
  const host = document.createElement('div')
  const root = host.attachShadow({ mode: 'open' })
  const inner = document.createElement('button')
  root.append(inner)
  return { host, inner }
}

describe('deepContains', () => {
  test('finds a node in the light DOM, the way `contains` already did', () => {
    const box = document.createElement('div')
    const child = document.createElement('span')
    box.append(child)
    expect(deepContains(box, child)).toBe(true)
  })

  test('finds a node inside a shadow root, which is the whole reason it exists', () => {
    /* The failure this replaces: `container.contains(deepActiveElement())`.
       `deepActiveElement` returns the `<button>` in a control's shadow root and
       `contains` walks `parentNode`, which is null at a shadow boundary, so the
       answer was false for every focused control in every dialog. */
    const box = document.createElement('div')
    const { host, inner } = control()
    box.append(host)
    expect(box.contains(inner)).toBe(false)
    expect(deepContains(box, inner)).toBe(true)
  })

  test('crosses more than one boundary, since components nest', () => {
    const box = document.createElement('div')
    const outer = control()
    const inner = control()
    outer.inner.append(inner.host)
    box.append(outer.host)
    expect(deepContains(box, inner.inner)).toBe(true)
  })

  test('is the element itself, so an item that is focused counts as holding it', () => {
    const box = document.createElement('div')
    expect(deepContains(box, box)).toBe(true)
  })

  test('says no to a sibling, rather than yes to everything', () => {
    const box = document.createElement('div')
    const other = document.createElement('div')
    const { host, inner } = control()
    other.append(host)
    expect(deepContains(box, inner)).toBe(false)
  })

  test('says no to null, which is what an unfocused document reports', () => {
    expect(deepContains(document.createElement('div'), null)).toBe(false)
  })
})
