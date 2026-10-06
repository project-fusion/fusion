import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * Which toolbar an element sits in, and which way it runs: the one answer
 * Toolbar, Toggle Group and Divider each read.
 */
let toolbarAround: (element: Element) => Element | null
let toolbarAxis: (toolbar: Element) => 'horizontal' | 'vertical'

beforeAll(async () => {
  registerDom()
  ;({ toolbarAround, toolbarAxis } = await import('./toolbar-around.js'))
})

const probe = (markup: string): Element => {
  document.body.innerHTML = markup
  return document.querySelector('#probe') as Element
}

describe('the toolbar around an element', () => {
  test('a page toolbar by its role', () => {
    const element = probe('<div role="toolbar"><span><b id="probe"></b></span></div>')
    expect(toolbarAround(element)?.getAttribute('role')).toBe('toolbar')
  })

  test('either tier of Toolbar by its tag', () => {
    expect(
      toolbarAround(probe('<helix-toolbar><b id="probe"></b></helix-toolbar>'))?.localName,
    ).toBe('helix-toolbar')
    expect(
      toolbarAround(probe('<helix-headless-toolbar><b id="probe"></b></helix-headless-toolbar>'))
        ?.localName,
    ).toBe('helix-headless-toolbar')
  })

  test('never the element itself', () => {
    expect(toolbarAround(probe('<helix-toolbar id="probe"></helix-toolbar>'))).toBeNull()
    expect(toolbarAround(probe('<div role="toolbar" id="probe"></div>'))).toBeNull()
  })

  test('nothing outside one', () => {
    expect(toolbarAround(probe('<div role="group"><b id="probe"></b></div>'))).toBeNull()
  })

  test('an element with no parent', () => {
    expect(toolbarAround(document.createElement('b'))).toBeNull()
  })
})

describe('the axis it runs along', () => {
  test('horizontal unless something says vertical', () => {
    expect(toolbarAxis(probe('<div role="toolbar" id="probe"></div>'))).toBe('horizontal')
    expect(toolbarAxis(probe('<helix-toolbar id="probe"></helix-toolbar>'))).toBe('horizontal')
  })

  test("Toolbar's `orientation`", () => {
    expect(
      toolbarAxis(probe('<helix-toolbar id="probe" orientation="vertical"></helix-toolbar>')),
    ).toBe('vertical')
  })

  test("the page's `aria-orientation`", () => {
    expect(
      toolbarAxis(probe('<div role="toolbar" id="probe" aria-orientation="vertical"></div>')),
    ).toBe('vertical')
  })
})
