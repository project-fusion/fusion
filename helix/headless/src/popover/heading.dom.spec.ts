import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { headingIn } from './heading.js'

beforeAll(() => {
  registerDom()
})

const make = (markup: string): Element[] => {
  const box = document.createElement('div')
  box.innerHTML = markup
  return [...box.children]
}

describe('the heading that names a popover', () => {
  test('is the first heading, itself or inside an element, in order', () => {
    expect(
      headingIn(make('<p>Text</p><div><h3>Filters</h3></div><h2>Later</h2>'))?.textContent,
    ).toBe('Filters')
    expect(headingIn(make('<h4>Own</h4>'))?.textContent).toBe('Own')
    expect(headingIn(make('<div role="heading">Role</div>'))?.textContent).toBe('Role')
  })

  test('is nothing where there is none', () => {
    expect(headingIn(make('<p>Text</p>'))).toBeNull()
  })
})
