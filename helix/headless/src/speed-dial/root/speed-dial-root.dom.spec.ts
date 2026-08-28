import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
  // A Helix trigger, which is the arrangement this component recommends and the
  // only kind that can hold the state without it reaching the markup.
  await import('../../button/index.js')
})

type Dial = HTMLElement & { open: boolean; updateComplete: Promise<boolean> }
type Action = HTMLElement & { disabled: boolean; updateComplete: Promise<boolean>; value: string }

const dial = async (extra = ''): Promise<{ actions: Action[]; host: Dial }> => {
  const host = (await mount(
    `<helix-headless-speed-dial label="Actions"${extra}>
      <button slot="trigger">Open</button>
      <helix-headless-speed-dial-item value="share">Share</helix-headless-speed-dial-item>
      <helix-headless-speed-dial-item value="copy">Duplicate</helix-headless-speed-dial-item>
      <helix-headless-speed-dial-item value="delete">Delete</helix-headless-speed-dial-item>
    </helix-headless-speed-dial>`,
  )) as Dial
  await host.updateComplete
  const actions = [...host.querySelectorAll('helix-headless-speed-dial-item')] as Action[]
  for (const one of actions) {
    await one.updateComplete
  }
  return { actions, host }
}

const press = (host: Dial, key: string) => {
  host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
}

/* Focus retargets to the host, so from the document `activeElement` is the
   action itself. `Menu.Item` records the same, and the shadow-root reading it
   replaced is one happy-dom does not survive. */
const focused = (one: Action) => one.ownerDocument.activeElement

describe('a speed dial', () => {
  test('is a menu, because its rows are commands and not destinations', async () => {
    /* The opposite call from `Megamenu`, and for the reason that decides it:
       that one holds links, so a menu role would have announced navigation as an
       application's commands. These are commands. */
    const { actions, host } = await dial()
    expect(role(part(host, 'actions') as HTMLElement)).toBe('menu')
    expect(role(part(actions[0], 'item') as HTMLElement)).toBe('menuitem')
  })

  test('a slotted trigger is told what it is doing, by property', async () => {
    /* The arrangement this component recommends is an icon button slotted as the
       trigger, and that is the consumer's markup: the state it has to announce
       is state only the dial holds. Left to them it goes unsaid, and the failure
       is silent to everyone who can see the screen.

       **A property, not an attribute, and the attribute is what this asserted
       until 28 Aug 2026.** Writing onto the consumer's element is a hydration
       mismatch React reports and does not patch up, measured against 19.2.8 on
       this family and `Megamenu`. A property never reaches the markup, so React
       has nothing to compare, and a Helix trigger renders `aria-expanded`
       inside its own shadow root. See `tellDisclosure` and #322. */
    const host = (await mount(
      `<helix-headless-speed-dial label="Actions">
        <helix-headless-button slot="trigger">Open</helix-headless-button>
        <helix-headless-speed-dial-item value="share">Share</helix-headless-speed-dial-item>
      </helix-headless-speed-dial>`,
    )) as Dial
    await host.updateComplete
    const trigger = host.querySelector('helix-headless-button') as HTMLElement & {
      expanded?: boolean
      updateComplete: Promise<boolean>
    }
    await trigger.updateComplete
    expect(trigger.expanded).toBe(false)
    // The consumer's markup is exactly what they wrote, which is the whole point.
    expect(trigger.hasAttribute('aria-expanded')).toBe(false)

    host.open = true
    await host.updateComplete
    await trigger.updateComplete
    expect(trigger.expanded).toBe(true)
    expect(trigger.hasAttribute('aria-expanded')).toBe(false)
    expect(part(trigger, 'button')?.getAttribute('aria-expanded')).toBe('true')
    expect((part(host, 'actions') as HTMLElement).hasAttribute('hidden')).toBe(false)
  })

  test('and a trigger that cannot hold it is left alone rather than written to', async () => {
    /* A plain `<button slot="trigger">` has no shadow root to keep the state out
       of the markup and no property to take it. Writing the attribute anyway is
       the mismatch above, so nothing is written and `tellDisclosure` says so
       once on the console. The reader loses the announcement, which is the cost
       this records rather than hides. */
    const { host } = await dial()
    const trigger = host.querySelector('button[slot="trigger"]') as HTMLElement
    expect(trigger.hasAttribute('aria-expanded')).toBe(false)

    host.open = true
    await host.updateComplete
    expect(trigger.hasAttribute('aria-expanded')).toBe(false)
  })

  test('a default trigger carries the name and says it opens a menu', async () => {
    const host = (await mount(
      `<helix-headless-speed-dial label="Actions">
        <helix-headless-speed-dial-item value="share">Share</helix-headless-speed-dial-item>
      </helix-headless-speed-dial>`,
    )) as Dial
    await host.updateComplete
    const trigger = part(host, 'trigger') as HTMLElement
    expect(trigger.getAttribute('aria-label')).toBe('Actions')
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  test('opening lands on the first action, which is where a keyboard expects it', async () => {
    const { actions, host } = await dial()
    host.open = true
    await host.updateComplete
    await host.updateComplete
    expect(focused(actions[0])).toBe(actions[0])
  })

  test('every arrow moves, because a dial reserves nothing', async () => {
    /* A menu keeps the horizontal pair for going into a submenu and coming back.
       A dial goes nowhere, so all four move and a reader who guesses either axis
       is answered, which is the controller's own house position. */
    const { actions, host } = await dial()
    host.open = true
    await host.updateComplete
    await host.updateComplete

    press(host, 'ArrowDown')
    expect(focused(actions[0])).toBe(actions[1])

    press(host, 'ArrowRight')
    expect(focused(actions[0])).toBe(actions[2])

    press(host, 'ArrowLeft')
    expect(focused(actions[0])).toBe(actions[1])

    press(host, 'ArrowUp')
    expect(focused(actions[0])).toBe(actions[0])
  })

  test('and arriving at an action does not take it', async () => {
    const { host } = await dial()
    const taken: string[] = []
    host.addEventListener('helix-select', (event) => {
      taken.push((event as CustomEvent<{ value: string }>).detail.value)
    })
    host.open = true
    await host.updateComplete
    press(host, 'ArrowDown')
    press(host, 'End')
    expect(taken).toEqual([])
  })

  test('choosing one shuts the dial behind it', async () => {
    /* An action that leaves the fan standing open is one a reader has to dismiss
       after asking for it. */
    const { actions, host } = await dial()
    host.open = true
    await host.updateComplete
    ;(part(actions[1], 'item') as HTMLElement).click()
    await host.updateComplete
    expect(host.open).toBe(false)
  })

  test('Escape shuts it and puts the reader back on the trigger', async () => {
    const { host } = await dial()
    const trigger = host.querySelector('button[slot="trigger"]') as HTMLElement
    host.open = true
    await host.updateComplete
    press(host, 'Escape')
    await host.updateComplete
    expect(host.open).toBe(false)
    expect(trigger.ownerDocument.activeElement).toBe(trigger)
  })

  test('a disabled action says nothing at all', async () => {
    const host = (await mount(
      `<helix-headless-speed-dial label="Actions">
        <helix-headless-speed-dial-item disabled value="delete">Delete</helix-headless-speed-dial-item>
      </helix-headless-speed-dial>`,
    )) as Dial
    await host.updateComplete
    const action = host.querySelector('helix-headless-speed-dial-item') as Action
    await action.updateComplete
    const taken: string[] = []
    host.addEventListener('helix-select', () => taken.push('x'))
    ;(part(action, 'item') as HTMLElement).click()
    expect(taken).toEqual([])
  })
})
