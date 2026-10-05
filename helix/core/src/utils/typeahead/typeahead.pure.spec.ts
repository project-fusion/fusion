import { describe, expect, test } from 'bun:test'
import { Typeahead, typeaheadBy, typesCharacter } from './typeahead.js'

describe('Typeahead', () => {
  test('starts a new word after a pause', () => {
    const search = new Typeahead({ timeout: 500 })
    expect(search.match('c', ['Cambodia', 'Denmark'], -1, 0)).toBe(0)
    expect(search.match('d', ['Cambodia', 'Denmark'], 0, 1000)).toBe(1)
  })

  test('matches nothing where no item starts with the word', () => {
    expect(new Typeahead().match('z', ['Apple', 'Banana'], 0)).toBe(-1)
  })
})

describe('a typeahead for a set', () => {
  test('reads the words it was given and starts with no search under way', () => {
    const typeahead = typeaheadBy((item: { name: string }) => item.name)
    expect(typeahead.words({ name: 'Canada' })).toBe('Canada')
    expect(typeahead.search.typing()).toBe(false)
  })

  test('holds a search of its own, so two sets never share letters', () => {
    const one = typeaheadBy((item: string) => item)
    const two = typeaheadBy((item: string) => item)
    one.search.match('c', ['Canada'], -1)
    expect(one.search.typing()).toBe(true)
    expect(two.search.typing()).toBe(false)
  })
})

describe('a key that types', () => {
  const key = (init: KeyboardEventInit): KeyboardEvent =>
    ({ altKey: false, ctrlKey: false, metaKey: false, ...init }) as KeyboardEvent

  test('is one character with no Control, Command or Alt held', () => {
    expect(typesCharacter(key({ key: 'a' }))).toBe(true)
    expect(typesCharacter(key({ key: 'A', shiftKey: true }))).toBe(true)
    expect(typesCharacter(key({ ctrlKey: true, key: 'a' }))).toBe(false)
    expect(typesCharacter(key({ key: 'a', metaKey: true }))).toBe(false)
    expect(typesCharacter(key({ altKey: true, key: 'a' }))).toBe(false)
    expect(typesCharacter(key({ key: 'ArrowDown' }))).toBe(false)
  })
})
