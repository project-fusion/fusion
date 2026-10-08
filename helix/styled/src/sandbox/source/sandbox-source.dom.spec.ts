import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasLayout, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const reportError = globalThis.reportError
afterEach(() => {
  globalThis.reportError = reportError
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

  /* Browser only: happy-dom keeps no undo history. Writing the field's value
     emptied the history, so undo after Tab took back nothing, neither the
     indent nor what was typed before it. The caret moves between the two edits,
     which closes the first as a keystroke and a click would. */
  test.skipIf(!hasLayout())('lets undo take back an indent, and only the indent', async () => {
    const host = await source()
    const field = part(host, 'source') as HTMLTextAreaElement
    field.focus()
    document.execCommand('insertText', false, 'Y')
    field.setSelectionRange(0, 0)
    field.setSelectionRange(1, 1)

    expect(press(field, 'Tab').defaultPrevented).toBe(true)
    expect(field.value).toBe('Y  ')
    expect(host.value).toBe('Y  ')

    document.execCommand('undo')
    expect(field.value).toBe('Y')
    expect(host.value).toBe('Y')
  })

  /* Browser only, for the computed outline. The focused field showed only a
     change of fill, at 1.04:1 against the one before. */
  test.skipIf(!hasLayout())(
    'draws a ring around the focused field, with or without colors',
    async () => {
      const host = (await source()) as Source & { tokenize?: unknown }
      const field = part(host, 'source') as HTMLTextAreaElement
      field.focus()
      expect(getComputedStyle(field).outlineStyle).toBe('solid')
      expect(Number.parseFloat(getComputedStyle(field).outlineWidth)).toBeGreaterThan(0)

      host.tokenize = (text: string) => [{ text }]
      await host.updateComplete
      const colored = part(host, 'source') as HTMLTextAreaElement
      colored.focus()
      const box = part(host, 'field') as HTMLElement
      expect(getComputedStyle(box).outlineStyle).toBe('solid')
      expect(Number.parseFloat(getComputedStyle(box).outlineWidth)).toBeGreaterThan(0)
    },
  )

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
  test('`tokenize` draws the runs under the field, each with its kind', async () => {
    const host = (await source('value="<p>Hi</p>"')) as Source & {
      tokenize?: (source: string, name: string) => { kind?: string; text: string }[]
    }
    expect(part(host, 'field')).toBeNull()
    const asked: string[] = []
    host.tokenize = (text, name) => {
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
      tokenize?: () => { kind?: string; text: string }[]
    }
    host.tokenize = () => [{ kind: 'name', text: 'a' }]
    await host.updateComplete
    const drawn = part(host, 'highlight') as HTMLElement
    expect(drawn.textContent).toBe('a b\n')
    expect(drawn.querySelector('[part="token"]')).toBeNull()
  })

  test('a `tokenize` that throws leaves the source plain and the field in place', async () => {
    /* The page's function, and so the page's fault, but the reader is the one
       who loses the field: a Prism lookup for a pane it has no grammar for
       throws this way. The error still reaches the page as an uncaught one. */
    const reported: unknown[] = []
    globalThis.reportError = (error: unknown) => {
      reported.push(error)
    }
    const host = (await source('value="abc"')) as Source & { tokenize?: () => never }
    host.tokenize = () => {
      throw new Error('no grammar')
    }
    await host.updateComplete
    expect(part(host, 'source')).not.toBeNull()
    expect(part(host, 'highlight')?.textContent).toBe('abc\n')
    expect(reported.map((error) => (error as Error).message)).toEqual(['no grammar'])
  })

  test('an edit draws the new source in color', async () => {
    const host = (await source('value="a"')) as Source & {
      tokenize?: (text: string) => { kind?: string; text: string }[]
    }
    host.tokenize = (text) => [{ kind: 'keyword', text }]
    await host.updateComplete
    const field = part(host, 'source') as HTMLTextAreaElement
    field.value = 'ab'
    field.dispatchEvent(new Event('input', { bubbles: true }))
    await host.updateComplete
    expect(part(host, 'highlight')?.textContent).toBe('ab\n')
  })
})

describe('the name of the field', () => {
  /* Every file's field was "Example source", so a reader moving between file
     tabs heard the same name for each. */
  test('says the file it holds, where the pane has a label', async () => {
    const named = await source('label="index.html"')
    expect(part(named, 'source')?.getAttribute('aria-label')).toBe('Example source, index.html')
    const plain = await source()
    expect(part(plain, 'source')?.getAttribute('aria-label')).toBe('Example source')
  })
})

