import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

/**
 * The server output. A log served whole is markup, so a reader on a slow
 * connection reads it before any script runs. What a server cannot know is
 * where a reader is scrolled, so nothing about the pin is written.
 */
const markup = ssr(html`<helix-headless-log label="Deploy" line-numbers>
  <helix-headless-log-line>Cloning the repository</helix-headless-log-line>
  <helix-headless-log-group heading="Install" status="done">
    <helix-headless-log-line>added 214 packages</helix-headless-log-line>
  </helix-headless-log-group>
</helix-headless-log>`)

describe('log server output', () => {
  test('no empty state is served over lines the server cannot count', () => {
    expect(partTag(markup, 'empty')).toBe('')
  })

  test('the log is served as a quiet log, and the region that speaks is served empty', () => {
    expect(partTag(markup, 'log')).toContain('role="log"')
    expect(partTag(markup, 'log')).toContain('aria-live="off"')
    expect(partTag(markup, 'log')).toContain('aria-label="Deploy"')
    expect(rendered(markup, 'helix-headless-log')).toMatch(
      /part="live" role="status">(<!--[^>]*-->)*<\/span>/,
    )
  })

  test('the lines are served by the default slot, inside the log', () => {
    const log = ssr(html`<helix-headless-log></helix-headless-log>`)
    expect(rendered(log, 'helix-headless-log')).toMatch(/part="log"[\s\S]*<slot><\/slot>/)
  })

  test('the way back is served hidden, since a log opens following its newest line', () => {
    expect(partTag(markup, 'resume')).toContain('hidden')
  })

  test('the line about dropped lines is served hidden and empty', () => {
    expect(partTag(markup, 'dropped')).toContain('hidden')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(markup, 'helix-headless-log').sort()).toEqual(['label', 'line-numbers'])
  })
})
