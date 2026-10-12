import { describe, expect, test } from 'bun:test'
import { LogBuffer, levelSaid, loudEnough } from './buffer.js'

const ESC = '\x1b'

const texts = (buffer: LogBuffer): string[] => buffer.lines.map((line) => line.text)

describe('LogBuffer', () => {
  test('finishes a line at each break, holding the one still being written', () => {
    const buffer = new LogBuffer()
    expect(buffer.write('Installing')).toBe(0)
    expect(buffer.current()?.text).toBe('Installing')
    expect(buffer.write(' dependencies\nCompiling')).toBe(1)
    expect(texts(buffer)).toEqual(['Installing dependencies'])
    expect(buffer.current()?.text).toBe('Compiling')
  })

  test('reads a Windows break as one break, even split across two writes', () => {
    const buffer = new LogBuffer()
    buffer.write('one\r\ntwo\r')
    buffer.write('\nthree\n')
    expect(texts(buffer)).toEqual(['one', 'two', 'three'])
    expect(buffer.current()).toBeUndefined()
  })

  test('starts a line over at a carriage return, so a progress bar is one line', () => {
    const buffer = new LogBuffer()
    buffer.write('Downloading 10%')
    buffer.write('\rDownloading 55%')
    expect(buffer.current()?.text).toBe('Downloading 55%')
    buffer.write('\rDownloading 100%\n')
    expect(texts(buffer)).toEqual(['Downloading 100%'])
  })

  test('carries color through a line a carriage return replaced', () => {
    const buffer = new LogBuffer()
    buffer.write(`${ESC}[32mworking\rdone\n`)
    expect(buffer.runsOf(buffer.lines[0] as never)).toEqual([{ color: 'green', text: 'done' }])
  })

  test('carries color from one written line to the next', () => {
    const buffer = new LogBuffer()
    buffer.write(`${ESC}[31merror: the build\nfailed${ESC}[0m\nok\n`)
    const [first, second, third] = buffer.lines
    expect(buffer.runsOf(first as never)[0]?.color).toBe('red')
    expect(buffer.runsOf(second as never)).toEqual([{ color: 'red', text: 'failed' }])
    expect(buffer.runsOf(third as never)).toEqual([{ text: 'ok' }])
  })

  test('starts each line handed over whole with no color', () => {
    const buffer = new LogBuffer()
    buffer.replace([{ text: `${ESC}[31mred` }, { text: 'plain' }])
    expect(buffer.runsOf(buffer.lines[1] as never)).toEqual([{ text: 'plain' }])
  })

  test('keeps only the newest lines past the limit, and counts what it let go', () => {
    const buffer = new LogBuffer()
    buffer.limit = 2
    buffer.write('a\nb\nc\nd\n')
    expect(texts(buffer)).toEqual(['c', 'd'])
    expect(buffer.dropped).toBe(2)
  })

  test('lets parse set fields on a line, or drop it', () => {
    const buffer = new LogBuffer()
    buffer.parse = (text) => {
      if (text.startsWith('::group::')) {
        return null
      }
      return text.startsWith('ERROR ') ? { level: 'error', text: text.slice(6) } : undefined
    }
    buffer.write('::group::Build\nERROR missing module\nfine\n')
    expect(buffer.lines).toEqual([{ level: 'error', text: 'missing module' }, { text: 'fine' }])
  })

  test('puts the line being written in the group of the line before it', () => {
    const buffer = new LogBuffer()
    buffer.replace([{ group: 'test', text: 'first' }])
    buffer.write('second')
    expect(buffer.current()).toEqual({ group: 'test', text: 'second' })
  })

  test('starts over on clear', () => {
    const buffer = new LogBuffer()
    buffer.limit = 1
    buffer.write('a\nb\nc')
    buffer.clear()
    expect(buffer.lines).toEqual([])
    expect(buffer.dropped).toBe(0)
    expect(buffer.current()).toBeUndefined()
  })
})

describe('repeats, with collapse', () => {
  test('a line written again straight after itself folds into it, with a count', () => {
    const buffer = new LogBuffer()
    buffer.collapse = true
    buffer.write('retrying\nretrying\nretrying\ndone\nretrying\n')
    expect(buffer.lines.map((line) => [line.text, line.count ?? 1])).toEqual([
      ['retrying', 3],
      ['done', 1],
      ['retrying', 1],
    ])
  })

  test('lines handed over as data fold too, and a different level is a different line', () => {
    const buffer = new LogBuffer()
    buffer.collapse = true
    buffer.replace([
      { level: 'warn', text: 'slow' },
      { level: 'warn', text: 'slow' },
      { level: 'error', text: 'slow' },
    ])
    expect(buffer.lines.map((line) => [line.level, line.count ?? 1])).toEqual([
      ['warn', 2],
      ['error', 1],
    ])
  })

  test('without collapse, every line is its own', () => {
    const buffer = new LogBuffer()
    buffer.write('a\na\n')
    expect(texts(buffer)).toEqual(['a', 'a'])
  })
})

describe('the quietest level shown', () => {
  test('counts up from debug, through log and info, to error, a line with no level being info', () => {
    expect(loudEnough('log', 'info')).toBe(false)
    expect(loudEnough(undefined, 'info')).toBe(true)
    expect(loudEnough('debug', 'log')).toBe(false)
    expect(loudEnough('warn', 'warn')).toBe(true)
    expect(loudEnough('debug', undefined)).toBe(true)
  })
})

describe('the level a line says', () => {
  test('is its words, unless its text already starts with them', () => {
    expect(levelSaid('Error:', 'Cannot find module')).toBe('Error:')
    expect(levelSaid('Error:', 'Error: Cannot find module')).toBeUndefined()
    expect(levelSaid('Error:', '  error - build failed')).toBeUndefined()
    expect(levelSaid('Warning:', 'warning: glob is deprecated')).toBeUndefined()
  })

  test('a word that only starts the text’s first word is still said', () => {
    expect(levelSaid('Error:', 'Errors: 2')).toBe('Error:')
    expect(levelSaid('Error:', 'ErrorBoundary caught it')).toBe('Error:')
  })

  test('no words are none', () => {
    expect(levelSaid(undefined, 'Error: x')).toBeUndefined()
    expect(levelSaid('', 'x')).toBeUndefined()
  })
})
