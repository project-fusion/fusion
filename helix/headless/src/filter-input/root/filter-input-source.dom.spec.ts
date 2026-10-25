import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import {
  internalsOf,
  part,
  registerDom,
  settle,
  type Updatable,
} from '@fusion.dev/helix-testing/dom'
import type { FilterSource, FilterSourceRequest, FilterSuggestion } from '../suggest.js'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  // The suggestions a source gives are drawn as options, which have to upgrade.
  await import('../../option/index.js')
})

/**
 * Suggestions from `source`. Combobox and Listbox wait out `filter-delay`
 * before a server is asked, and WA's combobox takes a data source; a filter
 * field had neither, so every page wired its own request on `input`.
 */

type Field = Updatable &
  HTMLElement & { filterDelay: number; source?: FilterSource | undefined; value: string }

const control = (host: Field): HTMLInputElement => part(host, 'control') as HTMLInputElement

const mount = async (inner = '', attributes = ''): Promise<Field> => {
  document.body.innerHTML = `<helix-headless-filter-input label="Filter rows" ${attributes}>${inner}</helix-headless-filter-input>`
  const host = document.body.firstElementChild as Field
  await settle(host)
  return host
}

const enter = async (host: Field): Promise<void> => {
  control(host).focus()
  control(host).dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
  await settle(host)
}

const type = async (host: Field, text: string): Promise<void> => {
  const field = control(host)
  field.value = text
  field.setSelectionRange(text.length, text.length)
  field.dispatchEvent(
    new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
  )
  await settle(host)
}

const press = async (host: Field, key: string): Promise<void> => {
  control(host).dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, key }),
  )
  await settle(host)
}

/** The options the field drew, by their words. */
const shown = (host: Field): string[] =>
  [...host.querySelectorAll('helix-headless-option')].map((option) => option.textContent ?? '')

const live = (host: Field): string => part(host, 'live')?.textContent ?? ''

const states = (host: Field): Set<string> => internalsOf(host).states as unknown as Set<string>

const wait = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms))

/** A source that answers at once from a list, and records what it was asked. */
const listed = (
  answer: (request: FilterSourceRequest) => readonly FilterSuggestion[],
): { asked: FilterSourceRequest[]; source: FilterSource } => {
  const asked: FilterSourceRequest[] = []
  return {
    asked,
    source: (request) => {
      asked.push(request)
      return answer(request)
    },
  }
}

