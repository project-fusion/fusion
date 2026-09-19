import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * An id is unique to a tree, so the tree is what gets asked.
 *
 * **The guard on `getElementById` is the part worth a spec**, because twelve
 * call sites wrote `?.` and none of them said what it was for. What it is for
 * is measured here rather than assumed: an element that is not connected is its
 * own root, and an `HTMLElement` has no `getElementById`. Delete the `?.` and
 * the third test below throws instead of answering null, which is the reading
 * every one of those call sites was one detached element away from.
 *
 * A `DocumentFragment` is not a case and is checked here so nobody adds it to
 * the reasoning: `getElementById` comes from `NonElementParentNode`, which both
 * `Document` and `DocumentFragment` implement, so a bare fragment and a
 * `<template>`'s content both answer. The other half of the guard, the one this
 * process cannot see, is in `element-by-id.ssr.spec.ts`.
 */
let elementById: (from: Node, id: string, options?: { orDocument?: boolean }) => HTMLElement | null
let searchableById: (from: Node) => boolean

beforeAll(async () => {
  registerDom()
  const loaded = await import('./element-by-id.js')
  elementById = loaded.elementById
  searchableById = loaded.searchableById
})

describe('elementById', () => {
  test('finds an id in the document, for a component the page holds directly', () => {
    document.body.innerHTML = '<main id="main"></main><p id="near"></p>'
    const near = document.getElementById('near') as HTMLElement
    expect(elementById(near, 'main')?.tagName).toBe('MAIN')
  })

  test('finds an id in the shadow root it is asked from, and not the page copy', () => {
    document.body.innerHTML = '<main id="target">page</main><div id="host"></div>'
    const host = document.getElementById('host') as HTMLElement
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = '<section id="target">root</section><span id="asker"></span>'
    const asker = shadow.getElementById('asker') as HTMLElement
    expect(elementById(asker, 'target')?.textContent).toBe('root')
  })

  test('answers null from a detached element, whose root is itself and has no lookup', () => {
    document.body.innerHTML = '<main id="main"></main>'
    const loose = document.createElement('div')
    expect(loose.getRootNode()).toBe(loose)
    expect(elementById(loose, 'main')).toBeNull()
  })

  test('answers from a fragment, which carries the lookup the same as a document', () => {
    const fragment = document.createDocumentFragment()
    fragment.append(document.createElement('div'), document.createElement('p'))
    const first = fragment.firstElementChild as HTMLElement
    first.id = 'one'
    expect(elementById(first.nextElementSibling as HTMLElement, 'one')).toBe(first)
  })

  test('answers null for an id the tree does not hold, rather than the page copy', () => {
    document.body.innerHTML = '<main id="elsewhere">page</main><div id="host"></div>'
    const host = document.getElementById('host') as HTMLElement
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = '<span id="asker"></span>'
    const asker = shadow.getElementById('asker') as HTMLElement
    expect(elementById(asker, 'elsewhere')).toBeNull()
  })

  test('reaches the page with `orDocument`, which is what an anchor does', () => {
    document.body.innerHTML = '<main id="elsewhere">page</main><div id="host"></div>'
    const host = document.getElementById('host') as HTMLElement
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = '<span id="asker"></span>'
    const asker = shadow.getElementById('asker') as HTMLElement
    expect(elementById(asker, 'elsewhere', { orDocument: true })?.textContent).toBe('page')
  })

  test('prefers its own tree over the page even with `orDocument`', () => {
    document.body.innerHTML = '<main id="target">page</main><div id="host"></div>'
    const host = document.getElementById('host') as HTMLElement
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = '<section id="target">root</section><span id="asker"></span>'
    const asker = shadow.getElementById('asker') as HTMLElement
    expect(elementById(asker, 'target', { orDocument: true })?.textContent).toBe('root')
  })
})

describe('searchableById', () => {
  test('is true of a document and of a shadow root', () => {
    document.body.innerHTML = '<div id="host"></div>'
    const host = document.getElementById('host') as HTMLElement
    const shadow = host.attachShadow({ mode: 'open' })
    shadow.innerHTML = '<span id="inside"></span>'
    expect(searchableById(host)).toBe(true)
    expect(searchableById(shadow.getElementById('inside') as HTMLElement)).toBe(true)
  })

  test('is false of a detached element, which is the reading `elementById` flattens', () => {
    expect(searchableById(document.createElement('div'))).toBe(false)
  })
})
