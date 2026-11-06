import '@fusion.dev/helix-testing/dom/register'
import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, registerDom } from '@fusion.dev/helix-testing/dom'

/* Typed letters on a tab set. The search itself is `Typeahead`, which
   `helix/core/src/machines/typeahead` holds to the typeahead machine the
   native tab set runs; these hold what the tab set adds to it: the words of a
   tab, the tabs a letter can reach, and what arriving on one does. */

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Host = HTMLElement & { active: string; updateComplete: Promise<unknown> }
type Tab = HTMLElement & { focusItem: () => void }

/* A choice is applied a microtask after its `helix-select`, once every
   listener has had the chance to refuse it, so the update to wait for is
   requested after that. */
const turn = async (host: Host): Promise<void> => {
  await null
  await host.updateComplete
}

/** A tab valued `value` with these words, and anything else it carries. */
const tab = (value: string, words: string, extra = ''): string =>
  `<helix-headless-tab value="${value}" ${extra}>${words}</helix-headless-tab>`

/** Tabs `t0`, `t1` and on, with these words. */
const named = (...words: string[]): string => words.map((one, at) => tab(`t${at}`, one)).join('')

/**
 * A tab set around these tabs, and what a key typed on it does: the tabs
 * focus moved to, and the events the set sent, in order.
 *
 * Focus is recorded, since `activeElement` cannot see into a shadow root
 * here, so each key is typed on a named tab: the one focus would be on.
 */
const set = async (tabs: string, attributes = '') => {
  const host = (await mount(
    `<helix-headless-tabs ${attributes}>${tabs}<helix-headless-tab-panel slot="panels" value="t0">Panel</helix-headless-tab-panel></helix-headless-tabs>`,
  )) as Host
  await turn(host)
  const reached: string[] = []
  for (const one of host.querySelectorAll<Tab>('helix-headless-tab')) {
    one.focusItem = () => {
      reached.push(one.getAttribute('value') ?? '')
    }
  }
  const heard: string[] = []
  for (const name of ['helix-select', 'helix-before-activate', 'helix-activate']) {
    host.addEventListener(name, (event) => {
      heard.push(`${name} ${(event as CustomEvent<{ value: string }>).detail.value}`)
    })
  }
  /** Types `key` on the tab valued `from`, and says whether the set took it. */
  const type = async (key: string, from: string, init: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...init })
    host.querySelector(`helix-headless-tab[value="${from}"]`)?.dispatchEvent(event)
    await turn(host)
    return event.defaultPrevented
  }
  return { heard, host, reached, type }
}

