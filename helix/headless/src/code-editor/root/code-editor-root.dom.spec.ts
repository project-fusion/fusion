import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type {
  EditorEngine,
  EditorEngineListeners,
  EditorEngineState,
  HelixHeadlessCodeEditor,
} from './code-editor-root.js'

/* Read once the DOM is registered, as the element reads it. */
let onApple: () => boolean

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  ;({ onApple } = await import('@fusion.dev/helix-core'))
})

const editor = async (attributes = ''): Promise<HelixHeadlessCodeEditor> => {
  const element = (await mount(
    `<helix-headless-code-editor label="Query" ${attributes}></helix-headless-code-editor>`,
  )) as HelixHeadlessCodeEditor
  await element.updateComplete
  return element
}

const type = (control: HTMLTextAreaElement, value: string): void => {
  control.value = value
  control.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
}

/** An engine that draws nothing and remembers what it was told. */
const fakeEngine = () => {
  const told: {
    destroyed: number
    listeners?: EditorEngineListeners
    mounted: EditorEngineState[]
    updates: EditorEngineState[]
  } = {
    destroyed: 0,
    mounted: [],
    updates: [],
  }
  const engine: EditorEngine = {
    mount: (_parent, state, listeners) => {
      told.mounted.push(state)
      told.listeners = listeners
      return {
        destroy: () => {
          told.destroyed += 1
        },
        update: (next) => told.updates.push(next),
      }
    },
  }
  return { engine, told }
}

describe('an editor with no engine', () => {
  test('is a code-face text field: typing sets the value, and a refused change is put back', async () => {
    const element = await editor('value="select 1"')
    const control = part(element, 'control') as HTMLTextAreaElement
    expect(control.getAttribute('spellcheck')).toBe('false')
    let inputs = 0
    element.addEventListener('input', () => {
      inputs += 1
    })
    type(control, 'select 2')
    await element.updateComplete
    expect(element.value).toBe('select 2')
    element.addEventListener('helix-before-change', (event) => event.preventDefault())
    type(control, 'drop table')
    await element.updateComplete
    expect(element.value).toBe('select 2')
    expect(control.value).toBe('select 2')
    expect(inputs).toBe(1)
  })

  test('types two spaces on Tab, and lets Escape then Tab leave', async () => {
    const element = await editor()
    const control = part(element, 'control') as HTMLTextAreaElement
    const tab = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' })
    control.dispatchEvent(tab)
    await element.updateComplete
    expect(tab.defaultPrevented).toBe(true)
    expect(element.value).toBe('  ')
    control.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
    const leave = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' })
    control.dispatchEvent(leave)
    expect(leave.defaultPrevented).toBe(false)
  })

  test('lists its diagnostics by line, in their tone', async () => {
    const element = await editor()
    element.value = 'one\ntwo\nthree'
    element.diagnostics = [
      { from: 4, message: 'Unknown word', to: 7, tone: 'warning' },
      { from: 0, message: 'Missing semicolon', to: 3 },
    ]
    await element.updateComplete
    const items = [...(element.shadowRoot?.querySelectorAll('[part~="diagnostic"]') ?? [])]
    expect(items.map((one) => one.textContent?.trim())).toEqual([
      'Line 2: Unknown word',
      'Line 1: Missing semicolon',
    ])
    expect(items[0]?.getAttribute('part')).toBe('diagnostic diagnostic-warning')
    expect(part(element, 'diagnostics')?.getAttribute('aria-label')).toBe('Problems')
  })

  test('is a form field: required with no text is missing a value', async () => {
    const element = await editor('required name="query"')
    expect((element as unknown as { validity: ValidityState }).validity.valueMissing).toBe(true)
  })
})

describe('an editor with an engine', () => {
  test('hands the engine its state, and its edits go through the request', async () => {
    const element = await editor('value="a" language="ts" line-numbers')
    const { engine, told } = fakeEngine()
    element.engine = engine
    await element.updateComplete
    expect(hasState(element, 'connected')).toBe(true)
    expect(part(element, 'control')?.hasAttribute('hidden')).toBe(true)
    expect(told.mounted[0]).toMatchObject({
      label: 'Query',
      language: 'ts',
      lineNumbers: true,
      value: 'a',
    })
    expect(told.listeners?.change('ab')).toBe(true)
    await element.updateComplete
    expect(element.value).toBe('ab')
    element.addEventListener('helix-before-change', (event) => event.preventDefault())
    expect(told.listeners?.change('abc')).toBe(false)
    expect(element.value).toBe('ab')
  })

  test('tells the engine a value set from outside, and lets it go when the engine is taken away', async () => {
    const element = await editor()
    const { engine, told } = fakeEngine()
    element.engine = engine
    await element.updateComplete
    element.value = 'set from outside'
    await element.updateComplete
    expect(told.updates.at(-1)?.value).toBe('set from outside')
    element.engine = undefined
    await element.updateComplete
    expect(told.destroyed).toBe(1)
    expect(hasState(element, 'connected')).toBe(false)
    expect(part(element, 'control')?.hasAttribute('hidden')).toBe(false)
  })

  test('hands back nothing the engine already holds, and nothing a caret move changed', async () => {
    const element = await editor('value="a"')
    const { engine, told } = fakeEngine()
    element.engine = engine
    await element.updateComplete
    told.listeners?.change('ab')
    await element.updateComplete
    told.listeners?.caret?.(1, 1)
    await element.updateComplete
    expect(told.updates).toEqual([])
    element.language = 'json'
    await element.updateComplete
    expect(told.updates.at(-1)).toMatchObject({ language: 'json', value: 'ab' })
  })

  test('mounts the engine again when it is moved in the page', async () => {
    const element = await editor()
    const { engine, told } = fakeEngine()
    element.engine = engine
    await element.updateComplete
    const holder = document.createElement('div')
    document.body.append(holder)
    holder.append(element)
    await element.updateComplete
    expect(told.destroyed).toBe(1)
    expect(told.mounted).toHaveLength(2)
    expect(hasState(element, 'connected')).toBe(true)
    holder.remove()
  })

  test('says change as focus leaves the engine after an edit', async () => {
    const element = await editor()
    const { engine, told } = fakeEngine()
    element.engine = engine
    await element.updateComplete
    let changes = 0
    element.addEventListener('change', () => (changes += 1))
    const view = part(element, 'view') as HTMLElement
    view.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }))
    expect(changes).toBe(0)
    told.listeners?.change('edited')
    view.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }))
    view.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true }))
    expect(changes).toBe(1)
  })
})

