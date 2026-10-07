import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/** Select on the words registry, with its chosen options listed as the nearest `lang` lists them. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
  await import('../../option/index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

const select = async (around: string, extra = ''): Promise<HTMLElement> => {
  document.body.innerHTML = `<div ${around}><helix-headless-select label="L" ${extra}>
    <helix-headless-option value="a">Alfa</helix-headless-option>
    <helix-headless-option value="b">Beta</helix-headless-option>
    <helix-headless-option value="c">Gamma</helix-headless-option>
  </helix-headless-select></div>`
  const host = document.querySelector('helix-headless-select') as Updatable
  await settle(host)
  await settle(host)
  return host
}

const trigger = (host: HTMLElement): string =>
  part(host, 'trigger')?.textContent?.replace(/\s+/g, ' ').trim() ?? ''

describe('a select on a page in another language', () => {
  test('shows the placeholder and the list’s name in the registered words', async () => {
    registerWords('pl', { 'helix-select': { listLabel: 'Opcje', placeholder: 'Wybierz' } })
    const host = (await select('lang="pl"')) as HTMLElement & { listLabel: string }
    expect(trigger(host)).toContain('Wybierz')
    expect(host.listLabel).toBe('Opcje')
  })

  test('lists what is chosen as the nearest `lang` lists it', async () => {
    expect(trigger(await select('', 'multiple value="a,b,c"'))).toContain('Alfa, Beta, Gamma')
    expect(trigger(await select('lang="pl"', 'multiple value="a,b,c"'))).toContain(
      'Alfa, Beta i Gamma',
    )
  })
})
