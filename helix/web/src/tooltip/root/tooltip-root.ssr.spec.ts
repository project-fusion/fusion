import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, withoutStyles } from '@fusion-io/testing/ssr'
import { html } from 'lit'
import '../index.js'

const tooltip = html`<helix-tooltip content="Regenerates the manifests">
  <button>Analyze</button>
</helix-tooltip>`

describe('tooltip server output', () => {
  test('the trigger is in the served markup', () => {
    expect(withoutStyles(ssr(tooltip))).toContain('Analyze')
  })

  test('the bubble ships as a popover, so it needs no z-index', () => {
    expect(partTag(ssr(tooltip), 'tooltip')).toContain('popover="manual"')
    expect(partTag(ssr(tooltip), 'tooltip')).toContain('role="tooltip"')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(ssr(tooltip), 'helix-tooltip')).toEqual(['content'])
  })
})
