import { describe, expect, test } from 'bun:test'
import {
  hasPart,
  hostAttributes,
  partTag,
  rendered,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const served = (markup = html`<helix-headless-terminal label="zsh"></helix-headless-terminal>`) =>
  withoutStyles(ssr(markup))

describe('terminal server output', () => {
  test('the named group is served, so the terminal has its name before hydration', () => {
    const markup = served()
    expect(partTag(markup, 'region')).toContain('role="group"')
    expect(partTag(markup, 'region')).toContain('aria-label="zsh"')
  })

  test('unnamed, it is called Terminal', () => {
    const markup = served(html`<helix-headless-terminal></helix-headless-terminal>`)
    expect(partTag(markup, 'region')).toContain('aria-label="Terminal"')
  })

  test('the header ships with the name and the resting controls, named', () => {
    const markup = served()
    expect(rendered(markup, 'helix-headless-terminal')).toContain('zsh')
    expect(partTag(markup, 'find')).toContain('aria-label="Find"')
    expect(partTag(markup, 'clear')).toContain('aria-label="Clear"')
    expect(hasPart(markup, 'copy')).toBe(false)
    expect(hasPart(markup, 'fullscreen')).toBe(false)
  })

  test('the find bar and the status line are served hidden', () => {
    const markup = served()
    expect(partTag(markup, 'find-bar')).toContain('hidden')
    expect(partTag(markup, 'status')).toContain('hidden')
  })

  test('an exit written in the markup is served with its sentence and Restart', () => {
    const markup = served(
      html`<helix-headless-terminal label="zsh" exit-code="1"></helix-headless-terminal>`,
    )
    expect(partTag(markup, 'status')).not.toContain('hidden')
    expect(rendered(markup, 'helix-headless-terminal')).toContain('The process exited with code 1.')
    expect(hasPart(markup, 'restart')).toBe(true)
    expect(partTag(markup, 'exit-actions')).toContain('name="exit-actions"')
  })

  test('the slots a page fills are served', () => {
    const inside = rendered(served(), 'helix-headless-terminal')
    expect(inside).toContain('name="actions"')
    expect(inside).toContain('name="find-actions"')
    expect(inside).toContain('name="label"')
    expect(hasPart(served(), 'viewport')).toBe(true)
  })

  test('the host carries only what the page wrote', () => {
    expect(hostAttributes(served(), 'helix-headless-terminal')).toEqual(['label'])
  })
})
