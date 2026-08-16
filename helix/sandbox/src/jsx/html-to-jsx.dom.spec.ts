import { describe, expect, test } from 'bun:test'
import { htmlToJsx } from './html-to-jsx.js'
import { jsxToHtml } from './jsx-to-html.js'

describe('html to jsx', () => {
  test('wraps the markup in a component', () => {
    expect(htmlToJsx('<helix-button>Go</helix-button>')).toBe(
      `export function Example() {
  return (
      <helix-button>Go</helix-button>
  )
}
`,
    )
  })

  test('a single root needs no fragment, and several do', () => {
    expect(htmlToJsx('<p>one</p>')).not.toContain('<>')
    expect(htmlToJsx('<p>one</p>\n<p>two</p>')).toContain('<>')
  })

  test('class and for are the two words JSX spells differently', () => {
    const out = htmlToJsx('<label class="a" for="b">x</label>')
    expect(out).toContain('className="a"')
    expect(out).toContain('htmlFor="b"')
  })

  test('hyphenated attributes are left alone', () => {
    // The part that looks wrong and is not. Every camelCase property here
    // declares a hyphenated attribute, and React sets it on a custom element
    // verbatim: `field-label` reaches `fieldLabel`, and `fieldLabel` reaches
    // nothing at all.
    const out = htmlToJsx(
      '<helix-calendar disable-days="0,6" first-day-of-week="1"></helix-calendar>',
    )
    expect(out).toContain('disable-days="0,6"')
    expect(out).toContain('first-day-of-week="1"')
  })

  test('a bare attribute is true, which JSX says by saying nothing', () => {
    const out = htmlToJsx('<helix-checkbox default-checked disabled>x</helix-checkbox>')
    expect(out).toContain('<helix-checkbox default-checked disabled>')
  })

  test('style becomes an object, and a custom property keeps its dashes', () => {
    const out = htmlToJsx('<helix-badge style="--badge-offset: 0.25rem">x</helix-badge>')
    expect(out).toContain("style={{ '--badge-offset': '0.25rem' }}")
  })

  test('a css property is camel-cased, unlike a custom one', () => {
    const out = htmlToJsx('<div style="background-color: red; margin-block: 1rem"></div>')
    expect(out).toContain("backgroundColor: 'red'")
    expect(out).toContain("marginBlock: '1rem'")
  })

  test('a void element closes itself', () => {
    expect(htmlToJsx('<img alt="" src="a.png">')).toContain('<img alt="" src="a.png" />')
  })

  test('an already self-closed element stays closed once', () => {
    expect(htmlToJsx('<img alt="" src="a.png" />')).toContain('<img alt="" src="a.png" />')
  })

  test('a comment becomes an expression', () => {
    const out = htmlToJsx('<!-- why -->\n<p>x</p>')
    expect(out).toContain('{/* why */}')
    expect(out).not.toContain('<!--')
  })

  test('the component can be named', () => {
    expect(htmlToJsx('<p>x</p>', 'Badge')).toContain('export function Badge()')
  })
})

describe('an example states its stylesheet in the syntax being read', () => {
  const html = `<link rel="stylesheet" href="styles.css" />

<helix-card class="wide">Body</helix-card>
`

  test('a link becomes an import, above the component rather than inside it', () => {
    /* Both are what that consumer actually writes, which is the whole point of
       showing the stylesheet at all: an example whose CSS arrives invisibly is
       an example that does not work when it is copied. */
    const jsx = htmlToJsx(html)
    expect(jsx).toContain("import './styles.css'")
    expect(jsx).not.toContain('<link')
    expect(jsx.indexOf("import './styles.css'")).toBeLessThan(jsx.indexOf('export function'))
  })

  test('and comes back, so switching syntax twice returns the file', () => {
    const back = jsxToHtml(htmlToJsx(html))
    expect(back).toContain('<link rel="stylesheet" href="styles.css" />')
    expect(back).toContain('<helix-card class="wide">Body</helix-card>')
  })

  test('an example with no stylesheet gains no import', () => {
    expect(htmlToJsx('<helix-card>Body</helix-card>\n')).not.toContain('import')
  })
})
