import { beforeAll, describe, expect, test } from 'bun:test'
import { at, mount, part, registerDom, role } from '@fusion.dev/helix-testing/dom'

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

/* The click is sent from the trigger's slot: happy-dom does not carry a click
   on a slotted element through the slot it is assigned to. */
const pressTrigger = (host: Dial): void => {
  host.shadowRoot
    ?.querySelector('slot[name="trigger"]')
    ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
}

const press = (host: Dial, key: string) => {
  host.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }))
}

/* Focus retargets to the host, so from the document `activeElement` is the
   action itself. `Menu.Item` records the same. Reading it through the shadow
   root instead is what happy-dom does not survive. */
const focused = (one: Action) => one.ownerDocument.activeElement

describe('a speed dial', () => {
  /* Its close ran on a listener registered at connection, ahead of the page's,
     so a refused choice shut the dial anyway. */
  test('a choice is heard before the dial closes, and a refused one leaves it open', async () => {
    const { actions, host } = await dial()
    const heard: string[] = []
    host.addEventListener('helix-select', (event) => {
      const value = (event as CustomEvent<{ value: string }>).detail.value
      heard.push(`select ${value}`)
      if (value === 'delete') {
        event.preventDefault()
      }
    })
    host.addEventListener('helix-before-close', () => heard.push('before-close'))
    const choose = async (one: Action): Promise<void> => {
      host.open = true
      await host.updateComplete
      one.shadowRoot?.querySelector<HTMLElement>('button, [part="item"]')?.click()
      await host.updateComplete
    }
    await choose(at(actions, 2))
    expect(host.open).toBe(true)
    heard.length = 0
    await choose(at(actions, 0))
    expect(heard).toEqual(['select share', 'before-close'])
    expect(host.open).toBe(false)
  })

  test('is a menu, because its rows are commands and not destinations', async () => {
    /* The opposite call from `Megamenu`, and for the reason that decides it:
       that one holds links, so a menu role would have announced navigation as an
       application's commands. These are commands. */
    const { actions, host } = await dial()
    expect(role(part(host, 'actions') as HTMLElement)).toBe('menu')
    expect(role(part(at(actions, 0), 'item') as HTMLElement)).toBe('menuitem')
  })

  test('a slotted trigger is told what it is doing, by property', async () => {
    /* The arrangement this component recommends is an icon button slotted as the
       trigger, and that is the consumer's markup: the state it has to announce
       is state only the dial holds. Left to them it goes unsaid, and the failure
       is silent to everyone who can see the screen.

       **A property, not an attribute.** Writing onto the consumer's element is a
       hydration mismatch React reports and does not patch up, measured against
       19.2.8 on this family and `Megamenu`. A property never reaches the markup,
       so React has nothing to compare, and a Helix trigger renders
       `aria-expanded` inside its own shadow root. See `tellDisclosure` and #322. */
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
    expect(part(trigger, 'button')?.getAttribute('aria-haspopup')).toBe('menu')
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

  /* The host takes no focus of its own, so a page focusing the dial, after a
     dialog closes for one, left focus on the body. */
  test('focusing the dial focuses its trigger, slotted or drawn', async () => {
    const { host } = await dial()
    host.focus()
    expect(document.activeElement).toBe(host.querySelector('[slot="trigger"]'))

    const drawn = (await mount(
      `<helix-headless-speed-dial label="Actions">
        <helix-headless-speed-dial-item value="share">Share</helix-headless-speed-dial-item>
      </helix-headless-speed-dial>`,
    )) as Dial
    await drawn.updateComplete
    drawn.focus()
    expect(drawn.shadowRoot?.activeElement).toBe(part(drawn, 'trigger'))
  })

  test('opening from the trigger lands on the first action, which is where a keyboard expects it', async () => {
    const { actions, host } = await dial()
    pressTrigger(host)
    await host.updateComplete
    await host.updateComplete
    expect(focused(at(actions, 0))).toBe(at(actions, 0))
  })

  /* `default-open` on load, or a script opening the dial while the reader is
     typing somewhere else, leaves focus where the reader put it. */
  test('opening any other way leaves focus where it is', async () => {
    const { host } = await dial()
    const field = document.createElement('input')
    document.body.append(field)
    field.focus()
    host.open = true
    await host.updateComplete
    await host.updateComplete
    expect(field.ownerDocument.activeElement).toBe(field)
    field.remove()
  })

  test('every arrow moves, because a dial reserves nothing', async () => {
    /* A menu keeps the horizontal pair for going into a submenu and coming back.
       A dial goes nowhere, so all four move and a reader who guesses either axis
       is answered, which is the controller's own house position. */
    const { actions, host } = await dial()
    pressTrigger(host)
    await host.updateComplete
    await host.updateComplete

    press(host, 'ArrowDown')
    expect(focused(at(actions, 0))).toBe(at(actions, 1))

    press(host, 'ArrowRight')
    expect(focused(at(actions, 0))).toBe(at(actions, 2))

    press(host, 'ArrowLeft')
    expect(focused(at(actions, 0))).toBe(at(actions, 1))

    press(host, 'ArrowUp')
    expect(focused(at(actions, 0))).toBe(at(actions, 0))
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
    ;(part(at(actions, 1), 'item') as HTMLElement).click()
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

describe('a speed dial and the keys around it', () => {
  const pressOn = (target: Element, key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key,
    })
    target.dispatchEvent(event)
    return event
  }

  /* A dialog around the dial closes on Escape, and the trigger is where focus
     rests after every use of the dial. */
  test('lets Escape through while it is closed', async () => {
    const { host } = await dial()
    let heard = false
    host.parentElement?.addEventListener('keydown', () => {
      heard = true
    })
    const event = pressOn(host.querySelector('button[slot="trigger"]') as Element, 'Escape')
    expect(event.defaultPrevented).toBe(false)
    expect(heard).toBe(true)
  })

  test('keeps the actions out of the tab order, and closes when Tab leaves', async () => {
    const { actions, host } = await dial()
    expect(part(at(actions, 0), 'item')?.getAttribute('tabindex')).toBe('-1')
    host.open = true
    await host.updateComplete
    const event = pressOn(at(actions, 0), 'Tab')
    await host.updateComplete
    expect(event.defaultPrevented).toBe(false)
    expect(host.open).toBe(false)
  })

  test('moves to the next action that starts with a typed letter', async () => {
    const { actions, host } = await dial()
    pressTrigger(host)
    await host.updateComplete
    await host.updateComplete
    pressOn(at(actions, 0), 'd')
    expect(focused(at(actions, 0))).toBe(at(actions, 1))
    pressOn(at(actions, 1), 'd')
    expect(focused(at(actions, 0))).toBe(at(actions, 2))
  })
})

/* Menu has sections; a dial's actions were one flat list. */
describe('a speed dial with groups', () => {
  test('names each group, and the arrows walk through every group in order', async () => {
    const host = (await mount(
      `<helix-headless-speed-dial label="Actions">
        <button slot="trigger">Open</button>
        <helix-headless-speed-dial-group label="Share">
          <helix-headless-speed-dial-item value="mail">Mail</helix-headless-speed-dial-item>
          <helix-headless-speed-dial-item value="link">Link</helix-headless-speed-dial-item>
        </helix-headless-speed-dial-group>
        <helix-headless-speed-dial-item value="delete">Delete</helix-headless-speed-dial-item>
      </helix-headless-speed-dial>`,
    )) as Dial
    await host.updateComplete
    const group = host.querySelector('helix-headless-speed-dial-group') as Dial
    await group.updateComplete
    const inner = part(group, 'group') as HTMLElement
    expect([inner.getAttribute('role'), inner.getAttribute('aria-labelledby')]).toEqual([
      'group',
      'label',
    ])
    expect(part(group, 'label')?.textContent?.trim()).toBe('Share')

    pressTrigger(host)
    await host.updateComplete
    await host.updateComplete
    const order: string[] = []
    for (let step = 0; step < 3; step += 1) {
      const from = host.ownerDocument.activeElement as HTMLElement
      from.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          composed: true,
          key: 'ArrowDown',
        }),
      )
      order.push((host.ownerDocument.activeElement as Action).value)
    }
    expect(order).toEqual(['link', 'delete', 'mail'])
  })
})

/* React Aria's menu trigger takes `trigger="longPress"`: a press is the
   trigger's own action and a held one opens the menu. */
describe('a speed dial opened by a long press', () => {
  const triggerSlot = (host: Dial): HTMLElement =>
    host.shadowRoot?.querySelector('slot[name="trigger"]') as HTMLElement

  test('leaves a quick press to the trigger, and opens on a held one without the press', async () => {
    const { host } = await dial(' open-on="long-press"')
    const own: string[] = []
    host.querySelector('[slot="trigger"]')?.addEventListener('click', () => own.push('own'))
    const slot = triggerSlot(host)
    const pointer = (type: string) =>
      slot.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          clientX: 5,
          clientY: 5,
          composed: true,
        }),
      )

    pointer('pointerdown')
    pointer('pointerup')
    pressTrigger(host)
    await host.updateComplete
    expect(host.open).toBe(false)

    pointer('pointerdown')
    await new Promise((resolve) => setTimeout(resolve, 560))
    await host.updateComplete
    expect(host.open).toBe(true)
    pointer('pointerup')
    /* The click the release makes is the long press's: neither the dial's
       toggle nor the page's own handler on the trigger runs. */
    slot.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }))
    await host.updateComplete
    expect(host.open).toBe(true)
  })

  test('opens on Alt+Down from the keyboard, which a plain arrow does not', async () => {
    const { host } = await dial(' open-on="long-press"')
    press(host, 'ArrowDown')
    await host.updateComplete
    expect(host.open).toBe(false)
    host.dispatchEvent(
      new KeyboardEvent('keydown', {
        altKey: true,
        bubbles: true,
        cancelable: true,
        key: 'ArrowDown',
      }),
    )
    await host.updateComplete
    expect(host.open).toBe(true)
  })

  test('the drawn trigger says how its actions are reached', async () => {
    const host = (await mount(
      `<helix-headless-speed-dial label="Compose" open-on="long-press"></helix-headless-speed-dial>`,
    )) as Dial
    await host.updateComplete
    const trigger = part(host, 'trigger') as HTMLElement
    const id = trigger.getAttribute('aria-describedby') ?? ''
    expect(host.shadowRoot?.getElementById(id)?.textContent).toContain('Alt+Down')
  })
})
