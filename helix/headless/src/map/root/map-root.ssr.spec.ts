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

const served = () =>
  withoutStyles(ssr(html`<helix-headless-map label="Edinburgh"></helix-headless-map>`))

describe('map server output', () => {
  test('the named region is in the served markup, not added on hydration', () => {
    /* The name is the whole argument for the family, so a page that shipped the
       frame unnamed and fixed it later would be unlabeled for exactly as long as
       hydration takes. */
    const markup = served()
    expect(hasPart(markup, 'region')).toBe(true)
    expect(partTag(markup, 'region')).toContain('aria-label="Edinburgh"')
    expect(partTag(markup, 'region')).toContain('role="group"')
  })

  test('the controls ship with it, named', () => {
    const markup = served()
    expect(partTag(markup, 'zoom-in')).toContain('aria-label="Zoom in"')
    expect(partTag(markup, 'zoom-out')).toContain('aria-label="Zoom out"')
    expect(rendered(markup, 'helix-headless-map')).toContain('aria-label="Pan up"')
  })

  test('the name is on the host through internals rather than as an attribute', () => {
    expect(hostAttributes(served(), 'helix-headless-map')).not.toContain('aria-label')
  })

  test('the slots a consumer fills are served, attribution among them', () => {
    const inside = rendered(served(), 'helix-headless-map')
    expect(inside).toContain('name="attribution"')
    expect(inside).toContain('name="header"')
    expect(inside).toContain('name="footer"')
  })

  test('a frame that keeps no controls ships none, rather than shipping them hidden', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-map label="Edinburgh" controls="none"></helix-headless-map>`),
    )
    expect(hasPart(markup, 'controls')).toBe(false)
    /* And the part that is the whole argument is still there: the frame without
       its buttons is still a named region, which is what a consumer keeping
       their own controls is keeping this for. */
    expect(partTag(markup, 'region')).toContain('aria-label="Edinburgh"')
  })

  test('the resting corner is the attribute being absent', () => {
    const markup = withoutStyles(
      ssr(html`<helix-headless-map label="Edinburgh"></helix-headless-map>`),
    )
    expect(hostAttributes(markup, 'helix-headless-map')).not.toContain('controls-placement')
  })
})
