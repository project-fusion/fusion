import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom, settle } from '@fusion.dev/helix-testing/dom'
import type {
  EditorFormats,
  EditorRenderer,
  EditorSettings,
  EditorSink,
  EditorTool,
  HelixHeadlessEditor,
} from './editor-root.js'

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

/** What a stand-in renderer was asked, in order. */
interface Asked {
  ran: Array<[EditorTool, string | undefined]>
  focused: number
  settings: EditorSettings[]
}

/** A renderer that writes down what it is asked, drawing in a `contenteditable` of its own. */
const standIn = (
  host: HTMLElement,
  tools?: readonly EditorTool[],
): { asked: Asked; document: HTMLElement; renderer: EditorRenderer } => {
  const asked: Asked = { focused: 0, ran: [], settings: [] }
  const document = host.querySelector('div') as HTMLElement
  document.contentEditable = 'true'
  const renderer: EditorRenderer = {
    focus: () => {
      asked.focused += 1
      document.focus()
    },
    run: (tool, value) => {
      asked.ran.push([tool, value])
      return true
    },
    settings: (settings) => {
      asked.settings.push(settings)
    },
    ...(tools ? { tools: () => tools } : {}),
  }
  return { asked, document, renderer }
}

/** A headless editor with an element for the renderer to draw in. */
const editor = async (attributes = 'label="Notes"'): Promise<HelixHeadlessEditor> =>
  (await mount(
    `<helix-headless-editor ${attributes}><div></div></helix-headless-editor>`,
  )) as HelixHeadlessEditor

/** Attaches a stand-in and waits for the frame to draw what it reported. */
const attached = async (
  host: HelixHeadlessEditor,
  formats?: Partial<EditorFormats>,
  tools?: readonly EditorTool[],
): Promise<ReturnType<typeof standIn> & { sink: EditorSink }> => {
  const stand = standIn(host, tools)
  const sink = host.attach(stand.renderer)
  if (formats) {
    sink.formats({ applied: [], block: 'paragraph', link: '', unavailable: [], ...formats })
  }
  await settle(host)
  return { ...stand, sink }
}

/** Every tool's part, in the order the toolbar draws them. */
const TOOLS = [
  'undo',
  'redo',
  'block',
  'bold',
  'italic',
  'strike',
  'code',
  'link',
  'bullet-list',
  'ordered-list',
  'quote',
]

/** The tools drawn, by their parts, in the order the toolbar draws them. */
const drawn = (host: HTMLElement): string[] =>
  [
    ...(host.shadowRoot?.querySelectorAll(TOOLS.map((name) => `[part~="${name}"]`).join(', ')) ??
      []),
  ].map((tool) => (tool.getAttribute('part') ?? '').split(' ')[0] ?? '')

/** Presses a tool's inner button, as a reader's click does. */
const press = async (host: HelixHeadlessEditor, name: string): Promise<void> => {
  const tool = part(host, name) as HTMLElement & { updateComplete: Promise<unknown> }
  await tool.updateComplete
  const inner = tool.shadowRoot?.querySelector('button')
  if (!inner) {
    throw new Error(`<${tool.localName}> drew no button`)
  }
  inner.click()
  await settle(host)
}

/** A key pressed in the document, from where the reader types. */
const keyIn = (target: HTMLElement, key: string, init: KeyboardEventInit = {}): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    composed: true,
    key,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

