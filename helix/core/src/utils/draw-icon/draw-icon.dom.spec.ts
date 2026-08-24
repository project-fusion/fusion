import { beforeAll, describe, expect, test } from 'bun:test'
import type { HelixIcon } from '@helix-io/icons'
import { registerDom } from '@helix-io/testing/dom'

/**
 * The mark a component draws for itself, as opposed to the one a consumer names.
 *
 * **`<helix-icon name="play">` indexes the whole icon set at runtime**, and no
 * bundler can shake a dynamic index, so every consumer of any component that
 * renders one ships all of the generated path data: 50,814 bytes raw and 15,010
 * gzipped for 102 icons. That element is still the right public API, where a
 * consumer writes a name in markup and a lookup is the only thing that can
 * work. It is not how this library should draw its own marks.
 *
 * Rendered rather than inspected as a `TemplateResult`, because what is being
 * asserted is the element that comes out: the attributes are what make a glyph
 * inherit its color, stay out of the accessibility tree, and take the size the
 * sheet in `helix/web` gives it.
 */
let drawIcon: typeof import('./draw-icon.js').drawIcon
let render: typeof import('lit').render

beforeAll(async () => {
  registerDom()
  ;({ drawIcon } = await import('./draw-icon.js'))
  ;({ render } = await import('lit'))
})

const ICON: HelixIcon = {
  content: '<path d="M0 0h4v4H0z" />',
  name: 'probe',
  viewBox: '0 0 16 16',
}

const drawn = (options?: { slot?: string }): SVGElement => {
  const into = document.createElement('div')
  render(drawIcon(ICON, options), into)
  return into.querySelector('svg') as SVGElement
}

describe('a glyph a component draws itself', () => {
  test('is the icon’s own markup, in the icon’s own coordinates', () => {
    const svg = drawn()
    expect(svg.getAttribute('viewBox')).toBe('0 0 16 16')
    expect(svg.querySelector('path')?.getAttribute('d')).toBe('M0 0h4v4H0z')
  })

  /* Two attributes, both load-bearing and neither obvious. `currentColor` is
     what makes a mark take the color of the text it sits in, so one glyph
     works on every tone without the helper knowing any of them. */
  test('takes the color of whatever it is drawn in', () => {
    expect(drawn().getAttribute('fill')).toBe('currentColor')
  })

  /* And it is decoration: the button around it carries the accessible name, so
     a glyph in the tree would be read out twice or, worse, read out as nothing
     at all beside a label that already said it. */
  test('and stays out of the accessibility tree', () => {
    expect(drawn().getAttribute('aria-hidden')).toBe('true')
  })

  /* `data-glyph` rather than a class, because the sizing lives in
     `helix/web/src/icon/glyph.css` and a component's own `--icon-size`
     declarations have to keep working untouched: the variable was read by
     `helix-icon`, and now it is read by the rule that sheet carries. Without it
     every one of those declarations goes quietly dead and every mark in six
     families changes size. */
  test('and is marked for the sheet that sizes it', () => {
    expect(drawn().hasAttribute('data-glyph')).toBe(true)
  })
})

describe('a glyph being handed to another component', () => {
  test('goes into the slot it was told to', () => {
    expect(drawn({ slot: 'icon' }).getAttribute('slot')).toBe('icon')
  })

  /* Absent rather than empty. `slot=""` names the default slot explicitly,
     which is the same assignment by luck and a different thing to `::slotted`
     and to anything reading the attribute. */
  test('and carries no slot at all when there is none to name', () => {
    expect(drawn().hasAttribute('slot')).toBe(false)
  })
})
