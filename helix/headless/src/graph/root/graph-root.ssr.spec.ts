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

const nodes = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
]

const served = () =>
  withoutStyles(
    ssr(html`<helix-headless-graph label="Research notes" .nodes=${nodes}></helix-headless-graph>`),
  )

describe('graph server output', () => {
  test('the named region is in the served markup', () => {
    const markup = served()
    expect(partTag(markup, 'region')).toContain('aria-label="Research notes"')
    expect(partTag(markup, 'region')).toContain('role="group"')
    expect(partTag(markup, 'region')).toContain('tabindex="0"')
  })

  test('the search field and the named list are served', () => {
    const markup = served()
    expect(partTag(markup, 'search-field')).toContain('aria-label="Find a note"')
    expect(partTag(markup, 'list')).toContain('role="listbox"')
    expect(partTag(markup, 'list')).toContain('aria-label="Notes"')
  })

  test('the count is served from the notes it was given', () => {
    expect(served()).toContain('2 notes')
  })

  test('the zoom and fullscreen controls ship with it, named', () => {
    const markup = served()
    expect(partTag(markup, 'zoom-in')).toContain('aria-label="Zoom in"')
    expect(partTag(markup, 'zoom-out')).toContain('aria-label="Zoom out"')
    expect(hasPart(markup, 'fullscreen')).toBe(true)
    expect(hasPart(markup, 'pan-up')).toBe(false)
  })

  test('with no-panel, the list is served hidden behind its button', () => {
    const markup = withoutStyles(
      ssr(
        html`<helix-headless-graph label="Research notes" no-panel .nodes=${nodes}></helix-headless-graph>`,
      ),
    )
    expect(partTag(markup, 'panel')).toContain('hidden')
    expect(partTag(markup, 'notes-toggle')).toContain('aria-expanded="false"')
    expect(partTag(markup, 'notes-toggle')).toContain('aria-label="Notes"')
  })

  test('the slots a consumer fills are served', () => {
    const inside = rendered(served(), 'helix-headless-graph')
    expect(inside).toContain('name="header"')
    expect(inside).toContain('name="footer"')
  })

  test('the name is on the host through internals rather than as an attribute', () => {
    expect(hostAttributes(served(), 'helix-headless-graph')).not.toContain('aria-label')
  })
})