describe('the toolbar', () => {
  test('draws every group in order, named, and disabled until a renderer is attached', async () => {
    const host = await editor()
    expect(drawn(host)).toEqual([
      'undo',
      'redo',
      'block',
      'bold',
      'italic',
      'strike',
      'code',
      'link',
      'bullet-list',
      'ordered-list',
      'quote',
    ])
    expect(part(host, 'bold')?.getAttribute('label')).toBe('Bold')
    expect(part(host, 'bold')?.hasAttribute('disabled')).toBe(true)
    expect(part(host, 'controls')?.getAttribute('label')).toBe('Formatting')
    expect(hasState(host, 'connected')).toBe(false)
  })

  test('draws the groups `tools` names, in the toolbar order whatever order the list is in', async () => {
    const host = await editor('label="Notes" tools="quote marks"')
    expect(drawn(host)).toEqual(['bold', 'italic', 'strike', 'code', 'quote'])
    expect(host.shadowRoot?.querySelectorAll('[part="divider"]').length).toBe(1)
  })

  test('draws no tools for `none`, and none while `readonly`', async () => {
    const none = await editor('label="Notes" tools="none"')
    expect(drawn(none)).toEqual([])
    expect(part(none, 'header')?.hasAttribute('hidden')).toBe(true)
    const read = await editor('label="Notes" readonly')
    expect(drawn(read)).toEqual([])
    expect(part(read, 'link-bar')).toBeNull()
  })

  test('leaves out the tools the renderer cannot run, once it is attached', async () => {
    const host = await editor()
    await attached(host, {}, ['bold', 'italic', 'undo', 'redo', 'paragraph', 'heading-1'])
    expect(drawn(host)).toEqual(['undo', 'redo', 'block', 'bold', 'italic'])
    const options = [...(host.shadowRoot?.querySelectorAll('[part="block-option"]') ?? [])]
    expect(options.map((option) => option.getAttribute('value'))).toEqual([
      'paragraph',
      'heading-1',
    ])
  })

  test('presses the tools whose format holds, and disables the ones that cannot apply', async () => {
    const host = await editor()
    await attached(host, { applied: ['bold', 'bullet-list'], unavailable: ['undo', 'code'] })
    expect(hasState(host, 'connected')).toBe(true)
    expect(part(host, 'bold')?.getAttribute('aria-pressed')).toBe('true')
    expect(part(host, 'bold')?.getAttribute('part')).toBe('bold bold-pressed')
    expect(part(host, 'italic')?.getAttribute('part')).toBe('italic')
    expect(part(host, 'italic')?.getAttribute('aria-pressed')).toBe('false')
    expect(part(host, 'bullet-list')?.getAttribute('aria-pressed')).toBe('true')
    expect(part(host, 'undo')?.hasAttribute('disabled')).toBe(true)
    expect(part(host, 'undo')?.hasAttribute('aria-pressed')).toBe(false)
    expect(part(host, 'code')?.hasAttribute('disabled')).toBe(true)
    expect(part(host, 'italic')?.hasAttribute('disabled')).toBe(false)
  })

  test('the arrow keys walk the tools across their groups, as one tab stop', async () => {
    const host = await editor()
    await attached(host, {})
    const bold = part(host, 'bold') as HTMLElement
    bold.focus()
    const from = (bold.shadowRoot?.activeElement ?? bold) as HTMLElement
    from.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'ArrowRight',
      }),
    )
    await settle(host)
    expect(host.shadowRoot?.activeElement?.getAttribute('part')).toBe('italic')
    const italic = host.shadowRoot?.activeElement as HTMLElement
    ;(italic.shadowRoot?.activeElement ?? italic).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key: 'End' }),
    )
    await settle(host)
    expect(host.shadowRoot?.activeElement?.getAttribute('part')).toBe('quote')
  })

  test('a tool runs in the renderer, and focus goes back to the document', async () => {
    const host = await editor()
    const { asked } = await attached(host, {})
    await press(host, 'italic')
    expect(asked.ran).toEqual([['italic', undefined]])
    expect(asked.focused).toBe(1)
  })

  test('a disabled tool runs nothing', async () => {
    const host = await editor()
    const { asked } = await attached(host, { unavailable: ['italic'] })
    ;(part(host, 'italic') as HTMLElement).click()
    expect(asked.ran).toEqual([])
  })

  test('the block menu names the block type at the selection, and checks it', async () => {
    const host = await editor()
    await attached(host, { block: 'heading-2' })
    const button = part(host, 'block') as HTMLElement
    expect(button.getAttribute('label')).toBe('Text style: Heading 2')
    const shown = [...button.querySelectorAll('[data-block]')].filter(
      (name) => !name.hasAttribute('hidden'),
    )
    expect(shown.map((name) => name.textContent)).toEqual(['Heading 2'])
    const checked = [...(host.shadowRoot?.querySelectorAll('[part="block-option"]') ?? [])].filter(
      (option) => (option as HTMLElement & { checked: boolean }).checked,
    )
    expect(checked.map((option) => option.getAttribute('value'))).toEqual(['heading-2'])
  })

  test('a block type chosen in the menu runs in the renderer', async () => {
    const host = await editor()
    const { asked } = await attached(host, {})
    const option = host.shadowRoot?.querySelector(
      '[part="block-option"][value="heading-1"]',
    ) as HTMLElement
    option.dispatchEvent(new CustomEvent('helix-select', { bubbles: true, composed: true }))
    expect(asked.ran).toEqual([['heading-1', undefined]])
  })

  test('the block menu shows each block type its key', async () => {
    const host = await editor()
    const options = [...(host.shadowRoot?.querySelectorAll('[part="block-option"]') ?? [])]
    expect(options.map((option) => option.getAttribute('shortcut'))).toEqual([
      'mod+alt+0',
      'mod+alt+1',
      'mod+alt+2',
      'mod+alt+3',
      'mod+alt+8',
    ])
  })

  test('Undo and Redo draw a glyph that turns with a right-to-left line', async () => {
    const host = await editor()
    expect(part(host, 'undo')?.querySelector('svg')?.hasAttribute('data-mirror')).toBe(true)
    expect(part(host, 'bold')?.querySelector('svg')?.hasAttribute('data-mirror')).toBe(false)
  })

  test('the actions slot is hidden until a page puts a control in it', async () => {
    const bare = await editor()
    expect(part(bare, 'actions')?.hasAttribute('hidden')).toBe(true)
    const host = (await mount(
      '<helix-headless-editor label="Notes"><div></div><button slot="actions">Share</button></helix-headless-editor>',
    )) as HelixHeadlessEditor
    await settle(host)
    expect(part(host, 'actions')?.hasAttribute('hidden')).toBe(false)
  })
})

