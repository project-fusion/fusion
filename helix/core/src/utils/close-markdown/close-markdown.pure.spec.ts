import { describe, expect, test } from 'bun:test'
import { closeMarkdown } from './close-markdown.js'

describe('what is open gets closed', () => {
  test('a fence that has not been closed', () => {
    expect(closeMarkdown('Here:\n```ts\nconst a = 1')).toBe('Here:\n```ts\nconst a = 1\n```')
  })

  test('a fence closed by the text needs nothing', () => {
    const whole = 'Here:\n```ts\nconst a = 1\n```\nDone.'
    expect(closeMarkdown(whole)).toBe(whole)
  })

  test('the longer fence is the one that closes', () => {
    /* ``` inside a ```` block is code, not the end of it. */
    expect(closeMarkdown('````\n```\nstill code')).toBe('````\n```\nstill code\n````')
  })

  test('a tilde fence is not closed by backticks', () => {
    expect(closeMarkdown('~~~\n```\n')).toBe('~~~\n```\n~~~')
  })

  test('an inline span', () => {
    expect(closeMarkdown('Run `bun test')).toBe('Run `bun test`')
  })

  test('strong emphasis', () => {
    expect(closeMarkdown('It is **very')).toBe('It is **very**')
  })

  test('plain emphasis', () => {
    expect(closeMarkdown('It is *quite')).toBe('It is *quite*')
  })

  test('nothing open, nothing added', () => {
    const settled = 'A **whole** sentence with `code` and *emphasis*.'
    expect(closeMarkdown(settled)).toBe(settled)
  })

  test('the empty string', () => {
    expect(closeMarkdown('')).toBe('')
  })
})

describe('what a code block holds is code', () => {
  test('a stray backtick inside a fence is not a span', () => {
    /* Closing the fence is the whole answer; nothing is appended inside it. */
    expect(closeMarkdown('```sh\necho `date')).toBe('```sh\necho `date\n```')
  })

  test('an asterisk inside a fence is not emphasis', () => {
    expect(closeMarkdown('```sh\nrm *')).toBe('```sh\nrm *\n```')
  })
})

describe('a link is withheld until it is whole', () => {
  test('a target still arriving', () => {
    expect(closeMarkdown('Read [the docs](htt')).toBe('Read ')
  })

  test('text still arriving', () => {
    expect(closeMarkdown('Read [the do')).toBe('Read ')
  })

  test('an image too', () => {
    expect(closeMarkdown('Here ![a chart](/ch')).toBe('Here ')
  })

  test('a finished link is left alone', () => {
    const whole = 'Read [the docs](https://fusion.dev).'
    expect(closeMarkdown(whole)).toBe(whole)
  })

  test('a bracket inside an unfinished target is not read as emphasis', () => {
    expect(closeMarkdown('See [a **b](htt')).toBe('See ')
  })
})

describe('underscores are left alone', () => {
  test('an identifier does not become emphasis', () => {
    expect(closeMarkdown('Call format_num')).toBe('Call format_num')
  })

  test('nor does a dunder', () => {
    expect(closeMarkdown('The __init')).toBe('The __init')
  })
})

describe('only the last block can hold something open', () => {
  test('an earlier paragraph is not reopened', () => {
    const text = 'A settled *paragraph*.\n\nAnd a **new'
    expect(closeMarkdown(text)).toBe('A settled *paragraph*.\n\nAnd a **new**')
  })
})

describe('stable across a growing prefix', () => {
  /* **The property that makes this usable on every frame.** What the function
     adds is always at the end, so text a reader has already read cannot move.
     Checked by walking a document one character at a time and asserting that
     what settled stays settled. */
  const document =
    'Try `bun test` and read [the docs](https://fusion.dev).\n\n```ts\nconst a = 1\n```\n'

  test('everything it keeps is a prefix of the whole answer', () => {
    for (let at = 1; at <= document.length; at++) {
      const closed = closeMarkdown(document.slice(0, at))
      const kept = closed.replace(/[`*\n~]+$/, '')
      expect(`${at}:${document.startsWith(kept)}`).toBe(`${at}:true`)
    }
  })

  test('the finished document is returned unchanged', () => {
    expect(closeMarkdown(document)).toBe(document)
  })
})
