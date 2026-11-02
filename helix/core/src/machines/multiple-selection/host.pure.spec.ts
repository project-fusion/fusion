import { afterEach, describe, expect, test } from 'bun:test'
import { fakeOpenLink } from '../../capabilities/open-link/fake.js'
import { setOpenLink } from '../../capabilities/open-link/index.js'
import { serverOpenLink } from '../../capabilities/open-link/server.js'
import { fakeTimers } from '../../capabilities/timers/fake.js'
import type { SelectionMode } from '../../utils/written-list/written-list.js'
import { run } from '../runner.js'
import { choiceHost } from './host.js'
import type { ChoiceContext, ChoiceInput, ChoiceItem } from './machine.js'
import * as choice from './multiple-selection.generated.js'

afterEach(() => {
  setOpenLink(serverOpenLink)
})

const ITEMS: readonly ChoiceItem[] = ['a', 'b', 'c'].map((value) => ({ disabled: false, value }))

/** A set in `mode` with nothing chosen, where a press adds or takes out an item. */
const set = (mode: SelectionMode): ChoiceContext => ({
  anchor: undefined,
  behavior: 'toggle',
  disabledBehavior: 'all',
  mode,
  reached: undefined,
  value: '',
})

/**
 * Runs multiple selection over three items, with `links` naming the items
 * that have one, a fake for open-link, and a platform that accepts each
 * change where `accepts`. `send` names the item an event is about, as the
 * family does, and `heard` keeps each call to the family, in order: the item
 * an action is from comes from the event that caused it.
 */
const choose = (context: ChoiceContext, links: Record<string, string> = {}, accepts = true) => {
  const opened = fakeOpenLink()
  setOpenLink(opened)
  const asked: string[] = []
  const heard: string[] = []
  const runner = run(
    choice,
    context,
    choiceHost({
      act: (value) => heard.push(`action from ${value}`),
      change: (value) => heard.push(`change to "${value}"`),
      link: (value) => links[value] ?? null,
    }),
    {
      ask: (events) => {
        asked.push(...events)
        return accepts
      },
      timers: fakeTimers(),
    },
  )
  const send = (event: number, value: string): void => {
    const item = { disabled: false, value }
    const input: ChoiceInput = { extend: false, from: undefined, item, items: ITEMS, toggle: false }
    runner.send(event, input)
  }
  return { asked, heard, opened, runner, send }
}

describe('choiceHost', () => {
  test('tells the consumer each value a press leaves, in the order the items stand', () => {
    const { asked, heard, send } = choose(set('multiple'))
    send(choice.EVENT_PRESS, 'b')
    send(choice.EVENT_PRESS, 'a')
    expect(asked).toEqual(['change', 'change'])
    expect(heard).toEqual(['change to "b"', 'change to "a,b"'])
  })

  test('tells the consumer nothing where a listener refuses the change', () => {
    const { asked, heard, runner, send } = choose(set('multiple'), {}, false)
    send(choice.EVENT_SPACE, 'b')
    expect(asked).toEqual(['change'])
    expect(heard).toEqual([])
    expect(runner.context().value).toBe('')
  })

  test('tells the consumer every item for Control or Command with A, and none for Escape', () => {
    const { heard, send } = choose(set('multiple'))
    send(choice.EVENT_ALL, 'a')
    send(choice.EVENT_CLEAR, 'a')
    expect(heard).toEqual(['change to "a,b,c"', 'change to ""'])
  })

  test('follows the link of the item Enter acts on, through the open-link capability', () => {
    const { heard, opened, send } = choose(set('multiple'), { b: '/inbox/b' })
    send(choice.EVENT_ENTER, 'b')
    expect(opened.opened).toEqual(['/inbox/b'])
    expect(heard).toEqual([])
  })

  test('acts on each item pressed in a set that chooses nothing, by its link where it has one', () => {
    const { asked, heard, opened, send } = choose(set('none'), { b: '/inbox/b' })
    send(choice.EVENT_PRESS, 'a')
    send(choice.EVENT_PRESS, 'b')
    expect(asked).toEqual([])
    expect(heard).toEqual(['action from a'])
    expect(opened.opened).toEqual(['/inbox/b'])
  })

  test('acts on nothing and tells the consumer nothing once stopped', () => {
    const { asked, heard, opened, runner, send } = choose(set('multiple'), { b: '/inbox/b' })
    runner.stop()
    send(choice.EVENT_PRESS, 'a')
    send(choice.EVENT_ENTER, 'b')
    send(choice.EVENT_ALL, 'a')
    expect(asked).toEqual([])
    expect(heard).toEqual([])
    expect(opened.opened).toEqual([])
  })
})