describe('a letter typed on a tab', () => {
  test('chooses the tab whose words start with it, and sends what an arrow sends', async () => {
    const lettered = await set(named('Alpha', 'Beta', 'Gamma'))
    expect(await lettered.type('g', 't0')).toBe(true)
    expect(lettered.reached).toEqual(['t2'])
    expect(lettered.host.active).toBe('t2')

    const arrowed = await set(named('Alpha', 'Beta', 'Gamma'))
    await arrowed.type('ArrowLeft', 't0')
    expect(arrowed.reached).toEqual(['t2'])
    expect(lettered.heard).toEqual([
      'helix-select t2',
      'helix-before-activate t2',
      'helix-activate t2',
    ])
    expect(lettered.heard).toEqual(arrowed.heard)
  })

  test('typed again moves on through the tabs that start with it, and comes round', async () => {
    const { reached, type } = await set(named('Cambodia', 'Canada', 'Chile', 'Denmark'))
    await type('c', 't0')
    await type('c', 't1')
    await type('c', 't2')
    expect(reached).toEqual(['t1', 't2', 't0'])
  })

  test('reads letters typed together as one word', async () => {
    const { reached, type } = await set(named('Cambodia', 'Canada', 'Chile'))
    await type('c', 't2')
    await type('a', 't0')
    await type('n', 't0')
    expect(reached).toEqual(['t0', 't1'])
  })

  test('starts a new word after half a second', async () => {
    const realNow = Date.now
    let clock = realNow()
    Date.now = () => clock
    try {
      const quick = await set(named('Cambodia', 'Denmark'))
      await quick.type('c', 't1')
      expect(await quick.type('d', 't0')).toBe(true)
      expect(quick.reached).toEqual(['t0'])

      const paused = await set(named('Cambodia', 'Denmark'))
      await paused.type('c', 't1')
      clock += 600
      await paused.type('d', 't0')
      expect(paused.reached).toEqual(['t0', 't1'])
    } finally {
      Date.now = realNow
    }
  })

  test('starts a new word after an arrow moves focus', async () => {
    /* Without the reset, "ca" lands on Canada, where the arrow left focus. */
    const { reached, type } = await set(named('Apple', 'Cherry', 'Canada'))
    await type('c', 't0')
    await type('ArrowRight', 't1')
    await type('a', 't2')
    expect(reached).toEqual(['t1', 't2', 't0'])
  })

  test('passes over a disabled tab', async () => {
    const { reached, type } = await set(
      `${tab('t0', 'Alpha')}${tab('t1', 'Beta', 'disabled')}${tab('t2', 'Bravo')}`,
    )
    await type('b', 't0')
    expect(reached).toEqual(['t2'])
  })

  /* Read as the panel's name is read, from the tab's whole text, this tab
     would start with "Close". */
  test('reads the words in the default slot, and none slotted into dismiss-icon', async () => {
    const tabs = `${tab('t0', '<span slot="dismiss-icon">Close</span>Alpha', 'dismissible')}${tab('t1', '<b>Beta</b>')}`
    const closing = await set(tabs)
    expect(await closing.type('c', 't1')).toBe(true)
    expect(closing.reached).toEqual([])
    const bold = await set(tabs)
    await bold.type('b', 't0')
    expect(bold.reached).toEqual(['t1'])
  })

  test('is taken and moves nothing where no tab starts with it', async () => {
    const { heard, reached, type } = await set(named('Alpha', 'Beta'))
    expect(await type('z', 't0')).toBe(true)
    expect(reached).toEqual([])
    expect(heard).toEqual([])
  })
})

describe('a letter on a set that does not choose on arrival', () => {
  test('moves focus and chooses nothing under manual', async () => {
    const { heard, host, reached, type } = await set(named('Alpha', 'Beta', 'Gamma'), 'manual')
    await type('g', 't0')
    expect(reached).toEqual(['t2'])
    expect(host.active).toBe('t0')
    expect(heard).toEqual([])
  })

  test('moves focus and chooses nothing where a tab is a link', async () => {
    const { heard, host, reached, type } = await set(
      `${tab('t0', 'Home', 'href="/home"')}${tab('t1', 'Docs', 'href="/docs"')}`,
    )
    await type('d', 't0')
    expect(reached).toEqual(['t1'])
    expect(host.active).toBe('t0')
    expect(heard).toEqual([])
  })
})

describe('a key a tab set leaves to the page', () => {
  /* Space chooses the tab with focus, which is a press of its own. Inside a
     word it is a letter, as in "New York". */
  test('is a Space, unless a word is being typed', async () => {
    const { reached, type } = await set(named('New Haven', 'New York', 'Norway'), 'manual')
    expect(await type(' ', 't0')).toBe(false)
    await type('n', 't2')
    for (const key of ['e', 'w', ' ']) {
      expect(await type(key, 't0')).toBe(true)
    }
    await type('y', 't0')
    expect(reached).toEqual(['t0', 't1'])
  })

  test('is a letter typed in a panel', async () => {
    const { host, reached, type } = await set(named('Alpha', 'Beta'))
    expect(await type('b', 't0')).toBe(true)
    expect(reached).toEqual(['t1'])
    const panel = host.querySelector('helix-headless-tab-panel') as HTMLElement
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'a' })
    panel.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(reached).toEqual(['t1'])
  })

  test('is a letter with Control, Command or Alt held', async () => {
    const { reached, type } = await set(named('Alpha', 'Beta'))
    for (const held of ['ctrlKey', 'metaKey', 'altKey']) {
      expect(await type('b', 't0', { [held]: true })).toBe(false)
    }
    expect(reached).toEqual([])
  })
})
