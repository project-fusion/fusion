#!/usr/bin/env node
/**
 * One attribute per line in an open tag, shared by everything that writes one.
 *
 * Two writers of the same markup have to agree, or every build dirties what
 * `check` just cleaned, and the only way they can agree is to run the same
 * code. That is the rule the React wrappers already record.
 *
 * `format-examples.mjs` keeps the reasoning about *why* the rule is what it is.
 * What is here is the mechanism alone.
 */

/**
 * Splits an open tag's attribute list into its parts.
 *
 * Hand-walked rather than matched with one expression, because an attribute
 * value can hold anything at all: `onsubmit="event.preventDefault()"` has a
 * space and parentheses in it, and a `style` value has semicolons. Only a quote
 * that is not inside another quote ends a value.
 */
export const attributes = (body) => {
  const parts = []
  let current = ''
  let quote = ''
  for (const char of body) {
    if (quote) {
      current += char
      if (char === quote) {
        quote = ''
      }
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      current += char
      continue
    }
    if (/\s/.test(char)) {
      if (current) {
        parts.push(current)
        current = ''
      }
      continue
    }
    current += char
  }
  if (current) {
    parts.push(current)
  }
  return parts
}

/* An open tag, and only an open tag: not a closing tag, not a comment, not a
   doctype. The body stops at the first `>` that is not inside a quoted value,
   which is why this is a function and not a single pattern. */
const OPEN = /<([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g

/**
 * The attribute's name, which is the only part of it the order depends on.
 *
 * Never sort the whole `name="value"` token, which goes wrong only between an
 * attribute and one that extends it: `localeCompare` gives punctuation almost no
 * weight, so `data-button-fill` and `data-button` compare as
 * `databuttonfillstandard` against `databuttonghost` and the longer name wins on
 * the `f`. The same fault puts `value-text` ahead of `value`. Biome's own HTML
 * formatter sorts on the name, and two formatters in one `check` have to agree
 * or they take turns undoing each other.
 */
const name = (part) => part.split('=')[0].toLowerCase()

export const format = (text) =>
  /* The whole match is not used: every branch rebuilds the tag from its parts.
     Named `_whole` so the position is still readable against the pattern. */
  text.replace(OPEN, (_whole, tag, body, slash, index) => {
    const parts = attributes(body).sort((one, two) => name(one).localeCompare(name(two)))
    if (parts.length < 2) {
      /* Nothing to lay out. Collapse whatever whitespace it has, so a tag that
         was wrapped for one attribute comes back to one line. */
      return `<${tag}${parts.length ? ` ${parts[0]}` : ''}${slash}>`
    }
    const before = text.lastIndexOf('\n', index) + 1
    const indent = (text.slice(before, index).match(/^\s*/) ?? [''])[0]
    const inner = `${indent}  `
    return `<${tag}\n${parts.map((one) => inner + one).join('\n')}\n${indent}${slash}>`
  })