describe('the source a pane is written with', () => {
  /* A pane written with its source inside it opened empty, with nothing to
     say the text was ignored. */
  test('is its text where `value` is not set, without the indentation of the page', async () => {
    const host = (await mount(`<helix-sandbox-source name="css">
      p {
        color: red;
      }
    </helix-sandbox-source>`)) as Source
    await host.updateComplete
    expect(host.value).toBe('p {\n  color: red;\n}')
    expect((part(host, 'source') as HTMLTextAreaElement).value).toBe(host.value)
  })

  test('is the markup of a template it holds, which the page does not run', async () => {
    const host = (await mount(`<helix-sandbox-source name="html"><template>
      <p>Hello</p>
      <script>console.log('ran')</script>
    </template></helix-sandbox-source>`)) as Source
    await host.updateComplete
    expect(host.value).toBe(`<p>Hello</p>\n<script>console.log('ran')</script>`)
  })

  test('is `value` where it is set', async () => {
    const host = (await mount(
      '<helix-sandbox-source name="css" value="b { }">a { }</helix-sandbox-source>',
    )) as Source
    await host.updateComplete
    expect(host.value).toBe('b { }')
  })
})

describe('a new line', () => {
  /* Each line of a block was typed back to the margin by hand. */
  test('keeps the indentation of the line it breaks', async () => {
    const host = await source()
    const field = part(host, 'source') as HTMLTextAreaElement
    field.value = 'p {\n  color: red;'
    field.selectionStart = field.value.length
    field.selectionEnd = field.value.length
    expect(press(field, 'Enter').defaultPrevented).toBe(true)
    expect(host.value).toBe('p {\n  color: red;\n  ')
  })

  test('is the platform’s own where the line has no indentation and no bracket opens', async () => {
    const host = await source()
    const field = part(host, 'source') as HTMLTextAreaElement
    field.value = 'p'
    field.selectionStart = 1
    field.selectionEnd = 1
    expect(press(field, 'Enter').defaultPrevented).toBe(false)
  })

  test('goes one level deeper after an opening bracket, with the closing one below', async () => {
    const host = await source('value="p {}"')
    await host.updateComplete
    const field = part(host, 'source') as HTMLTextAreaElement
    field.setSelectionRange(3, 3)
    expect(press(field, 'Enter').defaultPrevented).toBe(true)
    expect(host.value).toBe('p {\n  \n}')
    expect(field.selectionStart).toBe(6)
  })
})

describe('line numbers', () => {
  test('number each line of the source beside it, hidden from screen readers', async () => {
    const host = await source('line-numbers value="a\nb\n\nc"')
    await host.updateComplete
    const lines = [...(host.shadowRoot?.querySelectorAll('[part~="line"]') ?? [])]
    expect(lines).toHaveLength(4)
    expect(lines.map((line) => line.textContent)).toEqual(['a', 'b', '', 'c'])
    expect(part(host, 'highlight')?.getAttribute('aria-hidden')).toBe('true')
    /* The field is still the textarea, and still the only thing read. */
    expect(part(host, 'source')?.localName).toBe('textarea')
  })

  test('are not drawn unless asked', async () => {
    const host = await source('value="a"')
    expect(host.shadowRoot?.querySelector('[part~="line"]')).toBeNull()
  })
})

/** A key pressed with modifiers, such as Control and `]`. */
const chord = (
  field: HTMLTextAreaElement,
  key: string,
  modifiers: KeyboardEventInit = { ctrlKey: true },
): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...modifiers })
  field.dispatchEvent(event)
  return event
}

/** A field holding `value` with `from` to `to` selected. */
const select = async (attributes: string, from: number, to = from) => {
  const host = await source(attributes)
  await host.updateComplete
  const field = part(host, 'source') as HTMLTextAreaElement
  field.setSelectionRange(from, to)
  return { field, host }
}

describe('the editing keys', () => {
  test('Tab with text selected indents every line it touches', async () => {
    const { field, host } = await select('value="a\nb"', 0, 3)
    expect(press(field, 'Tab').defaultPrevented).toBe(true)
    expect(host.value).toBe('  a\n  b')
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, 7])
  })

  test('Mod+] indents the line and Mod+[ outdents it, with Control or Command', async () => {
    const { field, host } = await select('value="a"', 1)
    expect(chord(field, ']').defaultPrevented).toBe(true)
    expect(host.value).toBe('  a')
    expect(chord(field, '[', { metaKey: true }).defaultPrevented).toBe(true)
    expect(host.value).toBe('a')
  })

  test('Mod+/ comments the lines out and back in, in the syntax of the pane', async () => {
    const script = await select('name="js" value="  a()"', 3)
    chord(script.field, '/')
    expect(script.host.value).toBe('  // a()')
    chord(script.field, '/')
    expect(script.host.value).toBe('  a()')

    const markup = await select('value="<p>Hi</p>"', 0)
    chord(markup.field, '/')
    expect(markup.host.value).toBe('<!-- <p>Hi</p> -->')
  })

  test('an edit a consumer refuses leaves the source', async () => {
    const { field, host } = await select('value="a"', 1)
    host.addEventListener('helix-before-edit', (event) => event.preventDefault())
    chord(field, ']')
    expect(host.value).toBe('a')
    expect(field.value).toBe('a')
  })
})