describe('the renderer', () => {
  test('is told the settings when attached and when one changes', async () => {
    const host = await editor('label="Release notes" placeholder="Write the notes"')
    const { asked } = await attached(host)
    expect(asked.settings.at(-1)).toEqual({
      label: 'Release notes',
      placeholder: 'Write the notes',
      readOnly: false,
    })
    host.readOnly = true
    await settle(host)
    expect(asked.settings.at(-1)?.readOnly).toBe(true)
  })

  test('takes the fallback name where the editor has no label', async () => {
    const host = await editor('')
    const { asked } = await attached(host)
    expect(asked.settings.at(-1)?.label).toBe('Editor')
    expect(part(host, 'region')?.getAttribute('aria-label')).toBe('Editor')
  })

  test('a detached renderer is asked nothing more, and the tools wait again', async () => {
    const host = await editor()
    const { asked, sink } = await attached(host, {})
    sink.detach()
    await settle(host)
    expect(hasState(host, 'connected')).toBe(false)
    expect(host.run('bold')).toBe(false)
    expect(asked.ran).toEqual([])
    expect(part(host, 'bold')?.hasAttribute('disabled')).toBe(true)
  })

  test('`run` runs nothing while the editor is read-only', async () => {
    const host = await editor()
    const { asked } = await attached(host, {})
    host.readOnly = true
    expect(host.run('bold')).toBe(false)
    expect(asked.ran).toEqual([])
  })
})

