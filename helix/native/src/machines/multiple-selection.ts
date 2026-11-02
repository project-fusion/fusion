import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { choiceHost } from '@fusion.dev/helix-core/machines/multiple-selection/host'
import type {
  ChoiceBehavior,
  ChoiceContext,
  ChoiceInput,
  ChoiceItem,
} from '@fusion.dev/helix-core/machines/multiple-selection/machine'
import * as choice from '@fusion.dev/helix-core/machines/multiple-selection/multiple-selection.generated'
import { useCallback, useLayoutEffect, useRef } from 'react'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { Family } from '../style/form'
import type { Member } from './collection'
import { boundTo, camel, given, senderOf, tell } from './props'
import { ownKeys } from './set-role'
import { useMachine } from './use-machine'

/** What a set that chooses many gives its items and its drawing. */
export interface Choosing {
  /**
   * Tells the set a key moved focus onto the item with this value from the
   * item `from`: under `replace` it chooses the item, and with Shift it
   * takes in the items from the last one pressed.
   */
  readonly arrive: (value: string, from: string, press: KeyPress) => void
  /** Asks to press the item with this value, as a tap on it does. */
  readonly choose: (value: string) => void
  /** Whether the item with this value is chosen. */
  readonly chosen: (value: string) => boolean
  /**
   * Takes the value of an item the page removed out of the chosen values,
   * where no item `left` stands for it, and tells the change without asking,
   * as a tag group does once a selected tag is removed.
   */
  readonly prune: (removed: string, left: readonly string[]) => void
  /**
   * Hands the set a key pressed on the item with this value, and answers
   * whether the set took it: Space, Enter, Escape, or Control or Command
   * with A.
   */
  readonly key: (from: string, press: KeyPress) => boolean
  /**
   * Whether a disabled item is pressed, acted on, and reached by the keys,
   * and kept out of the choice alone: `disabled-behavior="selection"`.
   */
  readonly reachesDisabled: boolean
  /** The values chosen now, as the set's value prop holds them. */
  readonly value: string
}

type Mode = ChoiceContext['mode']

const itemOf = (member: Member): ChoiceItem => ({ disabled: member.disabled, value: member.value })

const asMode = (value: unknown): Mode =>
  value === 'single' || value === 'multiple' || value === 'none' ? value : 'none'

/** The values of a list written with commas, trimmed, with the empty ones dropped. */
const valuesIn = (value: string): string[] =>
  value
    .split(',')
    .map((one) => one.trim())
    .filter((one) => one !== '')

/**
 * The values `next` holds, written as the web's Button Group writes its
 * pressed values: those `was` held in the order they were pressed, then the
 * values pressed since, separated by `comma`, a comma and a space where it is
 * left out, as `"bold, italic"`. A tag group writes its own with a bare
 * comma, as `"late,open"`.
 */
export const pressedOrder = (was: string, next: string, comma = ', '): string => {
  const before = valuesIn(was)
  const after = valuesIn(next)
  return [
    ...before.filter((one) => after.includes(one)),
    ...after.filter((one) => !before.includes(one)),
  ].join(comma)
}

/**
 * Whether the key is Control or Command with Space where the set leaves it
 * alone: where `keys.adds` says `replace`, outside `replace` in a set that
 * chooses many.
 */
const addsNothing = (press: KeyPress, context: ChoiceContext, underReplace: boolean): boolean =>
  underReplace &&
  press.key === ' ' &&
  (press.control || press.meta) &&
  !(context.behavior === 'replace' && context.mode === 'multiple')

/**
 * The event a key pressed on an item sends, where the web list takes the
 * key, or `undefined` where it leaves the key alone. Control or Command with
 * A chooses every item in a set that chooses many, and Escape lets go where
 * something is chosen, with Control or Command held too unless `plain` says
 * Escape lets go only without them, as a tag group's does. Enter acts
 * without Control or Command, and Space presses.
 */
const eventOfKey = (
  press: KeyPress,
  context: ChoiceContext,
  plain: boolean,
): number | undefined => {
  const toggle = press.control || press.meta
  if (toggle && press.key.toLowerCase() === 'a' && context.mode === 'multiple') {
    return choice.EVENT_ALL
  }
  if (press.key === 'Escape') {
    const lets = context.mode !== 'none' && context.value !== '' && !(plain && toggle)
    return lets ? choice.EVENT_CLEAR : undefined
  }
  if (press.key === 'Enter') {
    return toggle ? undefined : choice.EVENT_ENTER
  }
  return press.key === ' ' ? choice.EVENT_SPACE : undefined
}

/** What a key taken to send nothing answers: the platform does nothing else with it either. */
const QUIET = -1

