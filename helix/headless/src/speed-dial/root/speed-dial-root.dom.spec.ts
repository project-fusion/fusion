import { beforeAll, describe, expect, test } from 'bun:test'
import { mount, part, registerDom, role } from '@fusion-io/testing/dom'

beforeAll(async () => {
  registerDom()
  await import('../index.js')
})

type Dial = HTMLElement & { open: boolean; updateComplete: Promise<boolean> }
type Action = HTMLElement & { disabled: boolean; updateComplete: Promise<boolean>; value: string }

const dial = async (extra = ''): Promise<{ actions: Action[]; host: Dial }> => {
  const host = (await mount(
    `<helix-base-speed-dial label="Actions"${extra}>
      <button slot="trigger">Open</button>
      <helix-base-speed-dial-item value="share">Share</helix-base-speed-dial-item>
      <helix-base-speed-dial-item value="copy">Duplicate</helix-base-speed-dial-item>
      <helix-base-speed-dial-item value="delete">Delete</helix-base-speed-dial-item>
    </helix-base-speed-dial>`,
  )) as Dial
  await host.updateComplete
  const actions = [...host.querySelectorAll('helix-base-speed-dial-item')] as Action[]
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

  test('a slotted trigger is told what it is doing', async () => {
    /* The arrangement this component recommends is an icon button slotted as the
       trigger, and that is the consumer's markup: the state it has to announce
       is state only the dial holds. Left to them it goes unsaid, and the failure
       is silent to everyone who can see the screen. */
    const { host } = await dial()
    const trigger = host.querySelector('button[slot="trigger"]') as HTMLElement
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')

    host.open = true
    await host.updateComplete
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect((part(host, 'actions') as HTMLElement).hasAttribute('hidden')).toBe(false)
  })

  test('a default trigger carries the name and says it opens a menu', async () => {
    const host = (await mount(
      `<helix-base-speed-dial label="Actions">
        <helix-base-speed-dial-item value="share">Share</helix-base-speed-dial-item>
      </helix-base-speed-dial>`,
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
      `<helix-base-speed-dial label="Actions">
        <helix-base-speed-dial-item disabled value="delete">Delete</helix-base-speed-dial-item>
      </helix-base-speed-dial>`,
    )) as Dial
    await host.updateComplete
    const action = host.querySelector('helix-base-speed-dial-item') as Action
    await action.updateComplete
    const taken: string[] = []
    host.addEventListener('helix-select', () => taken.push('x'))
    ;(part(action, 'item') as HTMLElement).click()
    expect(taken).toEqual([])
  })
})
