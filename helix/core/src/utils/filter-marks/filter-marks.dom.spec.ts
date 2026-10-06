import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

let marks: typeof import('./filter-marks.js')

beforeAll(async () => {
  registerDom()
  marks = await import('./filter-marks.js')
})

const row = (markup: string): HTMLElement => {
  const element = document.createElement('div')
  element.innerHTML = markup
  document.body.append(element)
  return element
}

describe('where a needle sits in an element', () => {
  test('a range over the matched words, without regard to case', () => {
    const [range] = marks.rangeOf(row('Ruby'), 'RU')
    expect(range?.toString()).toBe('Ru')
  })

  test('across the text nodes of elements inside it', () => {
    /* A match that begins in one node and ends in another. */
    const [range] = marks.rangeOf(row('Ro<b>bot</b>ics'), 'obo')
    expect(range?.toString()).toBe('obo')
  })

  test('nothing where it does not match, or where the needle is empty', () => {
    expect(marks.rangeOf(row('Go'), 'ru')).toEqual([])
    expect(marks.rangeOf(row('Go'), '')).toEqual([])
  })
})

/* happy-dom has neither `CSS.highlights` nor `Highlight`, so a registry of the
   same shape stands in for both, and is taken away after each case. */
describe('marking matches', () => {
  const registry = new Map<string, Set<Range>>()
  const global = globalThis as unknown as { Highlight?: unknown }
  const had = global.Highlight
  /* The test page's `CSS` is a getter that answers a new object each time, so
     the stand-in replaces the getter, and the getter comes back after. */
  const css = Object.getOwnPropertyDescriptor(globalThis, 'CSS')

  const install = (): void => {
    Object.defineProperty(globalThis, 'CSS', {
      configurable: true,
      value: { highlights: registry },
    })
    global.Highlight = class extends Set<Range> {
      constructor(...ranges: Range[]) {
        super(ranges)
      }
    }
  }

  afterEach(() => {
    if (css) {
      Object.defineProperty(globalThis, 'CSS', css)
    }
    global.Highlight = had
    registry.clear()
  })

  const marked = (): string[] =>
    [...(registry.get(marks.FILTER_MARK) ?? [])].map((range) => range.toString())

  test('marks the match in each element, under one name for the document', () => {
    install()
    const owner = row('x')
    marks.markMatches(owner, [row('Rust'), row('Go'), row('Ruby')], 'ru')
    expect(marked()).toEqual(['Ru', 'Ru'])
    marks.markMatches(owner, [], '')
  })

  test('keeps two owners` marks, and takes one owner`s away on an empty needle', () => {
    install()
    const first = row('x')
    const second = row('y')
    marks.markMatches(first, [row('Rust')], 'ru')
    marks.markMatches(second, [row('Go')], 'go')
    expect(marked()).toEqual(['Ru', 'Go'])
    marks.markMatches(first, [], '')
    expect(marked()).toEqual(['Go'])
    marks.markMatches(second, [], '')
    expect(registry.has(marks.FILTER_MARK)).toBe(false)
  })

  test('does nothing where the platform cannot paint a highlight', () => {
    expect(() => marks.markMatches(row('x'), [row('Rust')], 'ru')).not.toThrow()
    expect(registry.size).toBe(0)
  })
})
