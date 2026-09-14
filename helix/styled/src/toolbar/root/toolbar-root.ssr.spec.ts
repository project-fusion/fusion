import { describe, expect, test } from 'bun:test'
import { hostAttributes, partTag, ssr, styles, withoutStyles } from '@fusion.dev/helix-testing/ssr'
import { html } from 'lit'
import '../index.js'

describe('toolbar server output', () => {
  const served = ssr(
    html`<helix-toolbar label="Text formatting">
      <button type="button">Bold</button>
    </helix-toolbar>`,
  )
  const markup = withoutStyles(served)

  test('the toolbar is served with its role, its name and its axis', () => {
    const toolbar = partTag(markup, 'toolbar')
    expect(toolbar).toContain('role="toolbar"')
    expect(toolbar).toContain('aria-label="Text formatting"')
    expect(toolbar).toContain('aria-orientation="horizontal"')
    expect(
      partTag(
        ssr(html`<helix-toolbar label="Drawing" orientation="vertical">x</helix-toolbar>`),
        'toolbar',
      ),
    ).toContain('aria-orientation="vertical"')
  })

  test('the controls are served as the consumer wrote them, with no tab stop written yet', () => {
    // A `tabindex` written onto a foreign control before any interaction is
    // markup React is still hydrating, which it reports and does not patch up.
    expect(markup).toContain('<button type="button">Bold</button>')
    expect(markup).not.toContain('tabindex')
  })

  test('the host carries only what the consumer wrote', () => {
    expect(hostAttributes(served, 'helix-toolbar')).toEqual(['label'])
    expect(
      hostAttributes(
        ssr(html`<helix-toolbar label="Drawing" orientation="vertical">x</helix-toolbar>`),
        'helix-toolbar',
      ),
    ).toEqual(['label', 'orientation'])
  })

  test('declarative shadow DOM carries the styles', () => {
    expect(markup).toContain('shadowrootmode="open"')
    expect(styles(served)).toContain('--toolbar-gap')
  })
})
