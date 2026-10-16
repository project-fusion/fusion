import { describe, expect, test } from 'bun:test'
import { MarkdownStream, visibleText } from './stream.js'

describe('visibleText', () => {
  test('holds a last line that is only a marker so far', () => {
    expect(visibleText('a\n#')).toBe('a\n')
    expect(visibleText('a\n##')).toBe('a\n')
    expect(visibleText('a\n-')).toBe('a\n')
    expect(visibleText('a\n1.')).toBe('a\n')
    expect(visibleText('a\n``')).toBe('a\n')
    expect(visibleText('a\n  - -')).toBe('a\n')
  })

  test('draws a marker once it is decided', () => {
    expect(visibleText('a\n# T')).toBe('a\n# T')
    expect(visibleText('a\n- i')).toBe('a\n- i')
    expect(visibleText('a\n#tag')).toBe('a\n#tag')
  })

  test('holds the opening line of a fence until its language is whole', () => {
    expect(visibleText('a\n```ty')).toBe('a\n')
    expect(visibleText('a\n```ts\nco')).toBe('a\n```ts\nco')
  })

  test('holds the start of an alert', () => {
    expect(visibleText('> [!NO')).toBe('')
    expect(visibleText('> [link')).toBe('> [link')
  })

  test('holds a first pipe line until the next line shows whether it is a header', () => {
    expect(visibleText('a\n| x | y')).toBe('a\n')
    expect(visibleText('a\n| x | y |\n')).toBe('a\n')
    expect(visibleText('a\n| x | y |\n| -')).toBe('a\n')
    expect(visibleText('a\n| x | y |\nmore')).toBe('a\n| x | y |\nmore')
    expect(visibleText('| x |\n| - |\n| 1')).toBe('| x |\n| - |\n| 1')
  })
})

describe('MarkdownStream', () => {
  test('counts every block but the last as closed while the text is arriving', () => {
    const stream = new MarkdownStream()
    expect(stream.read('# a\n\nb', false).closed).toBe(1)
    expect(stream.read('# a\n\nb\n\nc', false).closed).toBe(2)
    expect(stream.read('# a\n\nb\n\nc', true).closed).toBe(3)
  })

  test('keeps the closed blocks it read, as the same objects', () => {
    const stream = new MarkdownStream()
    const first = stream.read('# a\n\nb', false).blocks[0]
    expect(stream.read('# a\n\nb c\n\nd', false).blocks[0]).toBe(first)
  })

  test('starts over on a text that does not extend the last', () => {
    const stream = new MarkdownStream()
    stream.read('# a\n\nb', false)
    expect(stream.read('c', false).blocks).toEqual([{ kind: 'paragraph', text: 'c' }])
  })

  test('reads a fence growing line by line as one block', () => {
    const stream = new MarkdownStream()
    stream.read('```js\nlet a', false)
    const read = stream.read('```js\nlet a\nlet b', false)
    expect(read.blocks).toEqual([{ info: 'js', kind: 'code', open: true, text: 'let a\nlet b' }])
  })
})