describe('a filter field with a source', () => {
  test('asks it on focus and draws what it gives as options in the panel', async () => {
    const host = await mount()
    const { asked, source } = listed(() => ['status:', 'owner:'])
    host.source = source
    await settle(host)
    await enter(host)
    expect(asked.map(({ field, term, text }) => ({ field, term, text }))).toEqual([
      { field: '', term: '', text: '' },
    ])
    expect(shown(host)).toEqual(['status:', 'owner:'])
    expect(control(host).getAttribute('role')).toBe('combobox')
    expect((part(host, 'surface') as HTMLElement).hidden).toBe(false)
    expect(live(host)).toBe('2 suggestions')
  })

  test('asks for the term at the caret and the field it is a value of', async () => {
    const host = await mount()
    const { asked, source } = listed(({ term }) =>
      ['open', 'closed'].filter((value) => value.startsWith(term)),
    )
    host.source = source
    await enter(host)
    await type(host, 'refund -status:op')
    expect(asked.at(-1)).toMatchObject({ field: 'status', term: 'op', text: 'refund -status:op' })
    expect(shown(host)).toEqual(['open'])
  })

  test('takes a value with its own words, and a disabled one', async () => {
    const host = await mount()
    host.source = () => [
      { label: 'Open', value: 'open' },
      { disabled: true, label: 'Archived', value: 'archived' },
    ]
    await enter(host)
    const options = [...host.querySelectorAll('helix-headless-option')] as (HTMLElement & {
      disabled: boolean
      value: string
    })[]
    expect(options.map((option) => [option.value, option.textContent, option.disabled])).toEqual([
      ['open', 'Open', false],
      ['archived', 'Archived', true],
    ])
  })

  test('waits out filter-delay, and asks once for the word', async () => {
    const host = await mount('', 'filter-delay="40"')
    const { asked, source } = listed(() => ['open'])
    host.source = source
    await enter(host)
    asked.length = 0
    await type(host, 's')
    await type(host, 'st')
    await type(host, 'sta')
    expect(asked).toHaveLength(0)
    await wait(60)
    await settle(host)
    expect(asked.map((request) => request.text)).toEqual(['sta'])
  })

  test('asks at once on an arrow key, without waiting out the delay', async () => {
    const host = await mount('', 'filter-delay="1000"')
    const { asked, source } = listed(() => ['open'])
    host.source = source
    await enter(host)
    asked.length = 0
    await type(host, 'op')
    await press(host, 'ArrowDown')
    expect(asked.map((request) => request.text)).toEqual(['op'])
  })

  test('aborts a request a later keystroke replaces, and drops its late answer', async () => {
    const host = await mount()
    const answers: ((value: readonly FilterSuggestion[]) => void)[] = []
    const signals: AbortSignal[] = []
    host.source = ({ signal }) => {
      signals.push(signal)
      return new Promise((resolve) => answers.push(resolve))
    }
    await enter(host)
    await type(host, 'o')
    await type(host, 'op')
    expect(signals.map((signal) => signal.aborted)).toEqual([true, true, false])
    answers[2]?.(['open'])
    await settle(host)
    answers[1]?.(['stale'])
    await settle(host)
    expect(shown(host)).toEqual(['open'])
  })

  test('shows and says it is loading while a request is out, then the count', async () => {
    const host = await mount()
    let answer: (value: readonly FilterSuggestion[]) => void = () => {}
    host.source = () =>
      new Promise((resolve) => {
        answer = resolve
      })
    await enter(host)
    expect(states(host).has('loading')).toBe(true)
    expect((part(host, 'loading') as HTMLElement).hidden).toBe(false)
    expect(live(host)).toBe('Loading')
    answer(['open', 'closed'])
    await settle(host)
    await settle(host)
    expect(states(host).has('loading')).toBe(false)
    expect(live(host)).toBe('2 suggestions')
  })

  test('shows nothing from a source that fails, and stops loading', async () => {
    const host = await mount()
    host.source = () => Promise.reject(new Error('offline'))
    await enter(host)
    await settle(host)
    expect(states(host).has('loading')).toBe(false)
    expect(shown(host)).toEqual([])
  })

  test('writes a chosen value over the term at the caret, and asks again', async () => {
    const host = await mount()
    const { asked, source } = listed(({ field }) => (field === 'status' ? ['open'] : ['status:']))
    host.source = source
    await enter(host)
    await type(host, 'refund sta')
    await press(host, 'ArrowDown')
    await press(host, 'Enter')
    await settle(host)
    expect(host.value).toBe('refund status:')
    expect(asked.at(-1)).toMatchObject({ field: 'status', term: '' })
    expect(shown(host)).toEqual(['open'])
    await press(host, 'ArrowDown')
    await press(host, 'Enter')
    await settle(host)
    expect(host.value).toBe('refund status:open ')
  })

  test('reads a chosen field:value into a chip where the field is declared', async () => {
    const host = await mount(
      '<helix-headless-filter-field name="status" label="Status"></helix-headless-filter-field>',
    )
    const facets: unknown[] = []
    host.addEventListener('helix-before-facet', (event) =>
      facets.push((event as CustomEvent).detail),
    )
    host.source = () => ['open']
    await enter(host)
    await type(host, 'refund status:op')
    await press(host, 'ArrowDown')
    await press(host, 'Enter')
    await settle(host)
    expect(facets).toMatchObject([{ field: 'status', values: ['open'] }])
    expect(host.value).toBe('refund')
  })

  test('leaves the text to a page that cancels the choice', async () => {
    const host = await mount()
    host.source = () => ['open']
    host.addEventListener('helix-before-select', (event) => event.preventDefault())
    await enter(host)
    await type(host, 'status:op')
    await press(host, 'ArrowDown')
    await press(host, 'Enter')
    await settle(host)
    expect(host.value).toBe('status:op')
  })

  test('takes away what it drew when the source goes, and leaves slotted options', async () => {
    const host = await mount(
      '<helix-headless-option slot="suggestions" value="mine">Mine</helix-headless-option>',
    )
    host.source = () => ['open']
    await enter(host)
    expect(shown(host)).toEqual(['Mine', 'open'])
    host.source = undefined
    await settle(host)
    await settle(host)
    expect(shown(host)).toEqual(['Mine'])
  })
})
