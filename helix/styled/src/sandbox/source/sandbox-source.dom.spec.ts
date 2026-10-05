import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

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
 * **The sandbox already proves the routing**, a change reaching the preview and
 * each pane keeping its own name. What this pane owns alone is the keyboard, and
 * it owns a genuine conflict: an editor where Tab indents is a keyboard trap,
 * and an editor where Tab moves focus cannot indent. The way out is Escape, and
 * it is invisible from the sandbox because both halves of it look like a field
 * that received a keystroke.
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

  /* A reader moving backward into the field had no way back out but Escape,
     which nothing told them, and the attempt wrote two spaces as an edit. */
  test('lets Shift+Tab leave, with or without Escape first', async () => {
    const host = await source()
    const field = part(host, 'source') as HTMLTextAreaElement
    field.value = ''
    const back = (): KeyboardEvent => {
      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Tab',
        shiftKey: true,
      })
      field.dispatchEvent(event)
      return event
    }
    expect(back().defaultPrevented).toBe(false)
    press(field, 'Escape')
    press(field, 'Shift')
    expect(back().defaultPrevented).toBe(false)
    expect(field.value).toBe('')
  })

  /* The Shift that starts the chord is a keydown of its own, and it cleared the
     Escape before the Tab arrived. */
  test('keeps an Escape through a modifier pressed after it', async () => {
    const host = await source()
    const field = part(host, 'source') as HTMLTextAreaElement
    field.value = ''
    press(field, 'Escape')
    press(field, 'Control')
    expect(press(field, 'Tab').defaultPrevented).toBe(false)
  })

  test('tells a screen reader how to leave while Tab indents', async () => {
    const host = await source()
    const field = part(host, 'source') as HTMLTextAreaElement
    const id = field.getAttribute('aria-describedby') ?? ''
    expect(host.shadowRoot?.getElementById(id)?.textContent).toContain('Escape')
    const plain = part(await source('tab-indents="false"'), 'source') as HTMLTextAreaElement
    expect(plain.hasAttribute('aria-describedby')).toBe(false)
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
    host.addEventListener('helix-before-edit', (event) => {
      heard = (event as CustomEvent<{ property: string; value: unknown }>).detail
    })

    field.value = '.a{}'
    field.dispatchEvent(new Event('input', { bubbles: true }))

    expect(heard?.value).toBe('.a{}')
    expect(host.getAttribute('name')).toBe('css')
  })

  test('says an edit happened once the pane holds it, and says nothing of a refused one', async () => {
    const host = (await source()) as HTMLElement & { value: string }
    const field = part(host, 'source') as HTMLTextAreaElement
    const edits: string[] = []
    host.addEventListener('helix-edit', (event) => {
      edits.push(`${(event as CustomEvent<{ value: string }>).detail.value}=${host.value}`)
    })
    field.value = '<b>'
    field.dispatchEvent(new Event('input', { bubbles: true }))
    expect(edits).toEqual(['<b>=<b>'])

    host.addEventListener('helix-before-edit', (event) => event.preventDefault())
    field.value = '<i>'
    field.dispatchEvent(new Event('input', { bubbles: true }))
    expect(edits).toEqual(['<b>=<b>'])
  })

  test('its description names both ways out of the field', async () => {
    const host = await source()
    const keys = host.shadowRoot?.getElementById('keys')?.textContent ?? ''
    expect(keys).toContain('Escape and then Tab')
    expect(keys).toContain('Shift+Tab')
  })
})

/**
 * The cursor readout, which is the half of this pane a status bar reads.
 *
 * Worth its own block because this pane is the half of the readout that *ships*.
 * The root's listener and the status bar's `caret` part are both in
 * `@fusion.dev/helix`, so a pane here that reports nothing leaves a consumer with
 * a status bar that can never fill, whatever the private
 * `@fusion.dev/helix-sandbox` editor does.
 */
