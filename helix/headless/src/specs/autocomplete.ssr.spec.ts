import { describe, expect, test } from 'bun:test'
import { rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html, type TemplateResult } from 'lit'
import '../date-input/index.js'
import '../filter-input/index.js'
import '../number-input/index.js'
import '../time-input/index.js'

/* A server's box says what the browser may offer before any script runs, since
   the browser reads `autocomplete` as the page loads and offers its history to
   a reader who types before the page upgrades. */
const SERVED: [string, TemplateResult][] = [
  ['date-input', html`<helix-headless-date-input label="Due"></helix-headless-date-input>`],
  [
    'filter-input',
    html`<helix-headless-filter-input label="Filter"></helix-headless-filter-input>`,
  ],
  ['number-input', html`<helix-headless-number-input label="Seats"></helix-headless-number-input>`],
  ['time-input', html`<helix-headless-time-input label="Starts"></helix-headless-time-input>`],
]

describe('a field with no history to offer, on the server', () => {
  for (const [tag, template] of SERVED) {
    test(`${tag} serves autocomplete="off" on its box`, () => {
      expect(rendered(ssr(template), `helix-headless-${tag}`)).toMatch(
        /<input[^>]*autocomplete="off"/,
      )
    })
  }
})
