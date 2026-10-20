import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom, settle } from '@fusion.dev/helix-testing/dom'
import type { FindQuery, FindResult, HelixHeadlessFind } from './find-root.js'

let onApple: () => boolean

/* Imported once the DOM is registered: the element extends whichever
   `HTMLElement` is global when its module is first evaluated. */
beforeAll(async () => {
  registerDom()
  ;({ onApple } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  document.body.innerHTML = ''
})

const ARTICLE = '<article id="notes"><p>One token, two tokens.</p><p>A third token.</p></article>'

/** A Find over the article, with `attributes` on it. */
const findOver = async (attributes = ''): Promise<HelixHeadlessFind> => {
  document.body.innerHTML = `<helix-headless-find for="notes" ${attributes}></helix-headless-find>${ARTICLE}`
  const find = document.querySelector('helix-headless-find') as HelixHeadlessFind
  await searched(find)
  return find
}

/** Settles the element, the search that follows an update, and the update that draws it. */
const searched = async (find: HelixHeadlessFind): Promise<void> => {
  await settle(find)
  await Promise.resolve()
  await settle(find)
}

const field = (find: HelixHeadlessFind): HTMLInputElement => part(find, 'field') as HTMLInputElement
const count = (find: HelixHeadlessFind): string => part(find, 'count')?.textContent?.trim() ?? ''

const type = async (find: HelixHeadlessFind, text: string): Promise<void> => {
  const input = field(find)
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await searched(find)
}

const key = (target: EventTarget, name: string, held: KeyboardEventInit = {}): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key: name,
    ...held,
  })
  target.dispatchEvent(event)
  return event
}

/** The find key on this keyboard. */
const findKey = (): KeyboardEventInit => (onApple() ? { metaKey: true } : { ctrlKey: true })

describe('the bar', () => {
  test('is drawn closed until it opens, and records open', async () => {
    const find = await findOver()
    const bar = part(find, 'bar') as HTMLElement
    expect(bar.hidden).toBe(true)
    expect(bar.getAttribute('role')).toBe('search')
    expect(bar.getAttribute('aria-label')).toBe('Find')
    find.open = true
    await searched(find)
    expect(bar.hidden).toBe(false)
    expect(hasState(find, 'open')).toBe(true)
  })

  test('searches what `for` names when it opens, and says where the search stands', async () => {
    const heard: FindResult[] = []
    document.addEventListener(
      'helix-found',
      (event) => heard.push((event as CustomEvent<FindResult>).detail),
      {
        once: true,
      },
    )
    const find = await findOver('open query="token"')
    expect(count(find)).toBe('1 of 3 matches')
    expect(part(find, 'live')?.textContent).toContain('1 of 3 matches')
    expect(heard).toEqual([{ count: 3, index: 0 }])
  })

  test('searches as the reader types, and Enter and Shift+Enter move between matches', async () => {
    const find = await findOver('open')
    await type(find, 'tokens')
    expect(count(find)).toBe('1 of 1 match')
    /* Shorter, it still matches where it stood: the second "token". */
    await type(find, 'token')
    expect(count(find)).toBe('2 of 3 matches')
    key(field(find), 'Enter')
    await searched(find)
    expect(count(find)).toBe('3 of 3 matches')
    key(field(find), 'Enter', { shiftKey: true })
    key(field(find), 'Enter', { shiftKey: true })
    key(field(find), 'Enter', { shiftKey: true })
    await searched(find)
    expect(count(find)).toBe('3 of 3 matches')
  })

  test('says so where nothing matches, and leaves the buttons that move disabled', async () => {
    const find = await findOver('open query="absent"')
    expect(count(find)).toBe('No matches')
    expect(part(find, 'next')?.hasAttribute('disabled')).toBe(true)
    expect(part(find, 'previous')?.hasAttribute('disabled')).toBe(true)
  })

  test('an option pressed searches again with it, and names its pressed part', async () => {
    const find = await findOver('open query="token"')
    ;(part(find, 'whole-word') as HTMLElement).click()
    await searched(find)
    expect(find.wholeWord).toBe(true)
    expect(part(find, 'whole-word')?.getAttribute('aria-pressed')).toBe('true')
    expect(part(find, 'whole-word-pressed')).not.toBeNull()
    expect(count(find)).toBe('1 of 2 matches')
  })

  test('draws the options `options` names, in its order', async () => {
    const none = await findOver('options="none"')
    expect(part(none, 'match-case')).toBeNull()
    expect(part(none, 'regex')).toBeNull()
    const one = await findOver('options="regex"')
    expect(part(one, 'regex')).not.toBeNull()
    expect(part(one, 'whole-word')).toBeNull()
  })

  test('says a regular expression that cannot be read, and marks the field invalid', async () => {
    const find = await findOver('open regex')
    await type(find, '(')
    expect(field(find).getAttribute('aria-invalid')).toBe('true')
    expect(count(find)).toBe('Not a valid regular expression')
  })
})