describe('closing brackets', () => {
  test('are off unless asked, so a bracket types as itself', async () => {
    const { field } = await select('value=""', 0)
    expect(press(field, '(').defaultPrevented).toBe(false)
  })

  test('close a bracket typed at the end of a line, and step over the closing one', async () => {
    const { field, host } = await select('close-brackets value="f"', 1)
    expect(press(field, '(').defaultPrevented).toBe(true)
    expect(host.value).toBe('f()')
    expect(field.selectionStart).toBe(2)
    expect(press(field, ')').defaultPrevented).toBe(true)
    expect(host.value).toBe('f()')
    expect(field.selectionStart).toBe(3)
  })

  test('delete an empty pair with one Backspace', async () => {
    const { field, host } = await select('close-brackets value="f()"', 2)
    expect(press(field, 'Backspace').defaultPrevented).toBe(true)
    expect(host.value).toBe('f')
  })
})

describe('matching brackets', () => {
  /** The brackets marked, as their part names. */
  const marked = (host: Source): (string | null)[] =>
    [...(host.shadowRoot?.querySelectorAll('[part~="bracket"]') ?? [])].map((each) =>
      each.getAttribute('part'),
    )

  test('mark the bracket beside the caret and its pair, in a copy hidden from screen readers', async () => {
    const { field, host } = await select('match-brackets value="f(a)"', 4)
    field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'End' }))
    await host.updateComplete
    expect(marked(host)).toEqual(['bracket', 'bracket'])
    expect(part(host, 'highlight')?.getAttribute('aria-hidden')).toBe('true')
    expect(part(host, 'highlight')?.textContent).toBe('f(a)\n')
  })

  test('mark a bracket with no pair as unmatched', async () => {
    const { field, host } = await select('match-brackets value="f(a"', 2)
    field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'ArrowLeft' }))
    await host.updateComplete
    expect(marked(host)).toEqual(['bracket bracket-unmatched'])
  })
})

describe('completion', () => {
  /** Types `text` at the caret, as a keystroke would. */
  const type = (field: HTMLTextAreaElement, text: string): void => {
    field.setRangeText(text, field.selectionStart, field.selectionEnd, 'end')
    field.dispatchEvent(
      new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }),
    )
  }

  test('offers the words that start with the word typed, and Enter takes the one chosen', async () => {
    const { field, host } = await select('complete value="console.log()\n"', 14)
    expect(field.getAttribute('aria-autocomplete')).toBe('list')
    ;(host as Source & { completions: string[] }).completions = ['const']
    await host.updateComplete
    type(field, 'con')
    await host.updateComplete
    const list = part(host, 'completions') as HTMLElement
    expect(list.getAttribute('role')).toBe('listbox')
    expect(list.getAttribute('aria-label')).toBe('Completions')
    expect([...list.querySelectorAll('[role="option"]')].map((each) => each.textContent)).toEqual([
      'console',
      'const',
    ])
    expect(field.getAttribute('aria-controls')).toBe('completions')
    expect(field.getAttribute('aria-activedescendant')).toBe('completion-0')

    expect(press(field, 'ArrowDown').defaultPrevented).toBe(true)
    await host.updateComplete
    expect(field.getAttribute('aria-activedescendant')).toBe('completion-1')
    expect(part(host, 'completion-active')?.textContent).toBe('const')

    expect(press(field, 'Enter').defaultPrevented).toBe(true)
    await host.updateComplete
    expect(host.value).toBe('console.log()\nconst')
    expect(part(host, 'completions')).toBeNull()
    expect(field.hasAttribute('aria-activedescendant')).toBe(false)
  })

  test('closes on Escape without arming the next Tab to leave', async () => {
    const { field, host } = await select('complete value="alpha "', 6)
    type(field, 'al')
    await host.updateComplete
    expect(part(host, 'completions')).not.toBeNull()
    press(field, 'Escape')
    await host.updateComplete
    expect(part(host, 'completions')).toBeNull()
    expect(press(field, 'Tab').defaultPrevented).toBe(true)
  })

  test('are off unless asked', async () => {
    const { field, host } = await select('value="alpha "', 6)
    type(field, 'al')
    await host.updateComplete
    expect(part(host, 'completions')).toBeNull()
    expect(field.hasAttribute('aria-autocomplete')).toBe(false)
  })
})

describe('the source given', () => {
  test('is `:state(modified)` once edited, and `reset()` puts it back as an edit', async () => {
    const { field, host } = await select('value="a"', 1)
    const pane = host as Source & { modified: boolean; reset(): void }
    expect(pane.modified).toBe(false)
    press(field, 'Tab')
    await host.updateComplete
    expect(pane.modified).toBe(true)
    const edits: string[] = []
    host.addEventListener('helix-edit', (event) => edits.push((event as CustomEvent).detail.value))
    pane.reset()
    await host.updateComplete
    expect(host.value).toBe('a')
    expect(field.value).toBe('a')
    expect(pane.modified).toBe(false)
    expect(edits).toEqual(['a'])
  })

  test('is the last `value` set from outside', async () => {
    const { field, host } = await select('value="a"', 1)
    const pane = host as Source & { modified: boolean }
    press(field, 'Tab')
    host.value = 'b'
    await host.updateComplete
    expect(pane.modified).toBe(false)
  })
})
