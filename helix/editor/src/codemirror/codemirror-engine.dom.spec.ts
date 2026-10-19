import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { diagnosticCount } from '@codemirror/lint'
import { EditorView } from '@codemirror/view'
import type { HelixHeadlessCodeEditor } from '@fusion.dev/helix-headless/code-editor'
import { mount, part, registerDom } from '@fusion.dev/helix-testing/dom'

let connectEditor: typeof import('./codemirror-engine.js').connectEditor

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/code-editor')
  ;({ connectEditor } = await import('./codemirror-engine.js'))
})

/** An editor with CodeMirror connected, and the view CodeMirror drew. */
const connected = async (
  attributes = 'value="let a = 1"',
): Promise<{ element: HelixHeadlessCodeEditor; view: EditorView }> => {
  const element = (await mount(
    `<helix-headless-code-editor label="Code" ${attributes}></helix-headless-code-editor>`,
  )) as HelixHeadlessCodeEditor
  connectEditor(element)
  await element.updateComplete
  const drawn = part(element, 'view')?.querySelector('.cm-editor') as HTMLElement
  const view = EditorView.findFromDOM(drawn) as EditorView
  return { element, view }
}

describe('CodeMirror in an editor', () => {
  test('draws the value in the view, named by the editor’s label', async () => {
    const { element, view } = await connected()
    expect(view.state.doc.toString()).toBe('let a = 1')
    expect(view.contentDOM.getAttribute('aria-label')).toBe('Code')
    expect(part(element, 'control')?.hasAttribute('hidden')).toBe(true)
  })

  test('sends an edit through the editor, and drops one the page refuses', async () => {
    const { element, view } = await connected()
    view.dispatch({ changes: { from: 9, insert: '0' } })
    await element.updateComplete
    expect(element.value).toBe('let a = 10')
    element.addEventListener('helix-before-change', (event) => event.preventDefault())
    view.dispatch({ changes: { from: 0, insert: '// ' } })
    expect(view.state.doc.toString()).toBe('let a = 10')
    expect(element.value).toBe('let a = 10')
  })

  test('takes a value set from outside, and marks the diagnostics it is given', async () => {
    const { element, view } = await connected()
    element.value = 'const b = 2'
    element.diagnostics = [{ from: 6, message: 'Unused', to: 7, tone: 'warning' }]
    await element.updateComplete
    expect(view.state.doc.toString()).toBe('const b = 2')
    expect(diagnosticCount(view.state)).toBe(1)
  })
})
