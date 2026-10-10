import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { hasState, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'
import type { Highlighter } from '@lezer/highlight'

/* Imported once the DOM is registered: CodeMirror and core read the globals
   they find as they are evaluated. */
let syntaxHighlighter: Highlighter
let tags: typeof import('@lezer/highlight').tags
let forceParsing: typeof import('@codemirror/language').forceParsing
let EditorView: typeof import('@codemirror/view').EditorView

beforeAll(async () => {
  registerDom()
  ;({ syntaxHighlighter } = await import('../../highlight/syntax.js'))
  ;({ tags } = await import('@lezer/highlight'))
  ;({ forceParsing } = await import('@codemirror/language'))
  ;({ EditorView } = await import('@codemirror/view'))
  await import('./editor-root.js')
})

afterEach(() => {
  document.body.innerHTML = ''
})

type Editor = Updatable & {
  language: string
  modified: boolean
  reset(): void
  value: string
}

/** An editor holding `value`, in `language`, with its source parsed to the end. */
const editor = async (language: string, value: string): Promise<Editor> => {
  const host = document.createElement('helix-sandbox-editor') as Editor
  host.language = language
  host.value = value
  document.body.append(host)
  await settle(host)
  const view = viewOf(host)
  forceParsing(view, view.state.doc.length, 5000)
  return host
}

const viewOf = (host: Editor): InstanceType<typeof EditorView> => {
  const mount = host.shadowRoot?.querySelector<HTMLElement>('.cm-editor')
  const view = mount ? EditorView.findFromDOM(mount) : null
  if (!view) {
    throw new Error('helix-sandbox-editor mounted no CodeMirror view')
  }
  return view
}

/** The text of every token the editor drew as a keyword. */
const keywords = (host: Editor): string[] => {
  const name = syntaxHighlighter.style([tags.keyword]) ?? ''
  return [...(host.shadowRoot?.querySelectorAll(`.cm-content .${name}`) ?? [])].map(
    (span) => span.textContent ?? '',
  )
}

/** Types `text` at the end of the source, as a reader's keystroke does. */
const type = (host: Editor, text: string): void => {
  const view = viewOf(host)
  view.dispatch({ changes: { from: view.state.doc.length, insert: text }, userEvent: 'input' })
}

/** The edit events the editor sends while `work` runs, in order, with their source. */
const heard = async (host: Editor, work: () => void | Promise<void>): Promise<string[]> => {
  const events: string[] = []
  for (const name of ['helix-before-edit', 'helix-edit']) {
    host.addEventListener(name, (event) => {
      events.push(`${name}:${(event as CustomEvent<{ value: string }>).detail.value}`)
    })
  }
  await work()
  await settle(host)
  return events
}

describe('the languages an editor reads', () => {
  /* `js` is the sandbox's own pane name, and it threw a TypeError and drew
     nothing: the editor knew `javascript` and nothing a pane is called. */
  test('are the names a sandbox pane carries', async () => {
    expect(keywords(await editor('js', 'const a = 1'))).toContain('const')
    expect(keywords(await editor('mjs', 'export const a = 1'))).toContain('export')
    expect(keywords(await editor('ts', 'type A = string'))).toContain('type')
    expect(keywords(await editor('jsx', 'const a = <b />'))).toContain('const')
    expect(keywords(await editor('tsx', 'const a: A = <b />'))).toContain('const')
    expect(keywords(await editor('sh', 'bun add @fusion.dev/helix'))).toContain('bun')
    expect(keywords(await editor('javascript', 'let a = 1'))).toContain('let')
  })

  test('draw a name the editor does not read plain, and say so once', async () => {
    const warnings: string[] = []
    const original = console.warn
    console.warn = (message: string) => warnings.push(message)
    let host: Editor
    try {
      host = await editor('cobol', 'MOVE A TO B')
      host.value = 'MOVE B TO A'
      await settle(host)
    } finally {
      console.warn = original
    }
    expect(host.shadowRoot?.querySelector('.cm-content')?.textContent).toBe('MOVE B TO A')
    expect(warnings.length).toBe(1)
    expect(warnings[0]).toContain('language="cobol"')
  })
})

describe('an edit', () => {
  test('is helix-before-edit, then helix-edit with the new source', async () => {
    const host = await editor('html', '<p>')
    expect(await heard(host, () => type(host, 'a'))).toEqual([
      'helix-before-edit:<p>a',
      'helix-edit:<p>a',
    ])
    expect(host.value).toBe('<p>a')
  })

  test('refused, sends no helix-edit and leaves the source', async () => {
    const host = await editor('html', '<p>')
    host.addEventListener('helix-before-edit', (event) => event.preventDefault())
    expect(await heard(host, () => type(host, 'a'))).toEqual(['helix-before-edit:<p>a'])
    expect(viewOf(host).state.doc.toString()).toBe('<p>')
    expect(host.value).toBe('<p>')
  })

  /* A refusal of the source a page sets would leave `value` and the text
     disagreeing, so a `value` from outside is the source given. */
  test('is never a `value` set from outside', async () => {
    const host = await editor('html', '<p>')
    host.addEventListener('helix-before-edit', (event) => event.preventDefault())
    expect(
      await heard(host, () => {
        host.value = '<b>'
      }),
    ).toEqual([])
    expect(viewOf(host).state.doc.toString()).toBe('<b>')
  })
})

describe('the source given', () => {
  test('is `:state(modified)` once edited, and `reset()` puts it back as an edit', async () => {
    const host = await editor('html', '<p>')
    expect(host.modified).toBe(false)
    type(host, 'a')
    await settle(host)
    expect(host.modified).toBe(true)
    expect(hasState(host, 'modified')).toBe(true)
    expect(await heard(host, () => host.reset())).toEqual([
      'helix-before-edit:<p>',
      'helix-edit:<p>',
    ])
    expect(viewOf(host).state.doc.toString()).toBe('<p>')
    expect(host.modified).toBe(false)
    expect(hasState(host, 'modified')).toBe(false)
  })

  test('is the last `value` set from outside', async () => {
    const host = await editor('html', '<p>')
    type(host, 'a')
    await settle(host)
    host.value = '<b>'
    await settle(host)
    expect(host.modified).toBe(false)
    expect(hasState(host, 'modified')).toBe(false)
  })
})
