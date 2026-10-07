import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { clearWords, registerWords } from '@fusion.dev/helix-core'
import { part, registerDom, settle, type Updatable } from '@fusion.dev/helix-testing/dom'

/** Speed Dial on the words registry: the trigger's name and the long-press description. */
beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

afterEach(() => {
  clearWords()
  document.body.innerHTML = ''
})

type Host = Updatable & Record<string, unknown>

const mounted = async (around: string, extra = ''): Promise<Host> => {
  document.body.innerHTML = `<div ${around}><helix-headless-speed-dial ${extra}><helix-headless-speed-dial-item>Copy</helix-headless-speed-dial-item></helix-headless-speed-dial></div>`
  const host = document.querySelector<Host>('helix-headless-speed-dial') as Host
  await settle(host)
  return host
}

const WORDS = {
  'helix-speed-dial': {
    label: 'Aktionen',
    longPressLabel: 'Lange drücken oder Alt+Pfeil nach unten, um die Aktionen zu zeigen',
  },
}

describe('on a page in another language', () => {
  test('names its trigger, and describes a long press, in the registered words', async () => {
    registerWords('de', WORDS)
    const host = await mounted('lang="de"', 'open-on="long-press"')
    expect(part(host, 'trigger')?.getAttribute('aria-label')).toBe('Aktionen')
    expect(host.shadowRoot?.getElementById('long-press')?.textContent).toBe(
      'Lange drücken oder Alt+Pfeil nach unten, um die Aktionen zu zeigen',
    )
    expect(part(await mounted(''), 'trigger')?.getAttribute('aria-label')).toBe('Actions')
  })
})
