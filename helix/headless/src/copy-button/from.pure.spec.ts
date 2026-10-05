import { describe, expect, test } from 'bun:test'
import { parseFrom } from './from.js'

describe('a from reference', () => {
  test('names an element, an attribute of it, or a property of it', () => {
    expect(parseFrom('key')).toEqual({ id: 'key' })
    expect(parseFrom(' key[data-token] ')).toEqual({ attribute: 'data-token', id: 'key' })
    expect(parseFrom('field.value')).toEqual({ id: 'field', property: 'value' })
  })

  test('is nothing where it names no id or carries more than one reading', () => {
    for (const written of ['', '[value]', '.value', 'a.b.c', 'a[b].c', 'a b']) {
      expect(parseFrom(written)).toBeNull()
    }
  })
})
