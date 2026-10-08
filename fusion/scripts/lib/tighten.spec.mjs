import { describe, expect, test } from 'bun:test'
import { tighten } from './tighten.mjs'

describe('tightening a generated sheet', () => {
  test('puts the arguments a function was laid out over on one line', () => {
    expect(tighten(':host {--a: color-mix(\nin oklab,\nvar(--b) 86%,\nvar(--c)\n);}')).toBe(
      ':host {--a: color-mix(in oklab, var(--b) 86%, var(--c))}',
    )
  })

  test('puts a selector list written one selector to a line on one line', () => {
    expect(tighten(':host(\n:is(\n[as="h1"],\n[as="h2"]\n)\n) {a: b;}')).toBe(
      ':host(:is([as="h1"], [as="h2"])) {a: b}',
    )
  })

  test('drops the last semicolon in a block, at every depth', () => {
    expect(tighten('@media print {:host {color: black;}}a {b: c; }')).toBe(
      '@media print {:host {color: black}}a {b: c}',
    )
  })

  /* A combinator, or the space between two strings: the newline was the only
     whitespace there, and a space is the same whitespace. */
  test('turns a newline that separates two things into a space', () => {
    expect(tighten(':host([a])\n[part="b"] {grid-template-areas:\n"one"\n"two";}')).toBe(
      ':host([a]) [part="b"] {grid-template-areas: "one" "two"}',
    )
  })

  test('leaves a quoted string as it stands', () => {
    expect(tighten(`a::after {content: "( ;}";quotes: '( ' ' )';}`)).toBe(
      `a::after {content: "( ;}";quotes: '( ' ' )'}`,
    )
  })

  test('joins the arguments of light-dark() without changing them', () => {
    expect(tighten(':host {color: light-dark(\nred,\nblue\n);}')).toBe(
      ':host {color: light-dark(red, blue)}',
    )
  })
})
