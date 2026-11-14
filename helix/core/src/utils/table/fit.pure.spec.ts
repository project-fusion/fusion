import { describe, expect, test } from 'bun:test'
import { droppedAt, pixelsOf } from './fit.js'

const sizes = { em: 14, rem: 16 }

describe('a minimum table width', () => {
  test('is read in pixels, rem and em, and a bare number is pixels', () => {
    expect(pixelsOf('640px', sizes)).toBe(640)
    expect(pixelsOf('640', sizes)).toBe(640)
    expect(pixelsOf('40rem', sizes)).toBe(640)
    expect(pixelsOf('10em', sizes)).toBe(140)
    expect(pixelsOf(' 2.5REM ', sizes)).toBe(40)
  })

  test('is no length as a share of something other than the table', () => {
    expect(pixelsOf('50%', sizes)).toBeUndefined()
    expect(pixelsOf('40vw', sizes)).toBeUndefined()
    expect(pixelsOf('wide', sizes)).toBeUndefined()
    expect(pixelsOf('', sizes)).toBeUndefined()
  })
})

describe('the columns a table leaves out', () => {
  const columns = [
    { column: 'name', minimum: '' },
    { column: 'region', minimum: '30rem' },
    { column: 'owner', minimum: '40rem' },
  ]

  test('are those whose minimum is wider than the table', () => {
    expect([...droppedAt(800, columns, sizes)]).toEqual([])
    expect([...droppedAt(600, columns, sizes)]).toEqual(['owner'])
    expect([...droppedAt(400, columns, sizes)]).toEqual(['region', 'owner'])
  })

  test('at exactly the minimum, the column shows', () => {
    expect([...droppedAt(640, columns, sizes)]).toEqual([])
  })

  test('keep the first column where every one would go', () => {
    const all = columns.map((one) => ({ ...one, minimum: '50rem' }))
    expect([...droppedAt(300, all, sizes)]).toEqual(['region', 'owner'])
  })

  test('leave in a column whose minimum is no length', () => {
    expect([
      ...droppedAt(
        100,
        [
          { column: 'a', minimum: '50%' },
          { column: 'b', minimum: '' },
        ],
        sizes,
      ),
    ]).toEqual([])
  })
})
