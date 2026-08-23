import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'
import {
  KeyboardNavigationController,
  type KeyboardNavigationOptions,
  type NavigableItem,
} from './keyboard-navigation-controller.js'

/**
 * Moving through a set with the arrow keys, and choosing as it goes.
 *
 * **Moving and choosing are one act here, not two.** That is the radio group
 * pattern and the difference from a listbox: moving focus without choosing
 * leaves a keyboard reader sitting on an item they have not selected, with
 * nothing on screen saying which of the two is true. A pointer user chooses by
 * arriving, so a keyboard user does too.
 *
 * **Both axes, always.** A vertical set answers left and right, a horizontal one
 * answers up and down, and `orientation` is presentation: the same set of
 * choices reads the same way whichever direction it runs. A reader who guesses
 * the wrong axis and gets nothing concludes the set does not answer the
 * keyboard at all.
 *
 * Three families mix this in, and it exists because two of them had it
 * identically, down to the order of the branches. The third had diverged, which
 * is what `origin` and `selects` are.
 */
beforeAll(() => {
  registerDom()
})

interface Item extends NavigableItem {
  /** Which of the two things it was asked, in order. */
  log: string[]
  name: string
}

const set = (
  spec: string,
  options: Omit<KeyboardNavigationOptions, 'items'> = {},
): { asked: string[]; host: HTMLElement; items: Item[] } => {
  document.body.innerHTML = '<div id="host"><span id="stranger"></span></div>'
  const host = document.getElementById('host') as HTMLElement
  Object.assign(host, { addController: () => {} })
  const asked: string[] = []
  /* `a` plain, `A` selected, `-` disabled. Each item is a real element in the
     host, so `contains` is `Node.contains` rather than something written here:
     `origin: 'focus'` reads it against the press's own target. */
  const items = [...spec].map((mark, index): Item => {
    const node = document.createElement('button')
    node.id = `item-${index}`
    host.append(node)
    return Object.assign(node, {
      disabled: mark === '-',
      focusItem() {
        asked.push(`focus ${this.name}`)
      },
      log: [],
      name: `item-${index}`,
      select() {
        asked.push(`select ${this.name}`)
      },
      selected: mark === 'A',
    }) as unknown as Item
  })
  new KeyboardNavigationController(host as never, {
    items: () => items,
    ...options,
  }).hostConnected()
  return { asked, host, items }
}

/** A press, from an item unless somewhere else is named. */
const press = (host: HTMLElement, key: string, from?: string): boolean => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key })
  const target = from === undefined ? host : (document.getElementById(from) as HTMLElement)
  target.dispatchEvent(event)
  return event.defaultPrevented
}

describe('moving forward', () => {
  test('is Down as well as Right, whichever way the set is laid out', () => {
    for (const key of ['ArrowDown', 'ArrowRight']) {
      const { asked, host } = set('aAa')
      press(host, key)
      expect(asked).toEqual(['focus item-2', 'select item-2'])
    }
  })
})

describe('moving backward', () => {
  test('is Up as well as Left', () => {
    for (const key of ['ArrowUp', 'ArrowLeft']) {
      const { asked, host } = set('aAa')
      press(host, key)
      expect(asked).toEqual(['focus item-0', 'select item-0'])
    }
  })
})

describe('the two ends', () => {
  test('are Home and End, wherever the reader is', () => {
    const { asked, host } = set('aAa')
    press(host, 'Home')
    press(host, 'End')
    expect(asked).toEqual(['focus item-0', 'select item-0', 'focus item-2', 'select item-2'])
  })

  test('join up, which is what a radio group does', () => {
    const { asked, host } = set('aaA')
    press(host, 'ArrowDown')
    expect(asked).toEqual(['focus item-0', 'select item-0'])
  })

  test('and the other way round', () => {
    const { asked, host } = set('Aaa')
    press(host, 'ArrowUp')
    expect(asked).toEqual(['focus item-2', 'select item-2'])
  })
})

describe('a set whose ends do not join up', () => {
  test('stays on the last item rather than starting over', () => {
    const { asked, host } = set('aaA', { wrap: false })
    press(host, 'ArrowDown')
    expect(asked).toEqual(['focus item-2', 'select item-2'])
  })

  /* The same answer at the other end, which it did not give: forward clamps
     with `Math.min` and backward did not clamp at all, so `items[-1]` was
     undefined, nothing was focused or chosen, and the key had already been
     swallowed by `preventDefault`. A reader holding Left on the first star of a
     rating got silence where holding Right on the last one holds its ground. */
  test('and on the first, rather than swallowing the press and doing nothing', () => {
    const { asked, host } = set('Aaa', { wrap: false })
    press(host, 'ArrowUp')
    expect(asked).toEqual(['focus item-0', 'select item-0'])
  })
})

describe('an item that cannot be reached', () => {
  test('is stepped over, so a set with a gap still moves in one press', () => {
    const { asked, host } = set('A-a')
    press(host, 'ArrowDown')
    expect(asked).toEqual(['focus item-2', 'select item-2'])
  })

  test('and never arrived at from either end', () => {
    const { asked, host } = set('-Aa')
    press(host, 'Home')
    expect(asked).toEqual(['focus item-1', 'select item-1'])
  })
})

