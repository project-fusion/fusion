import { describe, expect, test } from 'bun:test'
import { chosenValues } from './chosen-values.js'

const options = new Set(['x,y', 'z', 'a'])

describe('chosen values', () => {
  test('are none for an empty value', () => {
    expect(chosenValues('', options, true)).toEqual([])
  })

  /* A single select whose option held a comma showed the placeholder, because
     neither half was an option. */
  test('are the whole string for one choice, comma and all', () => {
    expect(chosenValues('x,y', options, false)).toEqual(['x,y'])
    expect(chosenValues('q,r', options, false)).toEqual(['q,r'])
  })

  test('keep the comma of an option among several choices', () => {
    expect(chosenValues('z,x,y,a', options, true)).toEqual(['z', 'x,y', 'a'])
    expect(chosenValues('x,y', options, true)).toEqual(['x,y'])
  })

  test('keep a value no option has yet as it is written', () => {
    expect(chosenValues('later,z', options, true)).toEqual(['later', 'z'])
  })

  test('read the longer value where an option is two others joined', () => {
    expect(chosenValues('x,y', new Set(['x', 'y', 'x,y']), true)).toEqual(['x,y'])
  })
})
