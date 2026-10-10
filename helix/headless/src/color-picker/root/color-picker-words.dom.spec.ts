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
 * Color Picker on the words registry: the square's sentence is one message,
 * so a language orders the names, the numbers and the color as it says them,
 * and its percentages are written where the language puts the sign.
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

const picker = async (around: string, attrs = 'value="#ff0000"'): Promise<HTMLElement> => {
  document.body.innerHTML = `<div ${around}><helix-headless-color-picker ${attrs}></helix-headless-color-picker></div>`
  const host = document.querySelector('helix-headless-color-picker') as Updatable
  await settle(host)
  return host
}

const said = (host: HTMLElement, name: string): string | null | undefined =>
  part(host, name)?.getAttribute('aria-valuetext')

describe('the square of a color picker', () => {
  test('says the English it always said', async () => {
    const host = await picker('')
    expect(said(host, 'grid-saturation')).toBe('Saturation 100%, Brightness 100%, vibrant red')
    expect(said(host, 'grid-brightness')).toBe('Brightness 100%, Saturation 100%, vibrant red')
  })

  test('says the sentence registered for the nearest `lang`, with its percent sign', async () => {
    registerWords('fr', {
      'helix-color-picker': {
        brightnessLabel: 'Luminosité',
        saturationLabel: 'Saturation',
        squareText:
          '{first, select, brightness {{name} : {brightnessLabel} {brightness, number, percent}, {saturationLabel} {saturation, number, percent}} other {{name} : {saturationLabel} {saturation, number, percent}, {brightnessLabel} {brightness, number, percent}}}',
      },
    })
    const host = await picker('lang="fr"')
    expect(said(host, 'grid-brightness')).toBe(
      'vibrant red : Luminosité 100\u00a0%, Saturation 100\u00a0%',
    )
    expect(part(host, 'grid-brightness')?.getAttribute('aria-label')).toBe('Luminosité')
  })

  test('says the hue and its name as the language lists two things', async () => {
    const english = await picker('', 'wheel value="#00ff00"')
    expect(said(english, 'wheel-hue')).toBe('120, green')
  })
})

describe('the sentences a color picker raises', () => {
  test('are the words registered for the nearest `lang`', async () => {
    registerWords('pl', { 'helix-color-picker': { valueMissingMessage: 'Wybierz kolor.' } })
    const host = await picker('lang="pl"', 'required')
    expect((host as unknown as { internals: ElementInternals }).internals.validationMessage).toBe(
      'Wybierz kolor.',
    )
    const english = await picker('', 'required')
    expect(
      (english as unknown as { internals: ElementInternals }).internals.validationMessage,
    ).toBe('Choose a color.')
  })
})
