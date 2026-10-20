import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

let find: typeof import('./find-text.js')

beforeAll(async () => {
  registerDom()
  find = await import('./find-text.js')
})

afterEach(() => {
  document.body.innerHTML = ''
})

const content = (markup: string): HTMLElement => {
  const element = document.createElement('div')
  element.innerHTML = markup
  document.body.append(element)
  return element
}

const query = (search: string, options: Partial<import('./find-text.js').FindQuery> = {}) => ({
  caseSensitive: false,
  regex: false,
  replace: '',
  search,
  wholeWord: false,
  ...options,
})

const words = (ranges: Range[]): string[] => ranges.map((range) => range.toString())

describe('where a query matches in a text', () => {
  test('in any case, with the symbols of a search read as themselves', () => {
    expect(find.findRanges('Error: a.b and A.B', query('a.b'))).toEqual([
      [7, 10],
      [15, 18],
    ])
  })

  test('with case, whole words, and a regular expression where asked', () => {
    expect(find.findRanges('Error error', query('error', { caseSensitive: true }))).toEqual([
      [6, 11],
    ])
    expect(find.findRanges('end endless', query('end', { wholeWord: true }))).toEqual([[0, 3]])
    expect(find.findRanges('a1 b22', query('[a-z]\\d+', { regex: true }))).toEqual([
      [0, 2],
      [3, 6],
    ])
  })

  test('nothing for an empty search or a regular expression that cannot be read', () => {
    expect(find.findRanges('text', query(''))).toEqual([])
    expect(find.findRanges('text', query('(', { regex: true }))).toEqual([])
    expect(find.findPattern(query('(', { regex: true }))).toBeUndefined()
  })
})

describe('where a query matches in what a page shows', () => {
  test('across the elements inside one block', () => {
    expect(words(find.findTextRanges(content('<p>Ro<b>bot</b>ics</p>'), query('obo')))).toEqual([
      'obo',
    ])
  })

  test('never from one block into the next, so a whole word ends with its paragraph', () => {
    const root = content('<p>the end</p><p>less said</p>')
    expect(find.findTextRanges(root, query('endless'))).toEqual([])
    expect(words(find.findTextRanges(root, query('end', { wholeWord: true })))).toEqual(['end'])
  })

  test('never across a line break', () => {
    expect(find.findTextRanges(content('<p>one<br>two</p>'), query('onetwo'))).toEqual([])
  })

  test('not in code, a hidden element, or what is hidden from screen readers or skipped', () => {
    const root = content(
      [
        '<p>seen</p>',
        '<script>seen</script>',
        '<p hidden>seen</p>',
        '<p aria-hidden="true">seen</p>',
        '<p inert>seen</p>',
        '<p class="aside">seen</p>',
      ].join(''),
    )
    expect(find.findTextRanges(root, query('seen'), '.aside')).toHaveLength(1)
  })

  test('in what a search opens: hidden until found, or in a closed details', () => {
    const root = content(
      '<div hidden="until-found">found</div><details><summary>Title</summary>found</details>',
    )
    expect(find.findTextRanges(root, query('found'))).toHaveLength(2)
  })
})

/* happy-dom has neither `CSS.highlights` nor `Highlight`, so a registry of the
   same shape stands in for both, and is taken away after each case. */
describe('a finder over the text', () => {
  const registry = new Map<string, Set<Range> & { priority?: number }>()
  const global = globalThis as unknown as { Highlight?: unknown }
  const had = global.Highlight
  const css = Object.getOwnPropertyDescriptor(globalThis, 'CSS')

  const install = (): void => {
    Object.defineProperty(globalThis, 'CSS', {
      configurable: true,
      value: { highlights: registry },
    })
    global.Highlight = class extends Set<Range> {
      priority = 0
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

  const painted = (name: string): string[] =>
    [...(registry.get(name) ?? [])].map((range) => range.toString())

  test('makes the first match current, and moves around the ends either way', () => {
    const finder = find.textFinder(content('<p>Alpha alpha ALPHA</p>'))
    expect(finder.find(query('alpha'), 'first')).toEqual({ count: 3, index: 0 })
    expect(finder.find(query('alpha'), 'next')).toEqual({ count: 3, index: 1 })
    expect(finder.find(query('alpha'), 'previous')).toEqual({ count: 3, index: 0 })
    expect(finder.find(query('alpha'), 'previous')).toEqual({ count: 3, index: 2 })
    expect(finder.find(query('alpha'), 'next')).toEqual({ count: 3, index: 0 })
    finder.end()
  })

  test('stays on the current match while the reader types, where it still matches', () => {
    const finder = find.textFinder(content('<p>cat cart care</p>'))
    finder.find(query('ca'), 'first')
    expect(finder.find(query('ca'), 'next')).toEqual({ count: 3, index: 1 })
    expect(finder.find(query('car'), 'first')).toEqual({ count: 2, index: 0 })
    expect(finder.find(query('care'), 'first')).toEqual({ count: 1, index: 0 })
    finder.end()
  })

  test('paints every match, and the current one apart and above', () => {
    install()
    const finder = find.textFinder(content('<p>one two one</p>'))
    finder.find(query('one'), 'first')
    expect(painted(find.FIND_MATCH)).toHaveLength(1)
    expect(painted(find.FIND_CURRENT)).toEqual(['one'])
    expect(registry.get(find.FIND_CURRENT)?.priority).toBe(1)
    finder.end()
    expect(registry.has(find.FIND_MATCH)).toBe(false)
    expect(registry.has(find.FIND_CURRENT)).toBe(false)
  })

  test('keeps two finders` marks', () => {
    install()
    const first = find.textFinder(content('<p>one</p>'))
    const second = find.textFinder(content('<p>one one</p>'))
    first.find(query('one'), 'first')
    second.find(query('one'), 'first')
    expect(painted(find.FIND_CURRENT)).toHaveLength(2)
    expect(painted(find.FIND_MATCH)).toHaveLength(1)
    first.end()
    expect(painted(find.FIND_CURRENT)).toHaveLength(1)
    second.end()
  })

  test('opens what hides the current match until found, sending beforematch first', () => {
    const root = content('<p>one</p><div hidden="until-found">two</div>')
    const hidden = root.querySelector('div') as HTMLElement
    const heard: (string | null)[] = []
    hidden.addEventListener('beforematch', () => heard.push(hidden.getAttribute('hidden')))
    const finder = find.textFinder(root)
    finder.find(query('two'), 'first')
    expect(heard).toEqual(['until-found'])
    expect(hidden.hasAttribute('hidden')).toBe(false)
    finder.end()
  })

  test('opens a closed details whose content holds the current match', () => {
    const root = content('<details><summary>Title</summary>body</details>')
    const finder = find.textFinder(root)
    finder.find(query('body'), 'first')
    expect((root.querySelector('details') as HTMLDetailsElement).open).toBe(true)
    finder.end()
  })

  test('searches again once changed content is still, and reports where it stands', async () => {
    const root = content('<p>error</p>')
    const reports: import('./find-text.js').FindResult[] = []
    const finder = find.textFinder(root, { found: (result) => reports.push(result) })
    finder.find(query('error'), 'first')
    root.insertAdjacentHTML('beforeend', '<p>another error</p>')
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(reports).toEqual([{ count: 2, index: 0 }])
    finder.end()
    root.insertAdjacentHTML('beforeend', '<p>a third error</p>')
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(reports).toHaveLength(1)
  })
})
