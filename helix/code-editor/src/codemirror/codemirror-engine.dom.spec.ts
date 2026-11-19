import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { foldedRanges } from '@codemirror/language'
import { diagnosticCount } from '@codemirror/lint'
import { EditorView } from '@codemirror/view'
import type { HelixHeadlessCodeEditor } from '@fusion.dev/helix-headless/code-editor'
import { hasLayout, mount, nextFrame, part, registerDom } from '@fusion.dev/helix-testing/dom'

let changeBetween: typeof import('./codemirror-engine.js').changeBetween
let connectCodeEditor: typeof import('./codemirror-engine.js').connectCodeEditor

beforeAll(async () => {
  registerDom()
  await import('@fusion.dev/helix-headless/code-editor')
  ;({ changeBetween, connectCodeEditor } = await import('./codemirror-engine.js'))
})

/** An editor with CodeMirror connected, and the view CodeMirror drew. */
const connected = async (
  attributes = 'value="let a = 1"',
): Promise<{ element: HelixHeadlessCodeEditor; view: EditorView }> => {
  const element = (await mount(
    `<helix-headless-code-editor label="Code" ${attributes}></helix-headless-code-editor>`,
  )) as HelixHeadlessCodeEditor
  connectCodeEditor(element)
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

/** The lines drawn lit, by their text. */
const lit = (view: EditorView): string[] =>
  [...view.contentDOM.querySelectorAll('.cm-helix-changed, .cm-helix-changed-again')].map(
    (line) => line.textContent ?? '',
  )

const FILE = ['const a = 1', 'const b = 2', 'const c = 3', 'const d = 4'].join('\n')

/** An editor holding `FILE`, its value set as a property, since an attribute keeps no line break. */
const holding = async (
  attributes = 'flash-changes',
): Promise<{ element: HelixHeadlessCodeEditor; view: EditorView }> => {
  const editor = await connected(attributes)
  editor.element.value = FILE
  await editor.element.updateComplete
  return editor
}

describe('flash-changes in CodeMirror', () => {
  test('replaces only what changed between two values, a span for each run of lines', () => {
    expect(changeBetween('let a = 1', 'let a = 10')).toEqual([{ from: 9, insert: '0', to: 9 }])
    expect(changeBetween('abc', 'axc')).toEqual([{ from: 1, insert: 'x', to: 2 }])
    expect(changeBetween('a\nb\nc\nd', 'a\nB\nc\nd\ne')).toEqual([
      { from: 2, insert: 'B', to: 3 },
      { from: 7, insert: '\ne', to: 7 },
    ])
    expect(changeBetween('a\nb\nc', 'a\nc')).toEqual([{ from: 2, insert: '', to: 4 }])
    expect(changeBetween('same', 'same')).toEqual([])
  })

  test('lights the lines a new value changed, and keeps the caret where it was', async () => {
    const { element, view } = await holding()
    expect(lit(view)).toEqual([])
    view.dispatch({ selection: { anchor: 3 } })
    element.value = FILE.replace('b = 2', 'b = 20').replace('d = 4', 'd = 4\nconst e = 5')
    await element.updateComplete
    expect(lit(view)).toEqual(['const b = 20', 'const e = 5'])
    expect(view.state.selection.main.head).toBe(3)
  })

  test('lights nothing a reader types, a value that changes every line, or an editor without it', async () => {
    const typed = await holding()
    typed.view.dispatch({ changes: { from: 0, insert: 'x' }, userEvent: 'input.type' })
    await typed.element.updateComplete
    typed.element.value = 'one\ntwo'
    await typed.element.updateComplete
    const off = await holding('')
    off.element.value = FILE.replace('b = 2', 'b = 20')
    await off.element.updateComplete
    expect(lit(typed.view)).toEqual([])
    expect(lit(off.view)).toEqual([])
  })

  test('lights the line a word went from, and none for a line taken out', async () => {
    const { element, view } = await holding()
    element.value = FILE.replace('const b = 2\n', '').replace('c = 3', 'c')
    await element.updateComplete
    expect(lit(view)).toEqual(['const c'])
  })

  test('lights an edit dispatched with no user event, such as an agent’s', async () => {
    const { view } = await holding()
    view.dispatch({ changes: { from: view.state.doc.line(3).to, insert: ' // checked' } })
    expect(lit(view)).toEqual(['const c = 3 // checked'])
  })

  test('a line lit again takes the other class, and the marks come off once the wash is gone', async () => {
    const { element, view } = await holding()
    element.value = FILE.replace('a = 1', 'a = 10')
    await element.updateComplete
    element.value = FILE.replace('a = 1', 'a = 100')
    await element.updateComplete
    expect(view.contentDOM.querySelector('.cm-helix-changed-again')?.textContent).toBe(
      'const a = 100',
    )
    await new Promise((resolve) => setTimeout(resolve, 1100))
    expect(lit(view)).toEqual([])
  })
})

/* The geometry is a browser's, and happy-dom lays nothing out. */
const browser = hasLayout() ? test : (): void => {}

/** The lines CodeMirror drew, in order. */
const linesOf = (view: EditorView): HTMLElement[] => [
  ...view.contentDOM.querySelectorAll<HTMLElement>(':scope > .cm-line'),
]

/** The number each drawn line carries. */
const numbersOf = (view: EditorView): Array<string | undefined> =>
  linesOf(view).map((line) => line.dataset.line)

const SOURCE = 'interface Order {\n  amount: number\n  paid: boolean\n}'

/** An editor holding `SOURCE`, its value set as a property, as `holding` sets one. */
const numbered = async (
  attributes = 'line-numbers',
): Promise<{ element: HelixHeadlessCodeEditor; view: EditorView }> => {
  const editor = await connected(attributes)
  editor.element.value = SOURCE
  await editor.element.updateComplete
  return editor
}

describe('the line numbers', () => {
  test('are written on the lines they number, one to a line, in no gutter', async () => {
    const { element, view } = await numbered()
    expect(numbersOf(view)).toEqual(['1', '2', '3', '4'])
    expect(part(element, 'view')?.querySelector('.cm-gutters')).toBeNull()
  })

  test('follow a line the reader adds', async () => {
    const { element, view } = await connected('line-numbers value="let a = 1"')
    view.dispatch({ changes: { from: view.state.doc.length, insert: '\nlet b = 2' } })
    await element.updateComplete
    expect(numbersOf(view)).toEqual(['1', '2'])
  })

  test('are drawn only while line-numbers is set', async () => {
    const { element, view } = await numbered('')
    expect(numbersOf(view)).toEqual([undefined, undefined, undefined, undefined])
    element.lineNumbers = true
    await element.updateComplete
    expect(numbersOf(view)).toEqual(['1', '2', '3', '4'])
  })

  test('mark the line of a problem in its tone', async () => {
    const { element, view } = await numbered()
    element.diagnostics = [{ from: 20, message: 'Unused', to: 26, tone: 'warning' }]
    await element.updateComplete
    expect(
      linesOf(view).map((line) => line.classList.contains('cm-helix-problem-warning')),
    ).toEqual([false, true, false, false])
  })

  /* A face that loads after the editor drew changes its lines' size and
     leading, and CodeMirror measures nothing until a frame after. The change
     is made here by hand, so it lands between two frames, where CodeMirror's
     gutter kept the heights measured before it: on the Button page at 390 the
     Sandbox's numbers stood higher than their lines and closer together. Read
     before any frame, each number's box has to cover its own line's first and
     last rows and no other line's, wrapped or not. A box drawn by a pseudo
     element is hit as the line that draws it, once it takes the pointer. */
  for (const wrap of [false, true]) {
    browser(
      `stand at the top of their lines when the face changes between two frames${wrap ? ', wrapped' : ''}`,
      async () => {
        const { element, view } = await numbered(wrap ? 'line-numbers wrap' : 'line-numbers')
        await nextFrame()
        const hit = document.createElement('style')
        hit.textContent = '.cm-line[data-line]::before { pointer-events: auto !important; }'
        element.shadowRoot?.append(hit)
        element.style.fontFamily = 'serif'
        element.style.fontSize = '23px'
        element.style.setProperty('--helix-leading-normal', '2')
        const start = view.scrollDOM.getBoundingClientRect().left + 2
        const lines = linesOf(view)
        expect(lines.map((line) => line.dataset.line)).toEqual(['1', '2', '3', '4'])
        for (const line of lines) {
          const { bottom, top } = line.getBoundingClientRect()
          const number = getComputedStyle(line, '::before')
          expect(number.fontSize).toBe('23px')
          expect(number.lineHeight).toBe(getComputedStyle(line).lineHeight)
          expect(element.shadowRoot?.elementFromPoint(start, top + 1)).toBe(line)
          expect(element.shadowRoot?.elementFromPoint(start, bottom - 1)).toBe(line)
        }
      },
    )
  }

  browser('fold and unfold a line when its marker is pressed', async () => {
    const { element, view } = await numbered('line-numbers language="ts"')
    const first = (): HTMLElement | undefined => linesOf(view)[0]
    for (let frame = 0; frame < 60 && !first()?.classList.contains('cm-helix-foldable'); frame++) {
      await nextFrame()
    }
    const press = (): void => {
      const line = first() as HTMLElement
      const marker = parseFloat(getComputedStyle(line, '::after').width)
      const { left, top } = line.getBoundingClientRect()
      line.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          button: 0,
          cancelable: true,
          clientX: left - marker / 2,
          clientY: top + 2,
        }),
      )
    }
    press()
    await element.updateComplete
    expect(foldedRanges(view.state).size).toBe(1)
    expect(numbersOf(view)).toEqual(['1'])
    expect(first()?.classList.contains('cm-helix-folded')).toBe(true)
    press()
    expect(foldedRanges(view.state).size).toBe(0)
    expect(numbersOf(view)).toEqual(['1', '2', '3', '4'])
  })
})
