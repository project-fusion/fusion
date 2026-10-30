import { describe, expect, test } from 'bun:test'
import { asWritten, elementsOf, importsOf, isNumeric, lead } from './elements.js'
import { MANIFEST } from './fixture.js'

describe('isNumeric', () => {
  test.each([
    ['number', true],
    ['number | undefined', true],
    ["number | 'auto'", true],
    ['string', false],
    ['number | string', false],
    ["'a' | 'b'", false],
  ])('%s is %p', (type, expected) => {
    expect(isNumeric(type)).toBe(expected)
  })
})

describe('asWritten', () => {
  test.each([
    ['string | null', 'string'],
    ['null', 'string'],
    ['', 'string'],
    ['boolean | undefined', 'boolean'],
    ['Record<string, number | null>', 'Record<string, number | null>'],
  ])('%s is written %s', (type, expected) => {
    expect(asWritten(type)).toBe(expected)
  })
})

describe('lead', () => {
  test('is the first paragraph, on one line', () => {
    expect(lead('One\ntwo.\n\nThree.')).toBe('One two.')
    expect(lead(undefined)).toBe('')
  })
})

describe('elementsOf', () => {
  test('reads custom elements, and nothing else', () => {
    expect(elementsOf(MANIFEST).map(({ tagName }) => tagName)).toEqual(['helix-thing'])
  })

  test('marks only an attribute that spells a number and is named apart from its property', () => {
    const [element] = elementsOf(MANIFEST)
    const numeric = element?.props.filter((prop) => prop.numeric).map((prop) => prop.attribute)
    expect(numeric).toEqual(['default-page', 'per-view'])
  })
})

describe('importsOf', () => {
  test('is the classes and the event classes, sorted, and no platform event', () => {
    expect(importsOf(elementsOf(MANIFEST))).toEqual(['HelixBeforeCheckEvent', 'HelixThing'])
  })
})
