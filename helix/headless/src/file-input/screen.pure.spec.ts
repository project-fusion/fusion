import { describe, expect, test } from 'bun:test'
import { accepts, screenFiles } from './screen.js'

const file = (name: string, type: string, size = 10): File =>
  new File([new Uint8Array(size)], name, { type })

describe('accept', () => {
  test('takes an extension, a type and a family', () => {
    expect(accepts(file('a.PNG', 'image/png'), '.png')).toBe(true)
    expect(accepts(file('a.png', 'image/png'), 'image/*')).toBe(true)
    expect(accepts(file('a.txt', 'text/plain'), 'image/*, .pdf')).toBe(false)
    expect(accepts(file('a.txt', 'text/plain'), '')).toBe(true)
  })
})

describe('screening arriving files', () => {
  const rules = { accept: 'image/*', maxFileSize: 100, maxFiles: 3, multiple: true }

  test('refuses a file by type and by size, and says which', () => {
    const { kept, refused } = screenFiles(
      [file('a.png', 'image/png'), file('b.txt', 'text/plain'), file('c.png', 'image/png', 500)],
      [],
      rules,
    )
    expect(kept.map((one) => one.name)).toEqual(['a.png'])
    expect(refused.map((one) => [one.file.name, one.reason])).toEqual([
      ['b.txt', 'type'],
      ['c.png', 'size'],
    ])
  })

  test('counts the files it keeps against max-files', () => {
    const keeping = [file('x.png', 'image/png'), file('y.png', 'image/png')]
    const { kept, refused } = screenFiles(
      [file('a.png', 'image/png'), file('b.png', 'image/png')],
      keeping,
      rules,
    )
    expect(kept.map((one) => one.name)).toEqual(['x.png', 'y.png', 'a.png'])
    expect(refused.map((one) => [one.file.name, one.reason])).toEqual([['b.png', 'count']])
  })

  test('carries what validate said', () => {
    const { refused } = screenFiles([file('a.png', 'image/png')], [], {
      ...rules,
      validate: (one) => (one.name.startsWith('a') ? 'Starts with a' : null),
    })
    expect(refused).toEqual([
      { file: expect.any(File), message: 'Starts with a', reason: 'invalid' },
    ])
  })

  test('a single-file field takes the last file it accepts', () => {
    const { kept, refused } = screenFiles(
      [file('a.png', 'image/png'), file('b.png', 'image/png')],
      [],
      { accept: '', multiple: false },
    )
    expect(kept.map((one) => one.name)).toEqual(['b.png'])
    expect(refused.map((one) => one.reason)).toEqual(['count'])
  })
})
