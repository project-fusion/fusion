import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import type {
  clearWords as ClearWords,
  registerWords as RegisterWords,
} from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/* Imported once the DOM is registered: core reads the globals it finds as
   it is evaluated, and a static import breaks the DOM when this file runs
   first. */
let clearWords: typeof ClearWords
let registerWords: typeof RegisterWords

/**
 * File Input on the words registry: its sentences, its sizes under a
 * kilobyte, and the lists of names in them are in the nearest `lang`.
 */
beforeAll(async () => {
  registerDom()
  ;({ clearWords, registerWords } = await import('@fusion.dev/helix-core'))
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const field = async (around: string, attrs = 'multiple'): Promise<Updatable> => {
  document.body.innerHTML = `<div ${around}><helix-headless-file-input label="Files" ${attrs}></helix-headless-file-input></div>`
  const host = document.querySelector('helix-headless-file-input') as Updatable
  await settle(host)
  return host
}

const sized = (name: string, size: number, type = 'text/plain'): File =>
  new File([new Uint8Array(size)], name, { type })

const dropOn = async (host: Updatable, files: File[]): Promise<void> => {
  const carrier = new DataTransfer()
  for (const file of files) {
    carrier.items.add(file)
  }
  const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent
  Object.defineProperty(event, 'dataTransfer', { value: carrier })
  part(host as HTMLElement, 'field')?.dispatchEvent(event)
  await settle(host)
  await new Promise((done) => setTimeout(done, 40))
  await settle(host)
}

const sizes = (host: Updatable): string[] =>
  [...((host as HTMLElement).shadowRoot?.querySelectorAll('[part~="size"]') ?? [])].map(
    (one) => one.textContent?.trim() ?? '',
  )

describe('a file input on a page in another language', () => {
  test('says what a drop added, listing the names as the language lists them', async () => {
    registerWords('pl', { 'helix-file-input': { addedText: 'Dodano: {names}' } })
    const host = await field('lang="pl"')
    await dropOn(host, [sized('a.txt', 1), sized('b.txt', 2), sized('c.txt', 3)])
    expect(part(host as HTMLElement, 'live')?.textContent).toBe('Dodano: a.txt, b.txt i c.txt')
  })

  test('writes a size under a kilobyte with the forms the language has', async () => {
    registerWords('pl', {
      'helix-file-input': {
        bytesLabel: '{count, plural, one {# bajt} few {# bajty} many {# bajtów} other {# bajta}}',
      },
    })
    const host = await field('lang="pl"')
    await dropOn(host, [sized('a.txt', 1), sized('b.txt', 2), sized('c.txt', 5)])
    expect(sizes(host)).toEqual(['1 bajt', '2 bajty', '5 bajtów'])
  })

  test('names a remove button and keeps the English where nothing is registered', async () => {
    registerWords('pl', { 'helix-file-input': { removeLabel: 'Usuń {name}' } })
    const polish = await field('lang="pl"')
    await dropOn(polish, [sized('a.txt', 1)])
    expect(part(polish as HTMLElement, 'remove')?.getAttribute('aria-label')).toBe('Usuń a.txt')
    const english = await field('')
    await dropOn(english, [sized('a.txt', 1), sized('b.txt', 1000)])
    expect(sizes(english)).toEqual(['1 byte', '1,000 bytes'])
    expect(part(english as HTMLElement, 'remove')?.getAttribute('aria-label')).toBe('Remove a.txt')
  })

  test('puts the name after a page label that does not hold one, as before', async () => {
    const host = await field('', 'multiple remove-label="Remove"')
    await dropOn(host, [sized('a.txt', 1)])
    expect(part(host as HTMLElement, 'remove')?.getAttribute('aria-label')).toBe('Remove a.txt')
  })
})
