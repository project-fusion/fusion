import { describe, expect, test } from 'bun:test'
import { MAJOR, readable } from './form.js'
import { family } from './style.fixtures.js'

describe('readable', () => {
  test('a form in the major the runtime reads is read, whatever its minor', () => {
    expect(readable({ ...family, version: `${MAJOR}.9` })).toBeDefined()
  })

  test('a form in another major is refused, naming the family and both versions', () => {
    expect(() => readable({ ...family, version: `${MAJOR + 1}.0` })).toThrow(
      `button: the intermediate form is version ${MAJOR + 1}.0, and this runtime reads ${MAJOR}.x`,
    )
  })
})
