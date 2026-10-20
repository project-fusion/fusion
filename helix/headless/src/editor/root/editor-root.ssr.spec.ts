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

const served = (
  markup = html`<helix-headless-editor label="Release notes"></helix-headless-editor>`,
) => withoutStyles(ssr(markup))

describe('editor server output', () => {
  test('the named group is served, so the editor has its name before hydration', () => {
    const markup = served()
    expect(partTag(markup, 'region')).toContain('role="group"')
    expect(partTag(markup, 'region')).toContain('aria-label="Release notes"')
  })

  test('unnamed, it is called Editor', () => {
    const markup = served(html`<helix-headless-editor></helix-headless-editor>`)
    expect(partTag(markup, 'region')).toContain('aria-label="Editor"')
  })

  test('the toolbar ships with every tool, named and waiting for a renderer', () => {
    const markup = served()
    expect(partTag(markup, 'controls')).toContain('label="Formatting"')
    const named: Array<[string, string]> = [
      ['undo', 'Undo'],
      ['bold', 'Bold'],
      ['link', 'Link'],
      ['bullet-list', 'Bulleted list'],
      ['quote', 'Quote'],
    ]
    for (const [name, label] of named) {
      expect(partTag(markup, name)).toContain(`label="${label}"`)
      expect(partTag(markup, name)).toMatch(/\sdisabled/)
    }
    expect(partTag(markup, 'block')).toContain('label="Text style: Paragraph"')
  })

  test('`tools` decides which groups are served', () => {
    const markup = served(
      html`<helix-headless-editor label="Notes" tools="marks"></helix-headless-editor>`,
    )
    expect(hasPart(markup, 'bold')).toBe(true)
    expect(hasPart(markup, 'undo')).toBe(false)
    expect(hasPart(markup, 'block')).toBe(false)
    expect(hasPart(markup, 'link')).toBe(false)
  })

  test('a read-only editor is served with no tools', () => {
    const markup = served(
      html`<helix-headless-editor label="Notes" readonly></helix-headless-editor>`,
    )
    expect(hasPart(markup, 'bold')).toBe(false)
    expect(partTag(markup, 'header')).toContain('hidden')
  })

  test('the address bar is served hidden, and the actions slot hidden until filled', () => {
    const markup = served()
    expect(partTag(markup, 'link-bar')).toContain('hidden')
    expect(partTag(markup, 'actions')).toContain('hidden')
  })

  test('the slots a page fills are served', () => {
    const inside = rendered(served(), 'helix-headless-editor')
    expect(inside).toContain('name="actions"')
    expect(inside).toContain('name="footer"')
    expect(hasPart(served(), 'viewport')).toBe(true)
  })

  test('the host carries only what the page wrote', () => {
    const markup = served(
      html`<helix-headless-editor label="Notes" placeholder="Write"></helix-headless-editor>`,
    )
    expect(hostAttributes(markup, 'helix-headless-editor')).toEqual(['label', 'placeholder'])
  })
})
