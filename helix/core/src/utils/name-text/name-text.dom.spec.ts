import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * The words a node's content gives a name, which `AriaForwardController` reads
 * in every build and the missing-name warning reads in development.
 *
 * Imported after `registerDom()`, so the module reads happy-dom's `Node` and
 * `HTMLSlotElement` rather than bun's.
 */
let nameText: typeof import('./name-text.js').nameText

beforeAll(async () => {
  registerDom()
  ;({ nameText } = await import('./name-text.js'))
})

const markup = (html: string): HTMLElement => {
  document.body.innerHTML = html
  return document.body.firstElementChild as HTMLElement
}

describe('nameText', () => {
  test('reads the text of a node and of everything in it', () => {
    expect(nameText(markup('<button>Save <b>draft</b></button>'))).toBe('Save draft')
  })

  test('reads what a slot holds, where the content is', () => {
    const host = markup('<span><em>Delete</em></span>')
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = '<button><slot></slot></button>'
    expect(nameText(root.querySelector('button') as Element)).toBe('Delete')
  })

  test('takes nothing from a node hidden from the reader', () => {
    expect(nameText(markup('<p>Open<span hidden>secret</span></p>'))).toBe('Open')
    expect(nameText(markup('<p>Open<span aria-hidden="true">×</span></p>'))).toBe('Open')
  })

  test('takes an icon’s own label, or a picture’s alt, in place of its content', () => {
    expect(nameText(markup('<button><svg aria-label="Close"></svg></button>'))).toBe('Close')
    expect(nameText(markup('<a><img alt="Home"></a>'))).toBe('Home')
  })

  test('takes no words from the part that shows the value', () => {
    const button = markup('<button><span>Language</span><span part="value">English</span></button>')
    const value = button.querySelector('[part="value"]')
    expect(nameText(button, value)).toBe('Language')
  })
})
