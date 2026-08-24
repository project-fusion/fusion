import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@helix-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Source = HTMLElement & { value: string; updateComplete: Promise<boolean> }

const source = async (attributes = ''): Promise<Source> =>
  (await mount(`<helix-sandbox-source ${attributes}></helix-sandbox-source>`)) as Source

const press = (field: HTMLTextAreaElement, key: string): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
  field.dispatchEvent(event)
  return event
}

/**
 * The source pane, and the contract that is the pane's rather than the
 * sandbox's.
 *
 * **The sandbox already proves the routing**, which is a change reaching the
 * preview and each pane keeping its own name: the source is named 29 times in
 * this family's specs. What this pane owns alone is the keyboard, and it owns a
 * genuine conflict: an editor where Tab indents is a keyboard trap, and an
 * editor where Tab moves focus cannot indent. The way out is Escape, and it is
 * invisible from the sandbox because both halves of it look like a field that
 * received a keystroke.
 */
describe('the source pane', () => {
  /* Tab indents, which is the whole reason this is a pane and not an input. */
  test('indents rather than leaving, which is what an editor is for', async () => {
    const host = await source()
    const field = part(host, 'source') as HTMLTextAreaElement
    field.value = 'ab'
    field.selectionStart = 2
    field.selectionEnd = 2

    expect(press(field, 'Tab').defaultPrevented).toBe(true)
    expect(field.value).toBe('ab  ')
    expect(host.value).toBe('ab  ')
  })

  /* And Escape is the way out, so the pane is not a trap. One Tab after it
     leaves; the one after that indents again, because escaping is about the next
     keystroke rather than a mode the reader has to undo. */
  test('lets Escape hand the next Tab back to the page, and only the next one', async () => {
    const host = await source()
    const field = part(host, 'source') as HTMLTextAreaElement
    field.value = ''
    field.selectionStart = 0
    field.selectionEnd = 0

    press(field, 'Escape')
    expect(press(field, 'Tab').defaultPrevented).toBe(false)
    expect(field.value).toBe('')

    expect(press(field, 'Tab').defaultPrevented).toBe(true)
    expect(field.value).toBe('  ')
  })

  /* A consumer who wants a plain field says so, and then Tab never indents and
     there is nothing to escape from. */
  test('gives the key back entirely where a consumer asked for a plain field', async () => {
    const host = await source('tab-indents="false"')
    const field = part(host, 'source') as HTMLTextAreaElement
    field.value = ''
    field.selectionStart = 0
    field.selectionEnd = 0

    expect(press(field, 'Tab').defaultPrevented).toBe(false)
    expect(field.value).toBe('')
  })

  /* An editable region with no name is one a reader reaches and cannot identify,
     and spellcheck on source is red underlines under every tag name. */
  test('names its region and does not spellcheck code', async () => {
    const field = part(await source(), 'source') as HTMLTextAreaElement
    expect(field.getAttribute('aria-label')).toBe('Example source')
    expect(field.getAttribute('spellcheck')).toBe('false')

    const named = await source('field-label="Styles"')
    expect((part(named, 'source') as HTMLTextAreaElement).getAttribute('aria-label')).toBe('Styles')
  })

  /* Every edit says which pane it came from, which is what lets the root route
     an `html` change and a `css` change to different places without the panes
     knowing about each other. */
  test('says which source it holds on every change it announces', async () => {
    const host = await source('name="css"')
    const field = part(host, 'source') as HTMLTextAreaElement
    let heard: { property: string; value: unknown } | undefined
    host.addEventListener('helix-change', (event) => {
      heard = (event as CustomEvent<{ property: string; value: unknown }>).detail
    })

    field.value = '.a{}'
    field.dispatchEvent(new Event('input', { bubbles: true }))

    expect(heard?.value).toBe('.a{}')
    expect(host.getAttribute('name')).toBe('css')
  })
})
