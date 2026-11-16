import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Plain prose fills its column, and the column sets the measure.
 *
 * Helix 0.237.0 stopped every `data-prose` paragraph, list, and quote at 50ch.
 * A Chat sets its measure on the column and an Editor centers its document in
 * `--editor-measure`, so the 50ch cut under both: a plain answer filled 409
 * pixels of an 800 pixel turn. Only `data-prose="reading"` carries a measure of
 * its own.
 *
 * Read from the sheet, because a measure that comes back on plain prose is the
 * regression this guards, and the base layer is where it would come back.
 */
const BASE = readFileSync(join(import.meta.dir, '../../../../styles/src/base.css'), 'utf8')

/** Each rule of the sheet, its selector and body without comments or spacing. */
const rules = [...BASE.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
  (match) => ({
    body: (match[2] ?? '').replace(/\s+/g, ' ').trim(),
    selector: (match[1] ?? '').replace(/\s+/g, ' ').trim(),
  }),
)

/** A rule that reaches a paragraph, a list, or a quote inside prose. */
const reachesText = (selector: string): boolean =>
  selector.includes('data-prose') && /\b(p|ul|ol|blockquote)\b/.test(selector)

describe('the prose measure', () => {
  test('is not set on plain prose, so a chat turn, an editor, and a docs page fill their column', () => {
    const measured = rules.filter(
      ({ body, selector }) =>
        reachesText(selector) &&
        body.includes('max-inline-size') &&
        !selector.includes('"reading"'),
    )
    expect(measured.map(({ selector }) => selector)).toEqual([])
  })

  test('is 34em for a document set for reading', () => {
    const reading = rules.find(
      ({ selector }) => selector === ':where([data-prose="reading"]) :where(p, ul, ol, blockquote)',
    )
    expect(reading?.body).toBe('max-inline-size: 34em;')
  })
})
