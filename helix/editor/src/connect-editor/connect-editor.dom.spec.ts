import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import {
  hasLayout,
  hasState,
  mount,
  part,
  registerDom,
  settle,
} from '@fusion.dev/helix-testing/dom'
import type { Schema } from 'prosemirror-model'
import type { Plugin } from 'prosemirror-state'
import type { EditorView } from 'prosemirror-view'

/* Imported after the DOM is registered, like the elements: ProseMirror's view
   reads the DOM it finds as it loads. */
let connectEditor: typeof import('../index.js').connectEditor
let editorPlugins: typeof import('../index.js').editorPlugins
let editorSchema: typeof import('../index.js').editorSchema
let DOMParser: typeof import('prosemirror-model').DOMParser
let EditorState: typeof import('prosemirror-state').EditorState
let TextSelection: typeof import('prosemirror-state').TextSelection
let View: typeof import('prosemirror-view').EditorView

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/editor')
  ;({ connectEditor, editorPlugins, editorSchema } = await import('../index.js'))
  ;({ DOMParser } = await import('prosemirror-model'))
  ;({ EditorState, TextSelection } = await import('prosemirror-state'))
  ;({ EditorView: View } = await import('prosemirror-view'))
})

const views: EditorView[] = []

afterEach(() => {
  for (const view of views.splice(0)) {
    view.destroy()
  }
  document.body.innerHTML = ''
})

type Frame = HTMLElement & {
  label: string
  placeholder: string
  readOnly: boolean
  run(tool: string, value?: string): boolean
  updateComplete: Promise<unknown>
}

/** A headless frame around a document, served as HTML, and a view drawing it. */
const editor = async (
  html = '<p>Hello world</p>',
  attributes = 'label="Release notes"',
  plugins: (schema: Schema) => Plugin[] = (schema) => editorPlugins(schema),
): Promise<{ document: HTMLElement; frame: Frame; schema: Schema; view: EditorView }> => {
  const frame = (await mount(
    `<helix-headless-editor ${attributes}><div>${html}</div></helix-headless-editor>`,
  )) as Frame
  const document = frame.querySelector('div') as HTMLElement
  const schema = editorSchema()
  const view = new View(
    { mount: document },
    {
      state: EditorState.create({
        doc: DOMParser.fromSchema(schema).parse(document),
        plugins: plugins(schema),
      }),
    },
  )
  views.push(view)
  return { document, frame, schema, view }
}

/** Puts the selection over the document's text, from one offset to another. */
const select = (view: EditorView, from: number, to = from): void => {
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)))
}

