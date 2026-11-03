import { describe, expect, test } from 'bun:test'
import { csvOf } from './csv.js'

describe('csvOf', () => {
  test('writes a heading line and a line for each row', () => {
    expect(
      csvOf(
        [
          { field: 'name', heading: 'Name' },
          { field: 'size', heading: 'Size' },
        ],
        [{ name: 'a, b', size: -1 }, { name: '=SUM(A1)' }],
      ),
    ).toBe(`Name,Size\r\n"a, b",-1\r\n'=SUM(A1),`)
  })
})
