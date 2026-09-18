import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

let deepContains: (root: Node, node: Node | null) => boolean
let focusableElements: (root: HTMLElement) => HTMLElement[]

beforeAll(async () => {
  registerDom()
  ;({ deepContains, focusableElements } = await import('./focusable-elements.js'))
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
    /* `contains` walks `parentNode`, which is null at a shadow boundary, so
       `container.contains(deepActiveElement())` answers false for every focused
       control in every dialog. */
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

/**
 * What the reader can reach with Tab, and the order they reach it in.
 *
 * Document order is the contract. Two lists concatenated, every native element
 * and then every delegating host, is not document order, and the difference is
 * invisible in a set that is all one kind. A caller reading the ends of this
 * list as the boundaries of a surface gets a last that is not last wherever
 * that surface's final control is a plain `<button>`.
 *
 * **`delegatesFocus` is declared rather than requested.** happy-dom accepts the
 * option to `attachShadow` and reports the flag as false, so a delegating host
 * cannot be arranged there at all. It is the input to the decision; everything
 * around it is real.
 */
const delegating = (id: string): HTMLElement => {
  const host = document.createElement('div')
  host.id = id
  const root = host.attachShadow({ mode: 'open' })
  Object.defineProperty(root, 'delegatesFocus', { value: true })
  root.innerHTML = '<button>inner</button>'
  return host
}

const ids = (root: HTMLElement): string =>
  focusableElements(root)
    .map((one) => one.id)
    .join(' ')

describe('focusableElements', () => {
  test('finds what the platform focuses, without naming a single component', () => {
    document.body.innerHTML =
      '<div id="t"><a id="a" href="#x">a</a><button id="b">b</button><input id="c"><textarea id="d"></textarea><select id="e"></select><span id="f" tabindex="0"></span></div>'
    expect(ids(document.getElementById('t') as HTMLElement)).toBe('a b c d e f')
  })

  test('and a host that delegates focus, which is how a component is reachable', () => {
    document.body.innerHTML = '<div id="t"></div>'
    const root = document.getElementById('t') as HTMLElement
    root.append(delegating('one'))
    expect(ids(root)).toBe('one')
  })

  /* Two queries concatenated put natives first and hosts after: `a b c d` in
     the markup comes back `b d a c`. */
  test('in document order, natives and hosts interleaved as they are written', () => {
    document.body.innerHTML = '<div id="t"></div>'
    const root = document.getElementById('t') as HTMLElement
    root.append(delegating('a'))
    root.insertAdjacentHTML('beforeend', '<button id="b">b</button>')
    root.append(delegating('c'))
    root.insertAdjacentHTML('beforeend', '<button id="d">d</button>')
    expect(ids(root)).toBe('a b c d')
  })

  test('once each, where something answers both questions', () => {
    document.body.innerHTML = '<div id="t"></div>'
    const root = document.getElementById('t') as HTMLElement
    const both = delegating('both')
    both.tabIndex = 0
    root.append(both)
    expect(ids(root)).toBe('both')
  })

  test('skipping anything disabled, which the platform will not focus either', () => {
    document.body.innerHTML =
      '<div id="t"><button id="a">a</button><button id="b" disabled>b</button><input id="c" disabled></div>'
    expect(ids(document.getElementById('t') as HTMLElement)).toBe('a')
  })

  test('and anything explicitly taken out of the tab order', () => {
    document.body.innerHTML =
      '<div id="t"><span id="a" tabindex="0"></span><span id="b" tabindex="-1"></span></div>'
    expect(ids(document.getElementById('t') as HTMLElement)).toBe('a')
  })

  /* Visibility is `getClientRects()` rather than `offsetParent`, which is null
     for anything inside a `position: fixed` container. A drawer is exactly
     that, so the `offsetParent` test excluded every control in the thing being
     raised. */
  test('and anything that draws nothing, tested by its boxes rather than its offset parent', () => {
    document.body.innerHTML = '<div id="t"><button id="a">a</button><button id="b">b</button></div>'
    const root = document.getElementById('t') as HTMLElement
    const gone = document.getElementById('b') as HTMLElement
    gone.getClientRects = (() => []) as unknown as typeof gone.getClientRects
    expect(ids(root)).toBe('a')
  })
})