describe('connectEditor', () => {
  test('refuses an element that is not an editor frame, saying what to import', async () => {
    const { view } = await editor()
    const element = await mount('<div></div>')
    expect(() => connectEditor(element, view)).toThrow('Import @fusion.dev/helix/editor')
  })

  test('names the document for a screen reader and marks it for the prose rules', async () => {
    const { document, frame, view } = await editor(
      '<p></p>',
      'label="Release notes" placeholder="Write the notes"',
    )
    connectEditor(frame, view)
    expect(document.getAttribute('role')).toBe('textbox')
    expect(document.getAttribute('aria-label')).toBe('Release notes')
    expect(document.getAttribute('aria-multiline')).toBe('true')
    expect(document.getAttribute('aria-placeholder')).toBe('Write the notes')
    expect(document.hasAttribute('data-prose')).toBe(true)
    expect(hasState(frame, 'connected')).toBe(true)
  })

  test('shows the placeholder on an empty document, and not once it has text', async () => {
    const { document, frame, view } = await editor(
      '<p></p>',
      'label="Notes" placeholder="Write the notes"',
    )
    connectEditor(frame, view)
    const empty = document.querySelector('.helix-editor-placeholder')
    expect(empty?.getAttribute('data-placeholder')).toBe('Write the notes')
    view.dispatch(view.state.tr.insertText('A'))
    expect(document.querySelector('.helix-editor-placeholder')).toBeNull()
  })

  test('a read-only frame makes the document read-only', async () => {
    const { document, frame, view } = await editor('<p>Fixed</p>', 'label="Notes" readonly')
    connectEditor(frame, view)
    expect(document.getAttribute('contenteditable')).toBe('false')
    expect(document.getAttribute('aria-readonly')).toBe('true')
    frame.readOnly = false
    await settle(frame)
    expect(document.getAttribute('contenteditable')).toBe('true')
    expect(document.hasAttribute('aria-readonly')).toBe(false)
  })

  test('a tool pressed in the frame runs in the view, and the frame shows what holds', async () => {
    const { frame, view } = await editor()
    connectEditor(frame, view)
    select(view, 1, 6)
    expect(frame.run('bold')).toBe(true)
    const strong = view.state.schema.marks.strong
    expect(strong && view.state.doc.rangeHasMark(1, 6, strong)).toBe(true)
    await settle(frame)
    expect(part(frame, 'bold')?.getAttribute('aria-pressed')).toBe('true')
    expect(part(frame, 'italic')?.getAttribute('aria-pressed')).toBe('false')
  })

  test('the block menu follows the block the caret is in', async () => {
    const { frame, view } = await editor('<h2>Title</h2><p>Body</p>')
    connectEditor(frame, view)
    select(view, 2)
    await settle(frame)
    expect(part(frame, 'block')?.getAttribute('label')).toBe('Text style: Heading 2')
    select(view, 9)
    await settle(frame)
    expect(part(frame, 'block')?.getAttribute('label')).toBe('Text style: Paragraph')
  })

  test('links the selection through the frame, and refuses an address that could run something', async () => {
    const { document, frame, view } = await editor('<p>see docs</p>')
    connectEditor(frame, view)
    select(view, 5, 9)
    expect(frame.run('link', 'fusion.dev')).toBe(true)
    expect(document.querySelector('a')?.getAttribute('href')).toBe('https://fusion.dev')
    expect(frame.run('link', 'javascript:alert(1)')).toBe(false)
    expect(document.querySelector('a')?.getAttribute('href')).toBe('https://fusion.dev')
  })

  test('drops a pasted link to an address that could run something', async () => {
    const { document } = await editor(
      '<p><a href="javascript:alert(1)">bad</a> <a href="/ok">good</a></p>',
    )
    const links = [...document.querySelectorAll('a')]
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/ok'])
  })

  test('the tools follow the schema: one it lacks is left off the toolbar', async () => {
    const { frame, view } = await editor('<p>Plain</p>', 'label="Notes"', (schema) => [
      ...editorPlugins(schema),
    ])
    const { Schema } = await import('prosemirror-model')
    const schema = view.state.schema
    const em = schema.spec.marks.get('em')
    if (!em) {
      throw new Error('The schema has no em mark.')
    }
    const lean = new Schema({
      marks: { em },
      nodes: schema.spec.nodes.remove('code_block').remove('blockquote'),
    })
    const plain = new View(document.createElement('div'), {
      state: EditorState.create({ plugins: editorPlugins(lean), schema: lean }),
    })
    views.push(plain)
    frame.querySelector('div')?.replaceWith(plain.dom)
    connectEditor(frame, plain)
    await settle(frame)
    expect(part(frame, 'italic')).not.toBeNull()
    expect(part(frame, 'bold')).toBeNull()
    expect(part(frame, 'quote')).toBeNull()
    expect(frame.shadowRoot?.querySelector('[part="block-option"][value="code-block"]')).toBeNull()
  })

  test('connects a view whose plugins were chosen without the frame, and takes its plugin off again', async () => {
    const { frame, view } = await editor('<p>Hi</p>', 'label="Notes"', () => [])
    const before = view.state.plugins.length
    const connection = connectEditor(frame, view)
    expect(view.state.plugins.length).toBe(before + 1)
    connection.disconnect()
    expect(view.state.plugins.length).toBe(before)
    expect(hasState(frame, 'connected')).toBe(false)
    expect(view.dom.hasAttribute('role')).toBe(false)
  })

  test('disconnecting a view that had the frame plugin leaves its plugins and unnames it', async () => {
    const { frame, view } = await editor()
    const before = view.state.plugins.length
    const connection = connectEditor(frame, view)
    expect(view.state.plugins.length).toBe(before)
    connection.disconnect()
    expect(view.state.plugins.length).toBe(before)
    expect(view.dom.hasAttribute('aria-label')).toBe(false)
    expect(view.dom.hasAttribute('data-prose')).toBe(true)
  })
})

