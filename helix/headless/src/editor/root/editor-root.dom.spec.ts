import { beforeAll, describe, expect, test } from 'bun:test'
import { hasState, mount, part, registerDom } from '@fusion.dev/helix-testing/dom'
import type {
  EditorEngine,
  EditorEngineListeners,
  EditorEngineState,
  HelixHeadlessEditor,
} from './editor-root.js'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

const editor = async (attributes = ''): Promise<HelixHeadlessEditor> => {
  const element = (await mount(
    `<helix-headless-editor label="Query" ${attributes}></helix-headless-editor>`,
  )) as HelixHeadlessEditor
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
    expect(items.map((one) => one.textContent)).toEqual([
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
})
