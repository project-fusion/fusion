import { describe, expect, test } from 'bun:test'
import { htmlToJsx } from './html-to-jsx.js'
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

describe('the two directions agree', () => {
  // The guarantee that matters: the file on screen is the file that runs, so
  // markup turned into JSX and back has to be the markup it started as.
  const examples = [
    '<helix-button appearance="solid" tone="primary">Go</helix-button>',
    '<helix-badge label="Online" style="--badge-offset: 0.25rem">\n  <helix-avatar name="A B" size="lg"></helix-avatar>\n</helix-badge>',
    '<helix-checkbox default-checked disabled name="a">Checked</helix-checkbox>',
    '<helix-date-picker disable-days="0,6" first-day-of-week="1"></helix-date-picker>',
    '<helix-flex direction="column" gap="sm">\n  <helix-text as="p">one</helix-text>\n  <helix-text as="p">two</helix-text>\n</helix-flex>',
    '<img alt="" src="a.png" />',
  ]

  for (const [index, markup] of examples.entries()) {
    test(`round trip ${index + 1} comes back unchanged`, () => {
      expect(jsxToHtml(htmlToJsx(markup)).trim()).toBe(markup.trim())
    })
  }
})
