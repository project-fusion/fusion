import { describe, expect, test } from 'bun:test'
import { separatorsAfter } from './format.js'

describe('a pin format', () => {
  test('puts each literal after the box before it', () => {
    expect(separatorsAfter('###-###', 6)).toEqual(['', '', '-', '', '', ''])
    expect(separatorsAfter('## ## ##', 6)).toEqual(['', ' ', '', ' ', '', ''])
  })

  test('draws nothing before the first box or after the last', () => {
    expect(separatorsAfter('(###)', 3)).toEqual(['', '', ''])
    expect(separatorsAfter('', 4)).toEqual(['', '', '', ''])
  })
})
