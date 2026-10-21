import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, settle } from '@fusion.dev/helix-testing/dom'
import type { EditorView } from 'prosemirror-view'
import type { EditorFindQuery } from './find.js'

/* Imported after the DOM is registered: ProseMirror's view reads the DOM it
   finds as it loads. */
let find: typeof import('./find.js')
let connectEditor: typeof import('../index.js').connectEditor
let editorPlugins: typeof import('../index.js').editorPlugins
let editorSchema: typeof import('../index.js').editorSchema
let DOMParser: typeof import('prosemirror-model').DOMParser
let EditorState: typeof import('prosemirror-state').EditorState
let View: typeof import('prosemirror-view').EditorView
let undo: typeof import('prosemirror-history').undo

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/editor')
  find = await import('./find.js')
  ;({ connectEditor, editorPlugins, editorSchema } = await import('../index.js'))
  ;({ DOMParser } = await import('prosemirror-model'))
  ;({ EditorState } = await import('prosemirror-state'))
  ;({ EditorView: View } = await import('prosemirror-view'))
  ;({ undo } = await import('prosemirror-history'))
})

const views: EditorView[] = []

afterEach(() => {
  for (const view of views.splice(0)) {
    view.destroy()
  }
  document.body.innerHTML = ''
})

const query = (search: string, options: Partial<EditorFindQuery> = {}): EditorFindQuery => ({
  caseSensitive: false,
  regex: false,
  replace: '',
  search,
  wholeWord: false,
  ...options,
})

/** A view drawing `html`, with Helix's plugins. */
const viewOf = (html: string, element: HTMLElement = document.createElement('div')): EditorView => {
  element.innerHTML = html
  if (!element.isConnected) {
    document.body.append(element)
  }
  const schema = editorSchema()
  const view = new View(
    { mount: element },
    {
      state: EditorState.create({
        doc: DOMParser.fromSchema(schema).parse(element),
        plugins: editorPlugins(schema),
      }),
    },
  )
  views.push(view)
  return view
}

/** The text of each match the find plugin holds. */
const marked = (view: EditorView): string[] =>
  [...view.dom.querySelectorAll('.helix-find-match, .helix-find-current')].map(
    (element) => element.textContent ?? '',
  )

describe('matches in a document', () => {
  test('across marks inside one block, in any case', () => {
    const view = viewOf('<p>One To<strong>ken</strong> and a token</p>')
    const matches = find.matchesIn(view.state.doc, query('token'))
    expect(matches.map(({ from, to }) => view.state.doc.textBetween(from, to))).toEqual([
      'Token',
      'token',
    ])
  })

  test('never from one block into the next, nor across a line break', () => {
    const view = viewOf('<p>the end</p><p>less said</p><p>one<br>two</p>')
    expect(find.matchesIn(view.state.doc, query('endless'))).toEqual([])
    expect(find.matchesIn(view.state.doc, query('onetwo'))).toEqual([])
    expect(find.matchesIn(view.state.doc, query('end', { wholeWord: true }))).toHaveLength(1)
  })

  test('nothing for an empty search or a regular expression that cannot be read', () => {
    const view = viewOf('<p>text</p>')
    expect(find.matchesIn(view.state.doc, query(''))).toEqual([])
    expect(find.matchesIn(view.state.doc, query('(', { regex: true }))).toEqual([])
  })
})

describe('finding in a view', () => {
  test('marks every match, selects one, and moves around the ends either way', () => {
    const view = viewOf('<p>cat cart care</p>')
    expect(find.findIn(view, query('ca'), 'first')).toEqual({ count: 3, index: 0 })
    expect(view.state.doc.textBetween(view.state.selection.from, view.state.selection.to)).toBe(
      'ca',
    )
    expect(marked(view)).toEqual(['ca', 'ca', 'ca'])
    expect(view.dom.querySelectorAll('.helix-find-current')).toHaveLength(1)
    expect(find.findIn(view, query('ca'), 'next')).toEqual({ count: 3, index: 1 })
    expect(find.findIn(view, query('ca'), 'previous')).toEqual({ count: 3, index: 0 })
    expect(find.findIn(view, query('ca'), 'previous')).toEqual({ count: 3, index: 2 })
    expect(find.findIn(view, query('ca'), 'next')).toEqual({ count: 3, index: 0 })
  })

  test('stays on the selected match while the reader types, where it still matches', () => {
    const view = viewOf('<p>cat cart care</p>')
    find.findIn(view, query('ca'), 'first')
    find.findIn(view, query('ca'), 'next')
    expect(find.findIn(view, query('car'), 'first')).toEqual({ count: 2, index: 0 })
    expect(find.findIn(view, query('care'), 'first')).toEqual({ count: 1, index: 0 })
  })

  test('finds again when the document changes under the search, and takes the marks away at the end', () => {
    const view = viewOf('<p>error</p>')
    find.findIn(view, query('error'), 'first')
    view.dispatch(view.state.tr.insertText(' and another error', view.state.doc.content.size - 1))
    expect(find.findResultOf(view.state)).toEqual({ count: 2, index: 0 })
    find.endFind(view)
    expect(find.findResultOf(view.state)).toBeUndefined()
    expect(marked(view)).toEqual([])
  })

  test('replaces the selected match, then every match, each as one step to undo', () => {
    const view = viewOf('<p>total = sum + total + total</p>')
    find.findIn(view, query('total', { replace: 'amount' }), 'first')
    expect(find.replaceIn(view, query('total', { replace: 'amount' }), false)).toEqual({
      count: 2,
      index: 0,
    })
    expect(view.state.doc.textContent).toBe('amount = sum + total + total')
    find.replaceIn(view, query('total', { replace: 'amount' }), true)
    expect(view.state.doc.textContent).toBe('amount = sum + amount + amount')
    undo(view.state, view.dispatch)
    expect(view.state.doc.textContent).toBe('amount = sum + total + total')
  })

  test('replaces with a regular expression`s groups', () => {
    const view = viewOf('<p>v1 v2</p>')
    find.replaceIn(view, query('v(\\d)', { regex: true, replace: 'version $1' }), true)
    expect(view.state.doc.textContent).toBe('version 1 version 2')
  })
})

describe('the frame`s find bar, through connectEditor', () => {
  type Frame = HTMLElement & { updateComplete: Promise<unknown> }
  type Bar = HTMLElement & {
    attach: unknown
    open: boolean
    query: string
    show(): Promise<void>
    updateComplete: Promise<unknown>
  }

  const searched = async (frame: Frame, bar: Bar): Promise<void> => {
    await settle(frame)
    await settle(bar)
    await Promise.resolve()
    await settle(bar)
  }

  test('searches the document, and says the count again when the document changes', async () => {
    const frame = (await mount(
      '<helix-headless-editor label="Notes"><div><p>error</p></div></helix-headless-editor>',
    )) as Frame
    const view = viewOf('<p>error</p>', frame.querySelector('div') as HTMLElement)
    connectEditor(frame, view)
    await settle(frame)
    const bar = part(frame, 'find') as Bar
    await bar.show()
    const field = part(bar, 'field') as HTMLInputElement
    field.value = 'error'
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await searched(frame, bar)
    expect(part(bar, 'count')?.textContent).toBe('1 of 1 match')
    view.dispatch(view.state.tr.insertText(' error', view.state.doc.content.size - 1))
    await searched(frame, bar)
    expect(part(bar, 'count')?.textContent).toBe('1 of 2 matches')
    expect(part(bar, 'replace-toggle')).not.toBeNull()
  })
})