describe('the document', () => {
  test('every block is given an id, written to its HTML', async () => {
    const { document } = await editor('<h2>Title</h2><p>One</p><ul><li><p>Item</p></li></ul>')
    await Promise.resolve()
    const ids = [...document.querySelectorAll('[data-block-id]')].map((block) =>
      block.getAttribute('data-block-id'),
    )
    expect(ids).toHaveLength(5)
    expect(new Set(ids).size).toBe(5)
    expect(ids.every((id) => /^[a-z0-9]{12}$/.test(id ?? ''))).toBe(true)
  })

  test('an id served with a block is kept', async () => {
    const { document } = await editor('<p data-block-id="kept">One</p><p>Two</p>')
    await Promise.resolve()
    expect(document.querySelector('p')?.getAttribute('data-block-id')).toBe('kept')
  })

  test('each paragraph and heading runs in its own words’ direction', async () => {
    const { document } = await editor(
      '<h2>שלום עולם</h2><p>مرحبا بالعالم</p><p>Hello</p><pre><code>let a = 1</code></pre>',
    )
    const blocks = [...document.children]
    expect(blocks.map((block) => block.getAttribute('dir'))).toEqual([
      'auto',
      'auto',
      'auto',
      'ltr',
    ])
    expect(blocks[0]?.textContent).toBe('שלום עולם')
    expect(blocks[1]?.textContent).toBe('مرحبا بالعالم')
  })

  test('right-to-left text typed into a paragraph is kept as written', async () => {
    const { frame, view } = await editor('<p></p>')
    connectEditor(frame, view)
    view.dispatch(view.state.tr.insertText('مرحبا'))
    view.dispatch(view.state.tr.insertText(' Helix'))
    expect(view.state.doc.textContent).toBe('مرحبا Helix')
    expect(view.dom.querySelector('p')?.getAttribute('dir')).toBe('auto')
  })
})

/* A composition needs the browser's selection and its mutation records in
   the order an input method makes them, which happy-dom does not keep. */
const run = hasLayout() ? test : (): void => {}

describe('a composition', () => {
  run(
    'text an input method composes lands in the document, and the frame rewrites none of its attributes meanwhile',
    async () => {
      const { document, frame, view } = await editor(
        '<p>日本</p>',
        'label="Notes" placeholder="Write"',
      )
      connectEditor(frame, view)
      view.focus()
      select(view, 3)
      const text = document.querySelector('p')?.firstChild as Text
      /* The attributes the frame's plugin writes. ProseMirror sets `class`
         itself as focus and the selection move, which is not the frame. */
      const owned = ['aria-label', 'aria-multiline', 'aria-placeholder', 'data-prose', 'role']
      const written: string[] = []
      const watcher = new MutationObserver((records) => {
        for (const record of records) {
          written.push(record.attributeName ?? '')
        }
      })
      watcher.observe(document, { attributeFilter: owned, attributes: true })
      document.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }))
      text.data = '日本ご'
      document.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          data: 'ご',
          inputType: 'insertCompositionText',
          isComposing: true,
        }),
      )
      text.data = '日本語'
      document.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          data: '語',
          inputType: 'insertCompositionText',
          isComposing: true,
        }),
      )
      expect(frame.run('bold')).toBe(true)
      document.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '語' }))
      await new Promise((resolve) => setTimeout(resolve, 50))
      watcher.disconnect()
      expect(view.state.doc.textContent).toBe('日本語')
      expect(written).toEqual([])
    },
  )
})