describe('diagnosticLines', () => {
  test('finds each diagnostic’s line, counted from 1', async () => {
    const { diagnosticLines } = await import('./code-editor-root.js')
    expect(
      diagnosticLines('one\ntwo\n\nfour', [
        { from: 0, message: 'a', to: 1 },
        { from: 4, message: 'b', to: 5 },
        { from: 3, message: 'c', to: 4 },
        { from: 9, message: 'd', to: 10 },
      ]),
    ).toEqual([1, 2, 1, 4])
  })
})

describe('the status line and the problems', () => {
  test('says where the caret is and how many problems there are', async () => {
    const element = await editor()
    element.value = 'one\ntwo'
    element.diagnostics = [{ from: 0, message: 'Missing semicolon', to: 3 }]
    await element.updateComplete
    expect(part(element, 'position')?.textContent).toBe('Line 1, column 1')
    expect(part(element, 'problem-count')?.textContent).toBe('1 problem')
    element.diagnostics = []
    await element.updateComplete
    expect(part(element, 'problem-count')?.textContent).toBe('No problems')
  })

  test('a press on a problem selects it in the code, and the status line follows', async () => {
    const element = await editor()
    element.value = 'one\ntwo'
    element.diagnostics = [{ from: 4, message: 'Unknown word', to: 7 }]
    await element.updateComplete
    ;(part(element, 'diagnostic') as HTMLButtonElement).click()
    await element.updateComplete
    const control = part(element, 'control') as HTMLTextAreaElement
    expect([control.selectionStart, control.selectionEnd]).toEqual([4, 7])
    expect(part(element, 'position')?.textContent).toBe('Line 2, column 1')
  })

  test('names the language in the header as a reader knows it', async () => {
    const element = await editor('language="ts"')
    expect(part(element, 'language')?.textContent).toBe('TypeScript')
  })
})

describe('the find bar, on the plain field', () => {
  const findIn = async (value: string): Promise<HelixHeadlessCodeEditor> => {
    const element = await editor()
    element.value = value
    await element.updateComplete
    part(element, 'control')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        ctrlKey: !onApple(),
        key: 'f',
        metaKey: onApple(),
      }),
    )
    await element.updateComplete
    return element
  }

  const type = async (element: HelixHeadlessCodeEditor, name: string, text: string) => {
    const field = part(element, name) as HTMLInputElement
    field.value = text
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    await element.updateComplete
  }

  test('opens on the find key, finds as it is typed, and counts the matches', async () => {
    const element = await findIn('total = sum + total')
    expect(part(element, 'find-bar')?.hasAttribute('hidden')).toBe(false)
    await type(element, 'find-field', 'total')
    expect(part(element, 'find-count')?.textContent).toBe('1 of 2 matches')
    const control = part(element, 'control') as HTMLTextAreaElement
    expect([control.selectionStart, control.selectionEnd]).toEqual([0, 5])
    ;(part(element, 'find-next') as HTMLElement).click()
    await element.updateComplete
    expect(part(element, 'find-count')?.textContent).toBe('2 of 2 matches')
  })

  test('says so where a regular expression cannot be read', async () => {
    const element = await findIn('a')
    ;(part(element, 'find-regex') as HTMLElement).click()
    await type(element, 'find-field', '(')
    expect(part(element, 'find-count')?.textContent).toBe('Not a valid regular expression')
  })

  test('replaces every match through the value, once the replace field shows', async () => {
    const element = await findIn('total = sum + total')
    expect(part(element, 'replace-field')).toBeNull()
    ;(part(element, 'find-replace') as HTMLElement).click()
    await element.updateComplete
    await type(element, 'find-field', 'total')
    await type(element, 'replace-field', 'amount')
    ;(part(element, 'replace-all') as HTMLElement).click()
    await element.updateComplete
    expect(element.value).toBe('amount = sum + amount')
  })

  test('closes on Escape', async () => {
    const element = await findIn('a')
    part(element, 'find-field')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'Escape',
      }),
    )
    await element.updateComplete
    expect(part(element, 'find-bar')?.hasAttribute('hidden')).toBe(true)
  })
})