describe('the address bar', () => {
  test('opens on the Link button with the link at the selection, and applies the address', async () => {
    const host = await editor()
    const { asked } = await attached(host, { link: 'https://fusion.dev' })
    expect(part(host, 'link-bar')?.hasAttribute('hidden')).toBe(true)
    await press(host, 'link')
    expect(hasState(host, 'link-open')).toBe(true)
    const field = part(host, 'link-field') as HTMLInputElement
    expect(field.value).toBe('https://fusion.dev')
    field.value = 'https://fusion.dev/helix'
    field.dispatchEvent(new Event('input', { bubbles: true }))
    keyIn(field, 'Enter')
    await settle(host)
    expect(asked.ran).toEqual([['link', 'https://fusion.dev/helix']])
    expect(hasState(host, 'link-open')).toBe(false)
    expect(asked.focused).toBeGreaterThan(0)
  })

  test('Remove takes the link off, and is disabled where there is none', async () => {
    const host = await editor()
    const { asked, sink } = await attached(host, { link: '' })
    expect(part(host, 'link-remove')?.hasAttribute('disabled')).toBe(true)
    sink.formats({ applied: [], block: 'paragraph', link: 'https://fusion.dev', unavailable: [] })
    await settle(host)
    await press(host, 'link-remove')
    expect(asked.ran).toEqual([['link', '']])
  })

  test('Escape closes it and runs nothing', async () => {
    const host = await editor()
    const { asked } = await attached(host, {})
    await press(host, 'link')
    keyIn(part(host, 'link-field') as HTMLElement, 'Escape')
    await settle(host)
    expect(hasState(host, 'link-open')).toBe(false)
    expect(asked.ran).toEqual([])
  })

  test('Enter during a composition belongs to the input method', async () => {
    const host = await editor()
    const { asked } = await attached(host, {})
    await press(host, 'link')
    keyIn(part(host, 'link-field') as HTMLElement, 'Enter', { isComposing: true })
    await settle(host)
    expect(hasState(host, 'link-open')).toBe(true)
    expect(asked.ran).toEqual([])
  })
})

describe('keys in the document', () => {
  const command = (): KeyboardEventInit => (onApple() ? { metaKey: true } : { ctrlKey: true })

  test('Command+K opens the address bar', async () => {
    const host = await editor()
    const { document } = await attached(host, {})
    const event = keyIn(document, 'k', command())
    await settle(host)
    expect(event.defaultPrevented).toBe(true)
    expect(hasState(host, 'link-open')).toBe(true)
  })

  test('a composition takes every key, Command+K among them', async () => {
    const host = await editor()
    const { document } = await attached(host, {})
    keyIn(document, 'k', { ...command(), isComposing: true })
    await settle(host)
    expect(hasState(host, 'link-open')).toBe(false)
  })

  test('Escape then Tab is stopped before the renderer, and left to the browser', async () => {
    const host = await editor()
    const { document } = await attached(host, {})
    const reached: string[] = []
    document.addEventListener('keydown', (event) => reached.push(event.key))
    keyIn(document, 'Escape')
    const tab = keyIn(document, 'Tab')
    expect(reached).toEqual(['Escape'])
    expect(tab.defaultPrevented).toBe(false)
    keyIn(document, 'Tab')
    expect(reached).toEqual(['Escape', 'Tab'])
  })

  test('Alt+F10 moves focus to the toolbar', async () => {
    const host = await editor()
    const { document } = await attached(host, {})
    document.focus()
    keyIn(document, 'F10', { altKey: true })
    await settle(host)
    const active = host.shadowRoot?.activeElement
    expect(active?.getAttribute('part')).toBe('undo')
  })

  test('focus in the document is recorded, and focus on a tool is not', async () => {
    const host = await editor()
    const { document } = await attached(host, {})
    document.focus()
    expect(hasState(host, 'document-focused')).toBe(true)
    ;(part(host, 'bold') as HTMLElement).focus()
    expect(hasState(host, 'document-focused')).toBe(false)
  })
})
