import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { headingIn, headingsIn } from './heading-in.js'

beforeAll(() => {
  registerDom()
})

const make = (markup: string): Element[] => {
  const box = document.createElement('div')
  box.innerHTML = markup
  return [...box.children]
}

describe('the heading that names a panel', () => {
  test('is the first heading, itself or inside an element, in order', () => {
    expect(
      headingIn(make('<p>Text</p><div><h3>Filters</h3></div><h2>Later</h2>'))?.textContent,
    ).toBe('Filters')
    expect(headingIn(make('<h4>Own</h4>'))?.textContent).toBe('Own')
    expect(headingIn(make('<div role="heading">Role</div>'))?.textContent).toBe('Role')
  })

  test('is nothing where there is none', () => {
    expect(headingIn(make('<p>Text</p>'))).toBeNull()
    expect(headingIn([])).toBeNull()
  })
})

describe('the words that name a panel by its header', () => {
  test('are the first heading alone, so a close button beside it is not read', () => {
    const header = make('<div><h2>Delete project</h2><button>Close</button></div><h3>Later</h3>')
    expect(headingsIn(header).map((one) => one.textContent)).toEqual(['Delete project'])
  })

  test('are the whole header where it holds no heading', () => {
    const header = make('<span>Delete</span><b>project</b>')
    expect(headingsIn(header).map((one) => one.textContent)).toEqual(['Delete', 'project'])
    expect(headingsIn([])).toEqual([])
  })
})
