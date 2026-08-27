import { describe, expect, test } from 'bun:test'
import { jsxToHtml } from './jsx-to-html.js'

describe('jsx to html', () => {
  test('the component wrapper is scaffolding, and comes off', () => {
    const out = jsxToHtml(`export function Example() {
  return (
      <helix-button>Go</helix-button>
  )
}
`)
    expect(out.trim()).toBe('<helix-button>Go</helix-button>')
  })

  test('a fragment comes off with it', () => {
    const out = jsxToHtml(`export function Example() {
  return (
    <>
      <p>one</p>
      <p>two</p>
    </>
  )
}
`)
    expect(out.trim()).toBe('<p>one</p>\n<p>two</p>')
  })

  test('className and htmlFor go back to what HTML calls them', () => {
    const out = jsxToHtml('<label className="a" htmlFor="b">x</label>')
    expect(out).toContain('class="a"')
    expect(out).toContain('for="b"')
  })

  test('a style object goes back to a string, dashes and all', () => {
    const out = jsxToHtml(`<div style={{ backgroundColor: 'red', '--x': '1rem' }}></div>`)
    expect(out).toContain('style="background-color: red; --x: 1rem"')
  })

  test('a self-closing tag gets the pair HTML requires', () => {
    // JSX lets anything close itself. HTML lets only void elements, and a
    // `<helix-icon />` left as it is swallows everything after it.
    expect(jsxToHtml('<helix-icon name="bell" />')).toContain(
      '<helix-icon name="bell"></helix-icon>',
    )
  })

  test('a void element keeps closing itself', () => {
    expect(jsxToHtml('<img alt="" src="a.png" />')).toContain('<img alt="" src="a.png" />')
  })

  test('an expression comment goes back to a comment', () => {
    expect(jsxToHtml('{/* why */}\n<p>x</p>')).toContain('<!-- why -->')
  })

  test('a bare prop stays bare', () => {
    expect(jsxToHtml('<helix-checkbox disabled>x</helix-checkbox>')).toContain(
      '<helix-checkbox disabled>',
    )
  })
})

/* **The round-trip suite is gone with the second converter, and so is the
   property it asserted.** It ran `jsxToHtml(htmlToJsx(markup))` over six
   examples and expected the markup back, which is a guarantee about a pair.
   There is no pair now: each syntax is a file somebody wrote, `htmlToJsx` is
   deleted, and what holds the two to each other is `check:examples-paired` for
   their existence and `check:visual` for their pictures. */
