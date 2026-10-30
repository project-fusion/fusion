import { describe, expect, test } from 'bun:test'
import { acceptList, accepts, fileKind, fileSize, screenFiles } from './file-input.js'

/** A file as a phone's capability gives it: a record, with no content of its own. */
const record = (name: string, type: string, size = 10) => ({
  name,
  size,
  type,
  uri: `file:///${name}`,
})

describe('a file field’s rules', () => {
  test('read a record as they read a File', () => {
    expect(accepts(record('a.PNG', 'image/png'), '.png')).toBe(true)
    expect(accepts(record('a.txt', 'text/plain'), 'image/*, .pdf')).toBe(false)
    const { kept, refused } = screenFiles(
      [record('a.png', 'image/png'), record('b.png', 'image/png', 500)],
      [],
      { accept: 'image/*', maxFileSize: 100, multiple: true },
    )
    expect(kept.map((one) => one.uri)).toEqual(['file:///a.png'])
    expect(refused.map((one) => [one.file.name, one.reason])).toEqual([['b.png', 'size']])
  })

  test('list the tokens a picker takes', () => {
    expect(acceptList('image/*, .pdf')).toEqual(['image/*', '.pdf'])
    expect(acceptList('')).toEqual([])
  })

  test('write a size at the largest unit worth reading', () => {
    const bytes = (count: number) => `${count} bytes`
    expect(fileSize(12, 'en', bytes)).toBe('12 bytes')
    expect(fileSize(1536, 'en', bytes)).toBe('1.5 KB')
    expect(fileSize(5 * 1024 * 1024, 'en', bytes)).toBe('5 MB')
  })

  test('name a kind by the extension, then a short subtype', () => {
    expect(fileKind({ name: 'report.docx', type: 'application/vnd.openxmlformats' })).toBe('DOCX')
    expect(fileKind({ name: 'scan', type: 'image/png' })).toBe('PNG')
    expect(fileKind({ name: 'blob', type: 'application/vnd.openxmlformats' })).toBe('File')
  })
})