describe('the source pane reporting its cursor', () => {
  const caret = async (value: string, at: number): Promise<{ column: number; line: number }> => {
    const host = await source()
    const field = part(host, 'source') as HTMLTextAreaElement
    let detail: { column: number; line: number } | undefined
    host.addEventListener('helix-caret', (event) => {
      detail = (event as CustomEvent<{ column: number; line: number }>).detail
    })
    field.value = value
    field.selectionStart = at
    field.selectionEnd = at
    field.dispatchEvent(new Event('keyup', { bubbles: true }))
    return detail as { column: number; line: number }
  }

  /* One-based on both axes, which is what an editor shows and what the detail's
     own documentation promises. A zero would be a position nothing is at. */
  test('counts from one on both axes', async () => {
    expect(await caret('abc', 0)).toEqual({ column: 1, line: 1 })
    expect(await caret('abc', 3)).toEqual({ column: 4, line: 1 })
  })

  /* The column restarts at each newline rather than counting from the top of the
     document, which is the whole difference between a column and an offset. */
  test('restarts the column at every line', async () => {
    expect(await caret('ab\ncdef', 3)).toEqual({ column: 1, line: 2 })
    expect(await caret('ab\ncdef', 6)).toEqual({ column: 4, line: 2 })
    expect(await caret('ab\ncd\ne', 6)).toEqual({ column: 1, line: 3 })
  })

  /* Bubbling and composed, because the root binds one listener on itself and the
     pane is inside its shadow tree. Neither, and the status bar stays empty for
     the same reason it was empty before this was wired at all. */
  test('leaves its own root, which is where the listener is', async () => {
    const host = await source()
    const field = part(host, 'source') as HTMLTextAreaElement
    let seen: Event | undefined
    host.addEventListener('helix-caret', (event) => {
      seen = event
    })
    field.value = 'a'
    field.selectionStart = 1
    field.dispatchEvent(new Event('keyup', { bubbles: true }))
    expect(seen?.bubbles).toBe(true)
    expect(seen?.composed).toBe(true)
  })

  /* A highlighter is the consumer's, so the pane takes runs of text rather
     than markup, and draws them as text: nothing a highlighter returns is
     parsed as HTML. */
  test('`highlight` draws the runs under the field, each with its kind', async () => {
    const host = (await source('value="<p>Hi</p>"')) as Source & {
      highlight?: (source: string, name: string) => { kind?: string; text: string }[]
    }
    expect(part(host, 'field')).toBeNull()
    const asked: string[] = []
    host.highlight = (text, name) => {
      asked.push(name)
      return text
        .split(/(<\/?|>)/)
        .filter(Boolean)
        .map((run) =>
          /^<|>$/.test(run)
            ? { text: run }
            : { kind: run === 'p' || run === '/p' ? 'tag' : 'string', text: run },
        )
    }
    await host.updateComplete
    expect(asked).toEqual(['html'])
    const drawn = part(host, 'highlight') as HTMLElement
    expect(drawn.getAttribute('aria-hidden')).toBe('true')
    expect(drawn.textContent).toBe('<p>Hi</p>\n')
    const tokens = [...drawn.querySelectorAll('[part="token"]')]
    expect(tokens.map((token) => token.getAttribute('data-kind'))).toEqual(['tag', 'string', 'tag'])
    expect(part(host, 'field')?.contains(part(host, 'source') as Element)).toBe(true)
  })

  test('runs that do not add up to the source draw it plain, so the caret stays on its text', async () => {
    const host = (await source('value="a b"')) as Source & {
      highlight?: () => { kind?: string; text: string }[]
    }
    host.highlight = () => [{ kind: 'name', text: 'a' }]
    await host.updateComplete
    const drawn = part(host, 'highlight') as HTMLElement
    expect(drawn.textContent).toBe('a b\n')
    expect(drawn.querySelector('[part="token"]')).toBeNull()
  })

  test('an edit draws the new source in color', async () => {
    const host = (await source('value="a"')) as Source & {
      highlight?: (text: string) => { kind?: string; text: string }[]
    }
    host.highlight = (text) => [{ kind: 'keyword', text }]
    await host.updateComplete
    const field = part(host, 'source') as HTMLTextAreaElement
    field.value = 'ab'
    field.dispatchEvent(new Event('input', { bubbles: true }))
    await host.updateComplete
    expect(part(host, 'highlight')?.textContent).toBe('ab\n')
  })
})
