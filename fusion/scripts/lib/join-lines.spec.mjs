import { describe, expect, test } from 'bun:test'
import { joinLines } from './join-lines.mjs'

describe('joining the lines of a generated sheet', () => {
  /* Every rule paid a newline per declaration and per brace, measured at 15 to
     85 bytes gzip on a family's Added. */
  test('drops a newline after a brace or a semicolon, and before a closing brace', () => {
    expect(joinLines([':host {', 'display: block;', 'color: red;', '}', 'a {', 'b: c;', '}'])).toBe(
      ':host {display: block;color: red;}a {b: c;}',
    )
  })

  test('keeps a newline that can be a combinator or the space inside a value', () => {
    expect(
      joinLines([
        ':host([invalid]) [part="a"],',
        ':host(:state(invalid))',
        '[part="b"] {',
        'grid-template-areas:',
        '"one"',
        '"two";',
        '}',
      ]),
    ).toBe(
      ':host([invalid]) [part="a"],\n:host(:state(invalid))\n[part="b"] {grid-template-areas:\n"one"\n"two";}',
    )
  })

  test('nests at-rules the same way', () => {
    expect(joinLines(['@media print {', ':host {', 'color: black;', '}', '}'])).toBe(
      '@media print {:host {color: black;}}',
    )
  })
})
