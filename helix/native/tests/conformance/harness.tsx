import { clipboard, setClipboard } from '@fusion.dev/helix-core/capabilities/clipboard'
import { fakeClipboard } from '@fusion.dev/helix-core/capabilities/clipboard/fake'
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { setOpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { fakeOpenLink } from '@fusion.dev/helix-core/capabilities/open-link/fake'
import { setTimers, timers } from '@fusion.dev/helix-core/capabilities/timers'
import { fakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import {
  type Intent,
  knownBy,
  moveClock,
  recordedDetail,
  type Scenario,
  type Sent,
  type Setup,
  type Step,
  say,
  usesClock,
} from '@fusion.dev/helix-testing/conformance'
import { act, fireEvent, render } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import { cloneElement } from 'react'
import { Text } from 'react-native'
import { FieldsetDisabled, HelixRoot } from '../../src/index'
import type { HelixEvent } from '../../src/machines/props'
import { camel, handlerOf } from '../../src/machines/props'
import { colors, opensPicker, pointIn, pressSwatch, turnPicker } from './color'
import { fakePicker, pickIn, picksFiles } from './files'
import { DRAWN, formOf, isElement } from './forms'
import { key, move, scroll, tap } from './input'
import { inspectorRows, inspects, rowNode } from './inspector'
import { dismissIn, PAGE } from './layers'
import { expanded, leftBy } from './left'
import { adjustBy, rangeFocus, ranges, scrubLabel, slideTo } from './range'
import { laySections } from './sections'
import { focusField, leave, pressBox, typeInto } from './text'
import { focusable, linkOf, partPressOf, pressOf, type Run, triggerOf, wordsOf } from './views'
import { rowDisabled, rowWords } from './window'

/*
 * The React Native half of the conformance suite: draws a scenario's setup
 * with the generated components inside `HelixRoot`, performs each intent
 * through React Native Testing Library and the fakes of the keys, focus,
 * and open-link capabilities, and records what each intent did.
 *
 * **A key goes where focus is, as the native module sends it.** One the
 * components leave alone, Enter or Space, activates the view with focus, as
 * the platform does for a screen reader or Full Keyboard Access: its
 * `onPress`, with no finger down.
 *
 * **A move adjusts the grip a screen reader is on**, so focus is on the
 * item first, where the web's keys leave it after the same move.
 *
 * **The page listens on every element**, and records an event once: at the
 * element that holds the items where it hears the event from its items, as
 * a tab set hears a tab's `before-select`, since that is where a refusal is heard,
 * and at the element that sent it otherwise. **A page that removes items
 * draws the setup again without the item** once the intent has run, as an
 * app's list drops a tag on its `dismiss`.
 */

/** Why a harness cannot perform an intent, where it cannot. */
const CANNOT = {
  drag: 'A pan moves a row by the boxes the rows were laid out in, and Jest lays out none.',
  held: 'A touch carries no modifier keys.',
} as const

/** The events an element's form says it sends. */
const eventsOf = (tag: string): readonly string[] =>
  isElement(tag) ? (formOf(tag).api?.events ?? []).map((event) => event.name) : []

/** The item an event the element hears after it came from, where its handler heard it first. */
const relays = new WeakMap<object, string>()

/** Keeps which item an event came from, where the item's handler hears it before the element's. */
const relay = (event: HelixEvent, value: string | null): void => {
  if (value !== null) {
    relays.set(event, value)
  }
}

/** The item an event the element hears came from: the value it carries, or the item that relayed it. */
const senderOf = (event: HelixEvent): string | null =>
  (event.target as { readonly value?: string }).value ?? relays.get(event) ?? null

/**
 * The handler for one event of one element: it refuses what the page
 * refuses, and records the event where the page hears it. The element that
 * holds the items records every event it sends, naming the item an event it
 * hears from its items came from. An item records the events that element
 * does not hear from it, its own `change` among them where the set
 * announces a `change` of its own, as a checkbox group does.
 */
const hearing = (run: Run, name: string, value: string | null) => {
  const { setup: root } = run.scenario
  const rootSends = eventsOf(root.tag).includes(name)
  /* The set's own announcements come from the set, though an item sends an
     event of the same name on its own, as a toggle group's `change` and a
     toggle's do. */
  const collection = formOf(root.tag).api?.collection
  const announces = [collection?.before, ...[collection?.after ?? []].flat()].includes(name)
  const typed =
    formOf(root.tag).api?.entry !== undefined ||
    ranges(root.tag) ||
    picksFiles(root.tag) ||
    colors(root.tag)
  const relayed =
    rootSends &&
    !announces &&
    (root.children ?? []).some(
      (child) => typeof child !== 'string' && eventsOf(child.tag).includes(name),
    )
  return (event: HelixEvent) => {
    if (run.refused.has(name) && (value === null || !rootSends)) {
      event.preventDefault()
    }
    /* `input` is left out, as the web half leaves it out: it records the
       events an element sends as `helix-` events and `change`, and an
       element's `input` is the composed one its own `<input>` sends. **An
       element a reader types into or moves sends its own `input` on each
       edit or move**, which both halves record. An item whose event the element hears after it, as
       a toast's message, says which item sent it, where the event carries no
       value. */
    if (
      (value !== null && relayed) ||
      (name === 'input' && !typed) ||
      name === 'load-more' ||
      name === 'range-change'
    ) {
      relay(event, value)
      return
    }
    record(run, event, name, value ?? (relayed ? senderOf(event) : null))
  }
}

/** Records an event where the page hears it, and where the page removes the item that sent it. */
const record = (run: Run, event: HelixEvent, name: string, from: string | null): void => {
  run.heard.push({ event, sent: { detail: recordedDetail({ ...event.detail }), from, name } })
  if (run.removes.has(name)) {
    run.leaving.push({ event, from })
  }
}

/** A setup's props as its component takes them, with a handler for every event its form sends. */
const propsOf = (run: Run, setup: Setup, value: string | null): Record<string, unknown> => {
  const props: Record<string, unknown> = {}
  const written = { ...setup.props, ...run.sets.get(value) }
  for (const [name, given] of Object.entries(written)) {
    if (given !== false) {
      props[camel(name)] = given
    }
  }
  for (const name of eventsOf(setup.tag)) {
    props[handlerOf(name)] = hearing(run, name, value)
  }
  return props
}

/** Whether the page has removed the item a setup's child draws. */
const gone = (run: Run, child: Setup | string): boolean =>
  typeof child !== 'string' && run.removed.has(String(knownBy(child)))

/** A plain element a setup passes in, as its words: a `<span>` passed into a section's `summary`. */
const plain = (setup: Setup): ReactElement => {
  const words = (setup.children ?? []).filter((one) => typeof one === 'string').join(' ')
  return <Text key={words}>{words}</Text>
}

/** What a setup's child draws: its words, a plain element, or a Helix element. */
const drawChild = (run: Run, child: Setup | string): ReactElement | string => {
  if (typeof child === 'string') {
    return child
  }
  /* An element with no value is heard as the web hears it, from `''`, and
     one with an `href` and no value from its `href`, as a destination. */
  const value = knownBy(child) ?? ''
  return isElement(child.tag) ? draw(run, child, value) : plain(child)
}

/**
 * The element a setup draws: its default region as children, and each named
 * region as a prop. A plain element is its words.
 */
const draw = (run: Run, setup: Setup, value: string | null): ReactElement => {
  const drawn = DRAWN.get(setup.tag)
  if (drawn === undefined) {
    throw new Error(`conformance: no generated component draws <${setup.tag}>`)
  }
  const props = propsOf(run, setup, value)
  if (setup.items !== undefined) {
    props.items = setup.items
  }
  if (setup.value !== undefined) {
    props.value = setup.value
  }
  const children: (ReactElement | string)[] = []
  for (const child of (setup.children ?? []).filter((one) => !gone(run, one))) {
    const made = drawChild(run, child)
    if (typeof child === 'string' || child.slot === undefined) {
      children.push(made)
    } else if (child.slot === 'children') {
      /* A region named `children` stands among `children`, which no prop can name apart. */
      children.push(cloneElement(made as ReactElement<{ slot?: string }>, { slot: 'children' }))
    } else {
      const region = camel(child.slot)
      props[region] = [...((props[region] as ReactElement[] | undefined) ?? []), made]
    }
  }
  const { Component } = drawn
  return (
    <Component key={String(knownBy(setup) ?? setup.props?.anchor ?? setup.tag)} {...props}>
      {children}
    </Component>
  )
}

/** Lets what an intent started settle: effects, and the timeouts a press leaves behind. */
const flush = async (): Promise<void> => {
  for (let round = 0; round < 2; round += 1) {
    await act(() => new Promise<void>((done) => setTimeout(done, 0)))
  }
}

/** A press on an item, a part of it, or a link an outline draws, or why it cannot be made. */
const press = async (
  setup: Setup,
  intent: Extract<Intent, { kind: 'press' }>,
): Promise<string | undefined> => {
  if (intent.link !== undefined) {
    await tap(linkOf(setup, intent.link))
    return undefined
  }
  if (Object.values(intent.held ?? {}).some((held) => held === true)) {
    return CANNOT.held
  }
  if (intent.row !== undefined && setup.items === undefined) {
    const row = inspectorRows()[intent.row]
    if (row !== undefined) {
      await tap(row)
    }
    return undefined
  }
  if (intent.row !== undefined && rowDisabled(setup, intent.row)) {
    return undefined
  }
  const words = intent.row === undefined ? wordsOf(setup, intent.item) : rowWords(setup, intent.row)
  /* A part of the item is the press drawn inside the item's own, or
     beside its words. */
  const inner = intent.part === undefined ? pressOf(words) : partPressOf(words, intent.part)
  if (inner === undefined) {
    return `The item draws no press inside its own for its ${intent.part} part.`
  }
  await tap(inner)
  return undefined
}

/**
 * A finger held on a part of the element while the fake clock moves, then
 * lifted: its press-in, the clock, then its press-out and press, as React
 * Native reports a long touch. A disabled press hears none of them.
 */
const holdOn = async (
  run: Run,
  intent: Extract<Intent, { kind: 'hold' }>,
): Promise<string | undefined> => {
  const part = partPressOf(wordsOf(run.scenario.setup, undefined), intent.part)
  if (part === undefined) {
    return `The element draws no press for its ${intent.part} part.`
  }
  if (part.props.accessibilityState?.disabled === true) {
    await act(() => {
      moveClock(run.clock, { kind: 'wait', ms: intent.ms })
    })
    return undefined
  }
  const nativeEvent = { locationX: 0, locationY: 0, pageX: 0, pageY: 0, timestamp: 0 }
  await fireEvent(part, 'pressIn', { nativeEvent })
  let cannot: string | undefined
  await act(() => {
    cannot = moveClock(run.clock, { kind: 'wait', ms: intent.ms })
  })
  await fireEvent(part, 'pressOut', { nativeEvent })
  await fireEvent.press(part, { nativeEvent })
  return cannot
}

/** Whether the element is a range a reader types into, as a number input. */
const typed = (tag: string): boolean => formOf(tag).api?.entry !== undefined

/**
 * Puts focus where a `focus` intent says: on the page, on an item, on a
 * range's control, which its label names, or in the field of a number a
 * reader types, as a tap does.
 */
const focusOn = async (run: Run, intent: Extract<Intent, { kind: 'focus' }>): Promise<void> => {
  const { setup } = run.scenario
  if (intent.row !== undefined && inspects(run)) {
    const row = inspectorRows()[intent.row]
    run.focus.place(rowNode(run, row))
    if (row !== undefined) {
      await fireEvent(row, 'focus')
    }
    return
  }
  if (intent.row !== undefined) {
    run.focus.place(focusable(run, rowWords(setup, intent.row)))
    return
  }
  if (intent.page !== true && intent.item === undefined && typed(setup.tag)) {
    await focusField(run)
    return
  }
  run.focus.place(
    intent.page === true
      ? PAGE
      : intent.item === undefined && (ranges(setup.tag) || colors(setup.tag))
        ? rangeFocus(run)
        : focusable(run, wordsOf(setup, intent.item)),
  )
}

/** Performs one intent, or says why it cannot. */
const perform = async (run: Run, intent: Intent): Promise<string | undefined> => {
  const { setup } = run.scenario
  switch (intent.kind) {
    case 'dismiss':
      return dismissIn(run, intent.by)
    case 'drag':
      return CANNOT.drag
    case 'focus':
      await focusOn(run, intent)
      return undefined
    case 'key':
      await key(run, intent)
      return undefined
    case 'type':
      return typeInto(run, intent)
    case 'leave':
      return leave(run)
    case 'slide':
      return slideTo(run, intent)
    case 'adjust':
      return adjustBy(intent)
    case 'hold':
      return holdOn(run, intent)
    case 'pick':
      return pickIn(run, intent)
    case 'point':
      return pointIn(intent)
    case 'box':
      return pressBox(run, intent.at)
    case 'scrub':
      return scrubLabel(run, intent.by)
    case 'open':
    case 'close': {
      if (opensPicker(setup.tag)) {
        return turnPicker(run, intent)
      }
      const words = wordsOf(setup, intent.item)
      if (expanded(words) !== (intent.kind === 'open')) {
        await tap(triggerOf(words))
      }
      return undefined
    }
    case 'set': {
      const at = intent.item ?? null
      run.sets.set(at, { ...run.sets.get(at), [intent.prop]: intent.value })
      return undefined
    }
    case 'move':
      return move(run, intent)
    case 'scroll':
      return scroll(intent)
    case 'hide':
    case 'show':
    case 'wait': {
      let cannot: string | undefined
      await act(() => {
        cannot = moveClock(run.clock, intent)
      })
      return cannot
    }
    case 'press':
      return colors(setup.tag) && intent.part === 'swatch' ? pressSwatch() : press(setup, intent)
    case 'refuse':
      run.refused.add(intent.event)
      return undefined
    case 'remove':
      run.removes.add(intent.event)
      return undefined
  }
}

/**
 * Draws a scenario's setup inside `HelixRoot`, performs each intent, and
 * returns what each one did. The capabilities are fakes set before the
 * setup draws, which `HelixRoot` leaves alone once it has installed its own.
 */
export const run = async (scenario: Scenario): Promise<Step[]> => {
  const keys = fakeKeys<unknown>()
  const listening: unknown[] = []
  const state: Run = {
    clock: usesClock(scenario) ? fakeTimers() : undefined,
    focus: fakeFocus<unknown>(),
    heard: [],
    keys: {
      ...keys,
      listen: (node, heard) => {
        listening.push(node)
        return keys.listen(node, heard)
      },
    },
    leaving: [],
    listening,
    opened: fakeOpenLink(),
    refused: new Set(),
    removed: new Set(),
    removes: new Set(),
    scenario,
    sets: new Map(),
  }
  setKeys(state.keys)
  setFocus(state.focus)
  setOpenLink(state.opened)
  /* A fake picker answers the files an element picks, as the web half answers its file input. */
  fakePicker()
  const before = timers()
  if (state.clock !== undefined) {
    setTimers(state.clock)
  }
  /* A fake clipboard takes the copies of an element that copies, as the web
     half's does. */
  const copiedBefore = clipboard()
  const copies = isElement(scenario.setup.tag) ? formOf(scenario.setup.tag).api : undefined
  if (copies?.copy !== undefined || copies?.inspector !== undefined) {
    setClipboard(fakeClipboard())
  }
  const laid = laySections(scenario.setup)
  const page = () => (
    <HelixRoot>
      <FieldsetDisabled.Provider value={scenario.disabledFieldset === true}>
        {draw(state, scenario.setup, null)}
      </FieldsetDisabled.Provider>
    </HelixRoot>
  )
  const drawn = await render(page())
  await laid.drawn()
  /* The page takes out each item whose event it heard and nothing refused. */
  const removing = async (): Promise<void> => {
    const gone = state.leaving.filter((one) => !one.event.defaultPrevented && one.from !== null)
    state.leaving.length = 0
    if (gone.length > 0) {
      for (const one of gone) {
        state.removed.add(String(one.from))
      }
      await drawn.rerender(page())
      await flush()
    }
  }
  const steps: Step[] = []
  try {
    await flush()
    for (const intent of scenario.intents) {
      state.heard.length = 0
      const opened = state.opened.opened.length
      const cannot = await perform(state, intent)
      /* A prop the page wrote draws the setup again with it. */
      if (intent.kind === 'set') {
        await drawn.rerender(page())
      }
      await flush()
      await removing()
      if (cannot !== undefined) {
        steps.push({ cannot, intent: say(intent) })
        continue
      }
      const events: Sent[] = state.heard.map(({ event, sent }) => ({
        ...sent,
        canceled: event.defaultPrevented,
      }))
      steps.push({ events, intent: say(intent), left: leftBy(state, opened) })
    }
  } finally {
    await drawn.unmount()
    laid.undo()
    setTimers(before)
    setClipboard(copiedBefore)
  }
  return steps
}
