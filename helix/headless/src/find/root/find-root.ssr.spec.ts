import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, ssr, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const served = (markup = html`<helix-headless-find for="notes"></helix-headless-find>`) =>
  withoutStyles(ssr(markup))

describe('find server output', () => {
  test('the bar is served as a named search landmark, hidden until it opens', () => {
    const markup = served()
    expect(partTag(markup, 'bar')).toContain('role="search"')
    expect(partTag(markup, 'bar')).toContain('aria-label="Find"')
    expect(partTag(markup, 'bar')).toContain('hidden')
  })

  test('open, the bar is served shown, with the search the page set', () => {
    const markup = served(html`<helix-headless-find open query="token"></helix-headless-find>`)
    expect(partTag(markup, 'bar')).not.toContain('hidden')
    expect(partTag(markup, 'field')).toContain('placeholder="Find"')
    expect(partTag(markup, 'field')).toContain('type="search"')
  })

  test('the toolbar ships with the options, the moves, and Close, named', () => {
    const markup = served()
    expect(partTag(markup, 'controls')).toContain('label="Find controls"')
    const named: Array<[string, string]> = [
      ['match-case', 'Match case'],
      ['whole-word', 'Match whole word'],
      ['regex', 'Use regular expression'],
      ['previous', 'Previous match'],
      ['next', 'Next match'],
      ['close', 'Close find'],
    ]
    for (const [name, label] of named) {
      expect(partTag(markup, name)).toContain(`label="${label}"`)
    }
  })

  test('options names the ones drawn, and replacing waits for a finder that can', () => {
    const markup = served(html`<helix-headless-find options="none"></helix-headless-find>`)
    expect(hasPart(markup, 'match-case')).toBe(false)
    expect(hasPart(markup, 'regex')).toBe(false)
    expect(hasPart(markup, 'replace-toggle')).toBe(false)
  })

  test('the host carries only what the page wrote', () => {
    expect(hostAttributes(served(), 'helix-headless-find')).toEqual(['for'])
  })
})
