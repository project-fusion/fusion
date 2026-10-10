import { describe, expect, test } from 'bun:test'
import { minifyJson } from './minify-json.mjs'

describe('a JSON file without its whitespace', () => {
  test('loses the whitespace between tokens', () => {
    expect(minifyJson('{\n  "a": [\n    1,\n    2\n  ],\n\t"b" : {}\r\n}\n')).toBe(
      '{"a":[1,2],"b":{}}',
    )
  })

  test('keeps the whitespace inside a string, after an escaped quote too', () => {
    const text = '{ "summary": "Two  spaces, a \\"quoted  word\\", and a \\\\" , "x": " " }'
    expect(minifyJson(text)).toBe(
      '{"summary":"Two  spaces, a \\"quoted  word\\", and a \\\\","x":" "}',
    )
    expect(JSON.parse(minifyJson(text))).toEqual(JSON.parse(text))
  })

  /* What a parse and a print would change: the number's form and the order of
     the integer-like keys. */
  test('keeps every token as it was written', () => {
    expect(minifyJson('{ "10": 1.0, "2": 1e3 }')).toBe('{"10":1.0,"2":1e3}')
  })

  test('parses to the value it parsed to before', () => {
    const manifest = JSON.stringify(
      {
        modules: [
          {
            declarations: [{ description: 'A button.\n\nPress it.', name: 'HelixButton' }],
            kind: 'javascript-module',
            path: 'src/button/button.ts',
          },
        ],
        schemaVersion: '2.1.0',
      },
      null,
      2,
    )
    expect(JSON.parse(minifyJson(manifest))).toEqual(JSON.parse(manifest))
    expect(minifyJson(manifest)).toBe(JSON.stringify(JSON.parse(manifest)))
  })
})
