import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/* Imported once the DOM is registered: core reads the globals as it loads. */
let holdControls: typeof import('./controls.js').holdControls
let releaseControls: typeof import('./controls.js').releaseControls

beforeAll(async () => {
  registerDom()
  ;({ holdControls, releaseControls } = await import('./controls.js'))
})

const row = (markup: string): HTMLElement => {
  const element = document.createElement('div')
  element.innerHTML = markup
  document.body.replaceChildren(element)
  return element
}

describe('holding a row’s own controls', () => {
  test('takes every control out of the tab order', () => {
    const held = row('<a href="#">Open</a><button>Share</button><input>')
    holdControls([held])
    expect(
      [...held.querySelectorAll('a, button, input')].map((control) =>
        control.getAttribute('tabindex'),
      ),
    ).toEqual(['-1', '-1', '-1'])
  })

  test('gives each control back the tabindex it was written with', () => {
    const held = row(
      '<a href="#">Open</a><button tabindex="0">Share</button><span tabindex="2">x</span>',
    )
    holdControls([held])
    releaseControls([held])
    const [link, button, span] = [...held.querySelectorAll('a, button, span')]
    expect(link?.hasAttribute('tabindex')).toBe(false)
    expect(button?.getAttribute('tabindex')).toBe('0')
    expect(span?.getAttribute('tabindex')).toBe('2')
  })

  test('leaves a tabindex it did not write alone on release', () => {
    const held = row('<button>Share</button>')
    const added = document.createElement('a')
    added.href = '#'
    added.setAttribute('tabindex', '-1')
    held.append(added)
    releaseControls([held])
    expect(added.getAttribute('tabindex')).toBe('-1')
  })
})
