import { describe, expect, test } from 'bun:test'
import { parseInline } from './inline.js'

const text = (value: string) => ({ kind: 'text' as const, text: value })

describe('parseInline, strictly', () => {
  test('reads emphasis, strong, strikethrough and code', () => {
    expect(parseInline('*a* **b** ~~c~~ `d`')).toEqual([
      { children: [text('a')], kind: 'em' },
      text(' '),
      { children: [text('b')], kind: 'strong' },
      text(' '),
      { children: [text('c')], kind: 'del' },
      text(' '),
      { kind: 'code', text: 'd' },
    ])
  })

  test('leaves an underscore inside a word alone', () => {
    expect(parseInline('snake_case_name')).toEqual([text('snake_case_name')])
  })

  test('draws an unclosed mark as the characters it is', () => {
    expect(parseInline('**bold')).toEqual([text('**bold')])
    expect(parseInline('`code')).toEqual([text('`code')])
    expect(parseInline('[text')).toEqual([text('[text')])
  })

  test('reads links, their titles, and autolinks', () => {
    expect(parseInline('[a](https://x.dev "T")')).toEqual([
      { children: [text('a')], href: 'https://x.dev', kind: 'link', title: 'T' },
    ])
    expect(parseInline('<https://x.dev>')).toEqual([
      { children: [text('https://x.dev')], href: 'https://x.dev', kind: 'link' },
    ])
    expect(parseInline('see https://x.dev/a.')).toEqual([
      text('see '),
      { children: [text('https://x.dev/a')], href: 'https://x.dev/a', kind: 'link' },
      text('.'),
    ])
  })

  test('reads brackets that are no link as text', () => {
    expect(parseInline('[1] and [2]')).toEqual([text('[1] and [2]')])
  })

  test('reads an image with its alternative text', () => {
    expect(parseInline('![a *b*](p.png)')).toEqual([{ alt: 'a b', kind: 'image', src: 'p.png' }])
  })

  test('reads escapes, entities, and both kinds of line break', () => {
    expect(parseInline('\\*a\\* &amp; &#65;')).toEqual([text('*a* & A')])
    expect(parseInline('a  \nb\\\nc\nd')).toEqual([
      text('a'),
      { kind: 'break' },
      text('b'),
      { kind: 'break' },
      text('c\nd'),
    ])
  })
})

describe('parseInline, open', () => {
  const open = (value: string) => parseInline(value, { open: true })

  test('draws an opened mark as if it closed at the end', () => {
    expect(open('**bold')).toEqual([{ children: [text('bold')], kind: 'strong' }])
    expect(open('*a **b')).toEqual([
      { children: [text('a '), { children: [text('b')], kind: 'strong' }], kind: 'em' },
    ])
    expect(open('`code')).toEqual([{ kind: 'code', text: 'code' }])
  })

  test('holds back a delimiter, a backslash, a bang or an entity at the very end', () => {
    expect(open('a **')).toEqual([text('a ')])
    expect(open('**bold*')).toEqual([{ children: [text('bold')], kind: 'strong' }])
    expect(open('a\\')).toEqual([text('a')])
    expect(open('a !')).toEqual([text('a ')])
    expect(open('AT&am')).toEqual([text('AT')])
    expect(open('a `')).toEqual([text('a ')])
  })

  test('draws a link still arriving as a link with no address, without its brackets', () => {
    expect(open('see [the docs')).toEqual([text('see the docs')])
    expect(open('see [the docs]')).toEqual([
      text('see '),
      { children: [text('the docs')], kind: 'link' },
    ])
    expect(open('see [the docs](https://x.')).toEqual([
      text('see '),
      { children: [text('the docs')], kind: 'link' },
    ])
  })

  test('reads a word that cannot open a mark as text, even at the end', () => {
    expect(open('a * b')).toEqual([text('a * b')])
  })
})
