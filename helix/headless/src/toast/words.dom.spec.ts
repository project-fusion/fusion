import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

let messageWords: (item: Element) => string

beforeAll(async () => {
  registerDom()
  ;({ messageWords } = await import('./words.js'))
})

const item = (markup: string, tone = ''): Element => {
  const one = document.createElement('div')
  if (tone) {
    one.setAttribute('tone', tone)
  }
  one.innerHTML = markup
  return one
}

describe('messageWords', () => {
  test('says the tone, then the heading wherever it was written, then the rest', () => {
    expect(
      messageWords(
        item('<p slot="description">Try again</p><p slot="heading">Upload failed</p>', 'danger'),
      ),
    ).toBe('Error. Upload failed. Try again')
  })

  test('leaves out the actions and the marks a reader finds by moving in', () => {
    expect(
      messageWords(
        item(
          'Saved <button slot="actions">Undo</button><svg slot="icon"><title>Tick</title></svg><span slot="dismiss-icon">x</span>',
        ),
      ),
    ).toBe('Saved')
  })
})