/**
 * What a key on an item does: the event it sends, `QUIET` where the set takes
 * it and sends nothing, or `undefined` where the set leaves it alone. A set
 * whose items press on their own leaves every key, and Control or Command
 * with Space that adds nothing is taken, so the platform does not press the
 * item with it: the web's tag is a grid cell, which Space presses nothing on.
 */
const answerOf = (
  press: KeyPress,
  context: ChoiceContext,
  how: {
    readonly adds: boolean
    readonly enterSelects: boolean
    readonly linked: boolean
    readonly own: boolean
    readonly plain: boolean
  },
): number | undefined => {
  if (how.own) {
    return undefined
  }
  if (addsNothing(press, context, how.adds)) {
    return QUIET
  }
  const keyed = eventOfKey(press, context, how.plain)
  return keyed === choice.EVENT_ENTER && how.enterSelects && !how.linked
    ? choice.EVENT_SPACE
    : keyed
}

/**
 * Hosts multiple selection on a set, as the expansion binds it: the prop that
 * holds the chosen values, the selection mode and behavior, and the events a
 * change sends.
 *
 * **A press does what the set's mode says.** Under `single` it chooses the
 * item alone, under `multiple` it adds or takes out the item as the behavior
 * says, and under `none` it acts on the item: it follows the item's link, or
 * tells the item and then the set, as `action` bubbles on the web.
 *
 * **A set with no selection mode is one a reader only reads**, and its
 * presses and keys send the machine nothing, as the web list's do.
 *
 * **The keys pressed on an item go to the machine as the web list sends
 * them**, through the keys capability: Space presses the item, with Shift
 * selecting a range in place of the last one and Control or Command adding
 * or taking out one item,
 * Enter acts on it, Escape lets go of every chosen item, and Control or
 * Command with A chooses every item. **Where the form's `keys.adds` says
 * `replace`, Control or Command with Space adds or takes out an item only
 * under `replace` in a set that chooses many**, as a tag group's does, and
 * elsewhere is taken and does nothing. **Where the form's `keys.enter` says
 * `selects`, Enter on an item that is no link presses it as Space does**,
 * as a tag group's does, and follows the link of one that is. **Where
 * `keys.escape` says `plain`, Escape with Control or Command held is left
 * alone**, as a tag group's is. A key with Alt held, and a key pressed
 * on an item out of reach, are left alone. A touch carries no modifier keys,
 * so a tap never takes in a range.
 *
 * **A written value, mode, or behavior takes the machine there with nothing
 * sent**, as a script writing the web element's properties does.
 *
 * **A set whose items press on their own takes no key**, where its form's
 * keys do not select, as a button group's buttons take Space and Enter as
 * their own press, which chooses them as a tap does. **An item with no value
 * names nothing in the value**, so a press on it changes nothing, and a set
 * that keeps one chosen, where the prop its `keeps` names holds, refuses a
 * press that would leave none, before it asks.
 */
