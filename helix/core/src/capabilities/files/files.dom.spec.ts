import '@fusion.dev/helix-testing/dom/register'
import { afterEach, beforeAll, describe, expect, spyOn, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { fakeFiles } from './fake.js'
import { files, setFiles } from './index.js'
import { serverFiles } from './server.js'
import { installWebFiles, pickWithInput, webFiles } from './web.js'

beforeAll(() => {
  registerDom()
})

afterEach(() => {
  setFiles(serverFiles)
})

/** Catches the next file input the page clicks, and keeps it from opening a chooser. */
const nextInput = (): Promise<HTMLInputElement> =>
  new Promise((caught) => {
    const click = spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (
      this: HTMLInputElement,
    ) {
      click.mockRestore()
      caught(this)
    })
  })

/** Chooses `chosen` in `input`, as a reader does in the chooser. */
const choose = (input: HTMLInputElement, chosen: readonly File[]): void => {
  Object.defineProperty(input, 'files', { configurable: true, value: chosen })
  input.dispatchEvent(new Event('change'))
}

describe('webFiles', () => {
  test('opens a file input with the types and the count asked for, and gives the files chosen', async () => {
    const opened = nextInput()
    const picking = webFiles.pick({ accept: ['.pdf', 'image/*'], multiple: true })
    const input = await opened
    expect(input.type).toBe('file')
    expect(input.accept).toBe('.pdf,image/*')
    expect(input.multiple).toBe(true)
    choose(input, [new File(['%PDF'], 'report.pdf', { type: 'application/pdf' })])
    const picked = await picking
    expect(picked.outcome).toBe('chosen')
    expect(picked.files).toHaveLength(1)
    expect(picked.files[0]).toMatchObject({ name: 'report.pdf', size: 4, type: 'application/pdf' })
    expect(picked.files[0]?.uri.startsWith('blob:')).toBe(true)
    expect(document.querySelector('input[type=file]')).toBeNull()
  })

  test('gives dismissed when the chooser closes with nothing chosen', async () => {
    const opened = nextInput()
    const picking = webFiles.pick({ accept: [], multiple: false })
    ;(await opened).dispatchEvent(new Event('cancel'))
    expect(await picking).toEqual({ files: [], outcome: 'dismissed' })
    expect(document.querySelector('input[type=file]')).toBeNull()
  })

  test('asks a phone’s browser for its camera where a pick captures', async () => {
    const opened = nextInput()
    const picking = pickWithInput({ accept: ['image/*'], capture: 'environment', multiple: false })
    const input = await opened
    expect(input.getAttribute('capture')).toBe('environment')
    input.dispatchEvent(new Event('cancel'))
    await picking
  })

  test('saves a file as a download under its name, and leaves no link behind', async () => {
    const clicked: HTMLAnchorElement[] = []
    const click = spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this)
    })
    try {
      expect(
        await webFiles.save({
          name: 'notes.txt',
          type: 'text/plain',
          uri: 'data:text/plain,Notes',
        }),
      ).toBe(true)
    } finally {
      click.mockRestore()
    }
    expect(clicked.map((link) => [link.download, link.getAttribute('href')])).toEqual([
      ['notes.txt', 'data:text/plain,Notes'],
    ])
    expect(document.querySelectorAll('a')).toHaveLength(0)
  })

  test('is installed where nothing is set, and leaves a fake in place', () => {
    installWebFiles()
    expect(files()).toBe(webFiles)
    const fake = fakeFiles()
    setFiles(fake)
    installWebFiles()
    expect(files()).toBe(fake)
  })
})