describe('a set with nothing chosen in it', () => {
  /* Where a reader entering an unanswered set expects to arrive. The forward
     half falls out of the arithmetic; the backward half did not. */
  test('moves forward onto the first item', () => {
    const { asked, host } = set('aaa')
    press(host, 'ArrowDown')
    expect(asked).toEqual(['focus item-0', 'select item-0'])
  })

  /* `(-1 - 1 + length) % length` is `length - 2`, the *second* to last, so a
     reader arrowing backwards into an unanswered group landed one short of the
     end while the comment beside it said plainly that it lands on the end. */
  test('and backward onto the last, not the one before it', () => {
    const { asked, host } = set('aaa')
    press(host, 'ArrowUp')
    expect(asked).toEqual(['focus item-2', 'select item-2'])
  })
})

describe('a set with nothing in it at all', () => {
  test('is not navigated, and the press is left alone', () => {
    const { asked, host } = set('')
    expect(press(host, 'ArrowDown')).toBe(false)
    expect(asked).toEqual([])
  })

  test('nor one where everything is disabled', () => {
    const { asked, host } = set('--')
    expect(press(host, 'ArrowDown')).toBe(false)
    expect(asked).toEqual([])
  })
})

describe('where a move starts from', () => {
  /* The radio-group reading and the default: the set has one answer, focus is
     always on it, and the two never diverge. */
  test('is the selection by default, so a press from anywhere moves the set', () => {
    const { asked, host } = set('aAa')
    press(host, 'ArrowDown', 'stranger')
    expect(asked).toEqual(['focus item-2', 'select item-2'])
  })

  /* Tabs is the case they diverge: in `manual` mode a reader arrows without
     choosing, so after one press focus is no longer on the selection, and
     starting from the selection walks from the same place every time. */
  test('and is focus where a component asks for that, moving from where they are', () => {
    const { asked, host } = set('Aaa', { origin: 'focus' })
    press(host, 'ArrowDown', 'item-1')
    expect(asked).toEqual(['focus item-2', 'select item-2'])
  })

  /* The listener is on the host, not on the items, and a host can hold more
     than the set: a tab panel is `tabindex="0"`, so an arrow pressed while
     reading a panel used to move the tabs out from under the reader. */
  test('which is also the only reading that can tell a press on an item from one beside it', () => {
    const { asked, host } = set('Aaa', { origin: 'focus' })
    expect(press(host, 'ArrowDown', 'stranger')).toBe(false)
    expect(asked).toEqual([])
  })
})

describe('whether arriving also chooses', () => {
  test('it does, because a pointer user chooses by arriving and so does a reader', () => {
    const { asked, host } = set('aAa')
    press(host, 'ArrowDown')
    expect(asked).toEqual(['focus item-2', 'select item-2'])
  })

  test('unless the component says otherwise, which is what `manual` is', () => {
    const { asked, host } = set('aAa', { selects: () => false })
    press(host, 'ArrowDown')
    expect(asked).toEqual(['focus item-2'])
  })

  /* A function rather than a flag: Tabs takes it from `manual`, which a
     consumer can change at any time, and a value read once in the constructor
     would be the value the element happened to have when it upgraded. */
  test('and it is asked every press rather than read once', () => {
    let manual = true
    const { asked, host } = set('aAa', { selects: () => !manual })
    press(host, 'ArrowDown')
    manual = false
    press(host, 'Home')
    expect(asked).toEqual(['focus item-2', 'focus item-0', 'select item-0'])
  })
})

describe('a key the component has already spoken for', () => {
  /* `Menu` is the case: its rows open a submenu, and the platform's bindings
     for that are the horizontal pair. Those keys are not unhandled in a menu,
     they are claimed, and without this the controller would take them first and
     a submenu could not be opened from the keyboard at all. */
  test('is left for it, rather than taken first', () => {
    const { asked, host } = set('aAa', { reserved: () => ['ArrowRight', 'ArrowLeft'] })
    expect(press(host, 'ArrowRight')).toBe(false)
    expect(asked).toEqual([])
  })

  test('while the axis it did not claim still works', () => {
    const { asked, host } = set('aAa', { reserved: () => ['ArrowRight', 'ArrowLeft'] })
    press(host, 'ArrowDown')
    expect(asked).toEqual(['focus item-2', 'select item-2'])
  })
})

describe('a key that moves nothing here', () => {
  test('is left alone, so the page can still use it', () => {
    const { asked, host } = set('aAa')
    for (const key of ['Enter', ' ', 'Tab', 'a', 'PageDown']) {
      expect(press(host, key)).toBe(false)
    }
    expect(asked).toEqual([])
  })
})

describe('a press the controller handled', () => {
  test('is taken, so the page does not scroll under the reader', () => {
    const { host } = set('aAa')
    expect(press(host, 'ArrowDown')).toBe(true)
  })
})

describe('a host that has left', () => {
  test('stops answering the keyboard', () => {
    document.body.innerHTML = '<div id="host"></div>'
    const host = document.getElementById('host') as HTMLElement
    Object.assign(host, { addController: () => {} })
    const asked: string[] = []
    const item = {
      contains: () => true,
      disabled: false,
      focusItem: () => asked.push('focus'),
      select: () => asked.push('select'),
      selected: true,
    }
    const keys = new KeyboardNavigationController(host as never, { items: () => [item] })
    keys.hostConnected()
    keys.hostDisconnected()
    press(host, 'ArrowDown')
    expect(asked).toEqual([])
  })
})