describe('opening and closing', () => {
  test('show puts focus in the field with what it holds selected', async () => {
    const find = await findOver('query="token"')
    await find.show()
    await searched(find)
    expect(find.shadowRoot?.activeElement).toBe(field(find))
    expect(count(find)).toBe('1 of 3 matches')
  })

  test('Escape closes the bar and returns focus to where it was', async () => {
    const find = await findOver()
    const button = document.createElement('button')
    document.body.append(button)
    button.focus()
    await find.show()
    const closing = key(field(find), 'Escape')
    await searched(find)
    expect(closing.defaultPrevented).toBe(true)
    expect(find.open).toBe(false)
    expect(document.activeElement).toBe(button)
  })

  test('the find key opens the bar where the reader is in the content, and not elsewhere', async () => {
    const find = await findOver()
    const elsewhere = document.createElement('input')
    document.body.append(elsewhere)
    elsewhere.focus()
    const ignored = key(elsewhere, 'f', findKey())
    expect(ignored.defaultPrevented).toBe(false)
    expect(find.open).toBe(false)
    const paragraph = document.querySelector('#notes p') as HTMLElement
    paragraph.dispatchEvent(new Event('pointerdown', { bubbles: true, composed: true }))
    const taken = key(document.body, 'f', findKey())
    await searched(find)
    expect(taken.defaultPrevented).toBe(true)
    expect(find.open).toBe(true)
  })

  test('an empty shortcut leaves the find key to the browser', async () => {
    const find = await findOver('shortcut=""')
    const taken = key(document.querySelector('#notes p') as HTMLElement, 'f', findKey())
    expect(taken.defaultPrevented).toBe(false)
    expect(find.open).toBe(false)
  })

  test('text selected in the content on one line becomes the search', async () => {
    const find = await findOver()
    const text = document.querySelector('#notes p')?.firstChild as Text
    const range = document.createRange()
    range.setStart(text, 4)
    range.setEnd(text, 9)
    document.getSelection()?.removeAllRanges()
    document.getSelection()?.addRange(range)
    await find.show()
    expect(find.query).toBe('token')
  })
})

/** A finder that writes down what it is asked, and answers with `result`. */
const standIn = (result: FindResult | undefined, replaces = true) => {
  const asked: string[] = []
  const finder = {
    end: () => {
      asked.push('end')
    },
    find: (query: FindQuery, direction: string) => {
      asked.push(`find ${query.search} ${direction}`)
      return result
    },
    ...(replaces
      ? {
          replace: (query: FindQuery, all: boolean) => {
            asked.push(`replace ${query.search} ${query.replace} ${all ? 'all' : 'one'}`)
            return result
          },
        }
      : {}),
  }
  return { asked, finder }
}

describe('a finder attached', () => {
  test('searches in place of the text, and reports a search it finishes later', async () => {
    const find = (await mount(
      '<helix-headless-find open></helix-headless-find>',
    )) as HelixHeadlessFind
    const { asked, finder } = standIn(undefined)
    const sink = find.attach(finder)
    await type(find, 'error')
    expect(asked).toContain('find error first')
    expect(count(find)).toBe('')
    sink.found({ count: 4, index: 1 })
    await searched(find)
    expect(count(find)).toBe('2 of 4 matches')
    find.next()
    expect(asked.at(-1)).toBe('find error next')
    sink.detach()
    expect(asked.at(-1)).toBe('end')
  })

  test('offers replacing to a finder that can, and not where the content is read only', async () => {
    const find = (await mount(
      '<helix-headless-find open></helix-headless-find>',
    )) as HelixHeadlessFind
    const { asked, finder } = standIn({ count: 2, index: 0 })
    find.attach(finder)
    await searched(find)
    const toggle = part(find, 'replace-toggle') as HTMLElement
    expect(toggle).not.toBeNull()
    toggle.click()
    await searched(find)
    expect(hasState(find, 'replace-open')).toBe(true)
    await type(find, 'cat')
    const replacement = part(find, 'replace-field') as HTMLInputElement
    replacement.value = 'dog'
    replacement.dispatchEvent(new Event('input', { bubbles: true }))
    await searched(find)
    key(replacement, 'Enter')
    key(replacement, 'Enter', onApple() ? { metaKey: true } : { ctrlKey: true })
    expect(asked.filter((entry) => entry.startsWith('replace'))).toEqual([
      'replace cat dog one',
      'replace cat dog all',
    ])
    find.readOnly = true
    await searched(find)
    expect(part(find, 'replace-toggle')).toBeNull()
    expect(part(find, 'replace-field')).toBeNull()
  })

  test('draws no replace toggle for a finder that cannot replace', async () => {
    const find = (await mount(
      '<helix-headless-find open></helix-headless-find>',
    )) as HelixHeadlessFind
    find.attach(standIn({ count: 0, index: -1 }, false).finder)
    await searched(find)
    expect(part(find, 'replace-toggle')).toBeNull()
  })

  test('ends the search as the bar closes', async () => {
    const find = (await mount(
      '<helix-headless-find open query="x"></helix-headless-find>',
    )) as HelixHeadlessFind
    const { asked, finder } = standIn({ count: 1, index: 0 })
    find.attach(finder)
    await searched(find)
    find.hide()
    await searched(find)
    expect(asked.at(-1)).toBe('end')
  })
})