export const useMultipleSelection = (
  family: Family,
  props: Props,
  use: MachineUse,
  members: readonly Member[],
): Choosing => {
  const valueProp = boundTo(use, 'chosen', 'prop')
  const before = boundTo(use, 'before', 'event')
  const after = boundTo(use, 'after', 'event')
  const keeps = given(family, props, boundTo(use, 'keeps', 'prop')) === true
  const own = ownKeys(family)
  const enterSelects = family.api?.collection?.keys.enter === 'selects'
  const addsUnderReplace = family.api?.collection?.keys.adds === 'replace'
  const plain = family.api?.collection?.keys.escape === 'plain'
  const written = valueProp === undefined ? undefined : props[camel(valueProp)]
  const value = typeof written === 'string' ? written : ''
  const named = given(family, props, boundTo(use, 'mode', 'prop'))
  const reads = named === undefined
  const mode = asMode(named)
  const behavior: ChoiceBehavior =
    given(family, props, boundTo(use, 'behavior', 'prop')) === 'replace' ? 'replace' : 'toggle'
  const disabledBehavior =
    given(family, props, 'disabled-behavior') === 'selection' ? 'selection' : 'all'
  const seed: ChoiceContext = {
    anchor: undefined,
    behavior,
    disabledBehavior,
    mode,
    reached: undefined,
    value,
  }
  const latest = useRef({ keeps, members, props, reads })
  latest.current = { keeps, members, props, reads }
  /* **A set whose items press on their own writes its values as the web's
     Button Group does**, in the order they were pressed, with a comma and a
     space, where the machine holds them in the order the items stand.
     **A set whose form says `order: 'pressed'` writes the values a press
     changes in that order too**, with a bare comma, as the web's Tag Group
     does, and those a range or Control or Command with A chooses in the
     order the items stand. `shown` is the value as the set last wrote it,
     and `pressing` whether the event on its way to the machine is a press,
     Space, or Enter without Shift. */
  const presses = boundTo(use, 'presses', 'prop') !== undefined
  const ordered = presses || family.api?.collection?.order === 'pressed'
  const shown = useRef(value)
  const pressing = useRef(false)
  const writtenAs = (was: string, next: string): string =>
    presses || (ordered && pressing.current) ? pressedOrder(was, next, presses ? ', ' : ',') : next
  const machine = useMachine<ChoiceContext, ChoiceInput, 'act' | 'announce'>(
    choice,
    seed,
    choiceHost({
      act: (acted) => {
        latest.current.members.find((member) => member.value === acted)?.act?.()
        tell(family, latest.current.props, 'action', {}, { value: acted })
      },
      change: (changed) => {
        shown.current = writtenAs(shown.current, changed)
        if (after !== undefined) {
          const now = shown.current
          tell(family, latest.current.props, after, { value: now }, senderOf(family, now))
        }
      },
      link: (linked) =>
        latest.current.members.find((member) => member.value === linked)?.link ?? null,
    }),
    (_events, proposed, current) =>
      !(latest.current.keeps && proposed.value === '') &&
      (before === undefined ||
        tell(
          family,
          latest.current.props,
          before,
          { value: writtenAs(shown.current, proposed.value) },
          senderOf(family, ordered ? shown.current : current.value),
        )),
  )
  const { context, reseat, send } = machine
  const now = useRef(context)
  now.current = context
  useLayoutEffect(() => {
    if (written !== undefined) {
      shown.current = value
    }
    const was = now.current
    const next: ChoiceContext = {
      ...was,
      behavior,
      disabledBehavior,
      mode,
      value: written === undefined ? was.value : value,
    }
    if (
      next.behavior !== was.behavior ||
      next.disabledBehavior !== was.disabledBehavior ||
      next.mode !== was.mode ||
      next.value !== was.value
    ) {
      reseat(next)
    }
  }, [behavior, disabledBehavior, mode, reseat, value, written])
  /* What an event names: the item with this value and every item a press
     chooses, or `undefined` where the set only reads or has no such item. */
  const itemsFor = useCallback((value: string) => {
    if (latest.current.reads || value === '') {
      return undefined
    }
    const items = latest.current.members.filter((member) => member.chooses).map(itemOf)
    const item = items.find((one) => one.value === value)
    return item === undefined ? undefined : { item, items }
  }, [])
  const choose = useCallback(
    (pressed: string) => {
      const named = itemsFor(pressed)
      if (named !== undefined) {
        pressing.current = true
        send(choice.EVENT_PRESS, { ...named, extend: false, from: undefined, toggle: false })
      }
    },
    [itemsFor, send],
  )
  const arrive = useCallback(
    (value: string, from: string, press: KeyPress) => {
      const named = itemsFor(value)
      if (named !== undefined) {
        const toggle = press.control || press.meta
        pressing.current = false
        send(choice.EVENT_ARRIVE, { ...named, extend: press.shift, from, toggle })
      }
    },
    [itemsFor, send],
  )
  const key = useCallback(
    (from: string, press: KeyPress): boolean => {
      const named = itemsFor(from)
      const current = now.current
      const blocked = named?.item.disabled === true && current.disabledBehavior !== 'selection'
      const linked = latest.current.members.some((one) => one.value === from && one.link)
      const how = { adds: addsUnderReplace, enterSelects, linked, own, plain }
      const event = answerOf(press, current, how)
      if (named === undefined || blocked || press.alt || press.claimed || event === undefined) {
        return false
      }
      if (event !== QUIET) {
        const toggle = press.control || press.meta
        pressing.current =
          !press.shift && (event === choice.EVENT_SPACE || event === choice.EVENT_ENTER)
        send(event, { ...named, extend: press.shift, from: undefined, toggle })
      }
      return true
    },
    [addsUnderReplace, enterSelects, itemsFor, own, plain, send],
  )
  /* An empty value chooses nothing, so items with no value of their own,
     as the rows of a log, are not chosen by it. */
  const chosen = (candidate: string): boolean => valuesIn(context.value).includes(candidate)
  /* From the value as the set last wrote it where it writes the order of
     its presses, as the web's Tag Group takes a removed tag out of `value`
     and leaves the rest as they were. */
  const prune = useCallback(
    (removed: string, left: readonly string[]) => {
      const was = now.current
      const from = valuesIn(ordered ? shown.current : was.value)
      const next = from.filter((one) => one !== removed || left.includes(one)).join(',')
      if (next === from.join(',')) {
        return
      }
      reseat({ ...was, value: next })
      shown.current = next
      if (after !== undefined) {
        tell(family, latest.current.props, after, { value: next }, senderOf(family, next))
      }
    },
    [after, family, ordered, reseat],
  )
  return {
    arrive,
    choose,
    chosen,
    key,
    prune,
    reachesDisabled: disabledBehavior === 'selection',
    value: context.value,
  }
}
