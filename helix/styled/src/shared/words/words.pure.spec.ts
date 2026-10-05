import { describe, expect, test } from 'bun:test'
import { wordsConverter } from './words.js'

const read = wordsConverter.fromAttribute

describe('wordsConverter', () => {
  test('a JSON object is its words', () => {
    expect(read('{"done":"Terminé","warn":"Avertissements"}')).toEqual({
      done: 'Terminé',
      warn: 'Avertissements',
    })
  })

  test('JSON that does not parse, an array, a string and null are no words', () => {
    expect(read('oops')).toEqual({})
    expect(read('["a"]')).toEqual({})
    expect(read('"words"')).toEqual({})
    expect(read('null')).toEqual({})
    expect(read(null)).toEqual({})
  })

  test('a key whose value is not a string is dropped, and the rest are kept', () => {
    expect(read('{"log":5,"error":"Erreurs","info":null}')).toEqual({ error: 'Erreurs' })
  })
})
