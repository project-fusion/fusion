import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A chat turn and an editor's document fill their column.
 *
 * The base layer stops a `data-prose` paragraph, list, or quote at 50ch. A Chat
 * sets its reading measure on the column, and an Editor centers its document in
 * `--editor-measure`, so the 50ch cut under both: a plain answer filled 409
 * pixels of an 800 pixel turn. The base layer lifts the measure inside a chat
 * message and an editor, and `data-prose="reading"` still sets its 34em there.
 *
 * Read from the sheet, because every rule here is `:where()` and has no
 * specificity, so the order of the three rules is the decision.
 */
const BASE = readFileSync(join(import.meta.dir, '../../../../styles/src/base.css'), 'utf8')

/** Each rule of the sheet in order, its selector and body without comments or spacing. */
const rules = [...BASE.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
  (match) => ({
    body: (match[2] ?? '').replace(/\s+/g, ' ').trim(),
    selector: (match[1] ?? '').replace(/\s+/g, ' ').trim(),
  }),
)

const at = (selector: string): number => rules.findIndex((rule) => rule.selector === selector)

const MEASURE = ':where([data-prose] p, [data-prose] ul, [data-prose] ol, [data-prose] blockquote)'
const FILL =
  ':where(helix-chat-message, helix-headless-chat-message, helix-editor, helix-headless-editor) :where(p, ul, ol, blockquote)'
const READING = ':where([data-prose="reading"]) :where(p, ul, ol, blockquote)'

describe('the prose measure', () => {
  test('stops a paragraph at 50ch on a page', () => {
    expect(rules[at(MEASURE)]?.body).toBe('max-inline-size: 50ch;')
  })

  test('is lifted inside a chat message and an editor, at both tiers', () => {
    expect(rules[at(FILL)]?.body).toBe('max-inline-size: none;')
  })

  test('is lifted after the 50ch and before the reading measure, so reading still sets 34em', () => {
    expect(at(MEASURE)).toBeGreaterThan(-1)
    expect(at(FILL)).toBeGreaterThan(at(MEASURE))
    expect(at(READING)).toBeGreaterThan(at(FILL))
    expect(rules[at(READING)]?.body).toBe('max-inline-size: 34em;')
  })
})
