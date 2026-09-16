import { describe, expect, test } from 'bun:test'
import { hasPart, hostAttributes, partTag, rendered, ssr } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

const markup = ssr(html`<helix-file-input
  accept=".png"
  hint="Up to 10MB"
  label="Attachments"
  multiple
  name="files"
></helix-file-input>`)

describe('input file server output', () => {
  test('the field and its control ship, before any script runs', () => {
    expect(hasPart(markup, 'field')).toBe(true)
    expect(hasPart(markup, 'control')).toBe(true)
    expect(hasPart(markup, 'trigger')).toBe(true)
  })

  test('the control is a real file input carrying what it was given', () => {
    const control = partTag(markup, 'control')
    expect(control).toContain('type="file"')
    expect(control).toContain('accept=".png"')
    expect(control).toContain('name="files"')
    expect(control).toContain('multiple')
  })

  test('no list is served, because nothing has been chosen', () => {
    // And nothing can have been: a file only ever arrives through a reader.
    expect(hasPart(markup, 'field')).toBe(true)
    expect(hasPart(markup, 'list')).toBe(false)
  })

  test('the trigger is a label pointing at the control', () => {
    expect(partTag(markup, 'trigger')).toMatch(/for="control"/)
    expect(rendered(markup, 'helix-file-input')).toContain('Choose files')
  })

  test('the host carries only what the consumer wrote', () => {
    // `data-dropping` is a fact about a gesture and belongs to the field.
    expect(hostAttributes(markup, 'helix-file-input')).toEqual([
      'accept',
      'hint',
      'label',
      'multiple',
      'name',
    ])
  })
})
