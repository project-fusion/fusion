import { describe, expect, test } from 'bun:test'
import {
  hostAttributes,
  partTag,
  rendered,
  ssr,
  withoutStyles,
} from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'
import { styles } from './pagination-size.css.js'

describe('pagination size server output', () => {
  test('the select and its options ship, rather than appearing on hydration', () => {
    const it = html`<helix-pagination-size
      default-value="25"
      sizes="10,25,50"
    ></helix-pagination-size>`
    const served = ssr(it)
    const shadow = rendered(served, 'helix-pagination-size')
    expect(partTag(served, 'control')).toMatch(/^<helix-select\s/)
    expect(shadow).toContain('value="10"')
    expect(shadow).toContain('value="50"')
  })

  test('the label ships with it, so the row is one line before any script runs', () => {
    /* `toContain('Rows')` passed on the host's own `label="Rows"`, sitting in
       the markup being searched: the size chooser could have rendered nothing
       and the test would have held. What it owes is the label handed down to
       the select it renders. */
    const it = html`<helix-pagination-size label="Rows"></helix-pagination-size>`
    expect(partTag(ssr(it), 'control')).toContain('label="Rows"')
  })

  test('nothing to choose from renders nothing', () => {
    // A chooser with no choices is a control a reader can reach and cannot use,
    // which is worse than an absence.
    const it = html`<helix-pagination-size sizes=""></helix-pagination-size>`
    expect(withoutStyles(ssr(it))).not.toContain('<helix-select')
  })

  test('the host stays exactly as the consumer wrote it', () => {
    const it = html`<helix-pagination-size sizes="10,25"></helix-pagination-size>`
    expect(hostAttributes(ssr(it), 'helix-pagination-size')).toEqual(['sizes'])
  })
})

describe('pagination size hooks', () => {
  test('the hooks the docs name are what the sheet reads', () => {
    for (const hook of ['--pagination-size', '--pagination-size-gap']) {
      expect(styles.cssText).toMatch(new RegExp(`var\\(\\s*${hook},`))
    }
  })
})
