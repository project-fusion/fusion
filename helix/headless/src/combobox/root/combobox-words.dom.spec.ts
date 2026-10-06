import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/**
 * Combobox on the words registry: its words come from `registerWords` for the
 * page's language, its count is one plural message, and its numbers are
 * written in the locale its words are in.
 */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const OPTIONS = `<helix-headless-option value="rs">Rust</helix-headless-option>
  <helix-headless-option value="rb">Ruby</helix-headless-option>
  <helix-headless-option value="go">Go</helix-headless-option>`

/** A combobox in a container whose attributes set the page's language. */
const combobox = async (around = '', extra = ''): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}><helix-headless-combobox label="L" ${extra}>
    ${OPTIONS}
  </helix-headless-combobox></div>`
  const host = document.querySelector('helix-headless-combobox') as Updatable
  await settle(host)
  return host
}

const listbox = (host: Updatable): HTMLElement =>
  part(host as HTMLElement, 'listbox') as HTMLElement

/** Runs with a user agent, so the VoiceOver region is drawn. */
const onApple = async <T>(run: () => Promise<T>): Promise<T> => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'userAgent')
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  })
  try {
    return await run()
  } finally {
    if (original === undefined) {
      delete (navigator as { userAgent?: string }).userAgent
    } else {
      Object.defineProperty(navigator, 'userAgent', original)
    }
  }
}

/** What the VoiceOver region says once the list opens from the keyboard: the count, then the first option. */
const countSaid = async (host: Updatable): Promise<string | undefined> => {
  const control = part(host as HTMLElement, 'control') as HTMLInputElement
  control.focus()
  control.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: 'ArrowDown',
    }),
  )
  await settle(host)
  await settle(listbox(host) as unknown as Updatable)
  await settle(host)
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await settle(host)
  return part(host as HTMLElement, 'live')?.textContent?.trim()
}

const POLISH = {
  'helix-combobox': {
    emptyText: 'Brak wyników',
    listLabel: 'Opcje',
    resultsLabel: '{count, plural, one {# wynik} few {# wyniki} many {# wyników} other {# wyniku}}',
  },
}

describe('a combobox on a page in another language', () => {
  test('speaks the words registered for the nearest `lang`', async () => {
    registerWords('pl', POLISH)
    const host = await combobox('lang="pl"')
    expect(listbox(host).getAttribute('aria-label')).toBe('Opcje')
    expect(listbox(host).getAttribute('empty-text')).toBe('Brak wyników')
  })

  test('counts with the language’s own forms', async () => {
    registerWords('pl', POLISH)
    await onApple(async () => {
      const host = await combobox('lang="pl"')
      expect(await countSaid(host)).toBe('3 wyniki. Rust')
    })
  })

  test('speaks its `locale` before the nearest `lang`, and tells its list', async () => {
    registerWords('pl', POLISH)
    const host = await combobox('lang="de"', 'locale="pl"')
    expect(listbox(host).getAttribute('aria-label')).toBe('Opcje')
    expect(listbox(host).getAttribute('lang')).toBe('pl')
  })

  test('hands its list the nearest `lang`, so the list counts in it', async () => {
    registerWords('pl', POLISH)
    const host = await combobox('lang="pl"')
    expect(listbox(host).getAttribute('lang')).toBe('pl')
    const control = part(host as HTMLElement, 'control') as HTMLInputElement
    control.value = 'r'
    control.dispatchEvent(
      new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
    )
    await settle(host)
    await settle(listbox(host) as unknown as Updatable)
    const said = part(listbox(host), 'live')?.textContent?.trim()
    /* Two is `few` in Polish: before the list was handed the `lang`, it
       counted with the browser's English rules and said "2 wyniku". */
    expect(said).toBe('2 wyniki')
  })

  test('gives its list no `lang` where nothing names one', async () => {
    const host = await combobox()
    expect(listbox(host).hasAttribute('lang')).toBe(false)
  })

  test('updates once words are registered after it rendered', async () => {
    const host = await combobox('lang="pl"')
    expect(listbox(host).getAttribute('empty-text')).toBe('No matches')
    registerWords('pl', POLISH)
    await Promise.resolve()
    await settle(host)
    expect(listbox(host).getAttribute('empty-text')).toBe('Brak wyników')
  })

  test('keeps words a page wrote over the registry', async () => {
    registerWords('pl', POLISH)
    const host = await combobox('lang="pl"', 'empty-text="Nic"')
    expect(listbox(host).getAttribute('empty-text')).toBe('Nic')
  })
})

describe('the count a combobox says', () => {
  test('is one plural message, in English by default', async () => {
    await onApple(async () => {
      expect(await countSaid(await combobox())).toBe('3 results. Rust')
    })
  })

  test('hands its list the one message and no singular sentence', async () => {
    const host = await combobox()
    expect(listbox(host).getAttribute('result-label')).toBe('')
    expect(listbox(host).getAttribute('results-label')).toBe(
      '{count, plural, one {# result} other {# results}}',
    )
  })

  test('still takes the deprecated sentence for one, where a page sets it', async () => {
    await onApple(async () => {
      document.body.innerHTML = `<helix-headless-combobox label="L" result-label="Just {count}">
        <helix-headless-option value="rs">Rust</helix-headless-option>
      </helix-headless-combobox>`
      const host = document.querySelector('helix-headless-combobox') as Updatable
      await settle(host)
      expect(await countSaid(host)).toBe('Just 1. Rust')
      expect(listbox(host).getAttribute('result-label')).toBe('Just {count}')
    })
  })
})

describe('the create row', () => {
  const typed = async (extra: string): Promise<string | undefined> => {
    const host = await combobox('', `creatable ${extra}`)
    const control = part(host as HTMLElement, 'control') as HTMLInputElement
    control.value = 'Zig'
    control.dispatchEvent(
      new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }),
    )
    await settle(host)
    return (host as HTMLElement).shadowRoot
      ?.querySelector('[part~="create"]')
      ?.textContent?.replace(/\s+/g, ' ')
      .trim()
  }

  test('writes what was typed where its sentence says', async () => {
    expect(await typed('')).toBe('Add "Zig"')
    expect(await typed('create-label="„{value}“ hinzufügen"')).toBe('„Zig“ hinzufügen')
  })

  test('follows a sentence without `{value}` with the value in quotes', async () => {
    expect(await typed('create-label="Invent"')).toBe('Invent "Zig"')
  })
})
