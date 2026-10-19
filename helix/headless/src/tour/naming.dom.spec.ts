import '@fusion.dev/helix-testing/dom/register'
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
    expect(words(named.describedBy)).toEqual(['Text'])
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

  test('the words at the start of its content where the description slot is empty', () => {
    const named = stopNaming({
      content: make('<h3>Filters</h3><p>Narrow the list.</p><button>Reset</button><p>After</p>'),
      description: [],
      heading: [],
      labeled: false,
      progress,
    })
    expect(words(named.labelledBy)).toEqual(['Filters'])
    expect(words(named.describedBy)).toEqual(['Narrow the list.', '2 of 5'])
  })

  test('a card’s text, and not the title inside it that names the panel', () => {
    const named = stopNaming({
      content: make('<div class="card"><h3>Filters</h3><p>Narrow the list.</p></div>'),
      description: [],
      heading: [],
      labeled: false,
      progress,
    })
    expect(words(named.labelledBy)).toEqual(['Filters'])
    expect(words(named.describedBy)).toEqual(['Narrow the list.', '2 of 5'])
  })

  test('the region around its content where the content is words alone', () => {
    const region = make('<div part="content"></div>')[0] as Element
    const named = stopNaming({
      content: [],
      description: [],
      heading: [],
      labeled: true,
      loose: region,
      progress,
    })
    expect(named.describedBy.length).toBe(2)
    expect(named.describedBy[0] === region && named.describedBy[1] === progress).toBe(true)
  })
})
