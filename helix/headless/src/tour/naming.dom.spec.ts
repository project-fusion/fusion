import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { stopNaming } from './naming.js'

beforeAll(() => {
  registerDom()
})

const make = (markup: string): Element[] => {
  const box = document.createElement('div')
  box.innerHTML = markup
  return [...box.children]
}

const words = (elements: Element[]): string[] => elements.map((one) => one.textContent ?? '')
let progress: Element
beforeAll(() => {
  progress = make('<span>2 of 5</span>')[0] as Element
})

describe('what names a tour stop', () => {
  test('its heading slot first', () => {
    const named = stopNaming({
      content: make('<h2>In the content</h2>'),
      description: [],
      heading: make('<span>Projects</span>'),
      labeled: false,
      progress,
    })
    expect(words(named.labelledBy)).toEqual(['Projects'])
  })

  test('then the first heading in its content', () => {
    const named = stopNaming({
      content: make('<div><h3>Filters</h3><h3>Second</h3></div><p>Text</p>'),
      description: [],
      heading: [],
      labeled: false,
      progress,
    })
    expect(words(named.labelledBy)).toEqual(['Filters'])
  })

  test('then its own label, which names it from outside this list', () => {
    const named = stopNaming({
      content: make('<p>Text</p>'),
      description: [],
      heading: [],
      labeled: true,
      progress,
    })
    expect(named.labelledBy).toEqual([])
  })

  test('and its place in the tour where it has nothing else', () => {
    const named = stopNaming({
      content: make('<p>Text</p>'),
      description: [],
      heading: [],
      labeled: false,
      progress,
    })
    expect(words(named.labelledBy)).toEqual(['2 of 5'])
    expect(named.describedBy).toEqual([])
  })
})

describe('what describes a tour stop', () => {
  test('its description slot, then its place in the tour', () => {
    const named = stopNaming({
      content: make('<h2>Filters</h2>'),
      description: make('<p>Narrow the list.</p>'),
      heading: [],
      labeled: false,
      progress,
    })
    expect(words(named.describedBy)).toEqual(['Narrow the list.', '2 of 5'])
  })
})
