/**
 * An option on a phone, a group of them, and a rule between runs. **An option
 * joins whichever owner stands around it through one context**, so Listbox,
 * Select, Combobox, Command, and Time Picker each hold their options the same way:
 * an owner provides `OptionOwner`, and reads each option's latest from `join`.
 *
 * The web's owners walk their children. A phone has no document to walk, so each
 * option tells its owner what it is, in the order the page wrote them.
 */
import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { openLink } from '@fusion.dev/helix-core/capabilities/open-link'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import {
  Children,
  createContext,
  isValidElement,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, PartBinding, Props } from '../render/behavior'
import { carryIntoLayers } from '../render/carry'
import { Held } from '../render/windowed'
import type { Family } from '../style/form'
import { boundTo, given, senderOf, tell } from './props'
import type { WindowDrag } from './window'
import { wordsOf } from './words'

/** What an option tells its owner it is. */
export interface OptionMember {
  /** Whether the page wrote it `selected`, which seeds a list that declares no value. */
  readonly declared: boolean
  readonly disabled: boolean
  /** The group it stands in, where it stands in one. */
  readonly group: object | undefined
  readonly href: string
  readonly key: object
  /** Its view, which the keys and a highlight's scroll read. */
  readonly node: () => unknown
  readonly text: string
  readonly value: string
}

/** What an owner says of an option. */
export interface OptionStanding {
  readonly active: boolean
  /** The state its styles read while it is moved. */
  readonly move: 'dragging' | 'drop-after' | 'drop-before' | undefined
  /** Whether what it holds is left out, as a filter leaves it out. */
  readonly hidden: boolean
  readonly selected: boolean
}

/** What an owner offers the options that join it. */
export interface OptionOwner {
  /** Tells the owner an option's press stood, with Shift or without. */
  readonly choose: (member: OptionMember) => void
  /** Whether the owner is disabled, which every option it holds is too. */
  readonly disabled: boolean
  /** What a finger held on an option drags it through, where the owner lets one move. */
  readonly drag: WindowDrag | undefined
  /** Lifts the option a finger held on, which a drag then moves. */
  readonly lift: ((key: object) => void) | undefined
  /** Whether a filter narrows the list, which a rule between runs goes for. */
  readonly filtering: boolean
  /** Whether a group holds nothing showing, and whether it is not the first. */
  readonly group: (key: object) => { readonly hidden: boolean; readonly later: boolean }
  /** Tells the owner where an option's latest stands, and answers how to let it go. */
  readonly hold: (member: OptionMember) => void
  /** A group tells the owner it stands, and answers how to let it go. */
  readonly holdGroup: (key: object) => () => void
  /** Hands the owner a key pressed on an option, and answers whether it took it. */
  readonly key: (value: string, press: KeyPress) => boolean
  /** Tells the owner an option left. */
  readonly leave: (key: object) => void
  /** Moves an option a place, as a screen reader's action does. */
  readonly move: ((key: object, by: number) => void) | undefined
  /** What the owner says of the option with this value. */
  readonly standing: (value: string) => OptionStanding
}

/** The owner an option stands in. */
export const OptionOwnerContext = createContext<OptionOwner | undefined>(undefined)

/** The group an option stands in. */
const OptionGroupContext = createContext<object | undefined>(undefined)

carryIntoLayers(OptionOwnerContext)

const named = (slot: string, children: unknown): boolean =>
  Children.toArray(children as never).some(
    (child) => isValidElement(child) && (child.props as Props).slot === slot,
  )

/** The option's own words: what is passed in with no region. */
const ownWords = (children: unknown): string =>
  wordsOf(
    Children.toArray(children as never).filter(
      (child) => !isValidElement(child) || (child.props as Props).slot === undefined,
    ),
  )

/** The words passed into `description`. */
const slottedWords = (children: unknown): string =>
  wordsOf(
    Children.toArray(children as never).filter(
      (child) => isValidElement(child) && (child.props as Props).slot === 'description',
    ),
  )

/** The words of an option's props. */
const wordOf = (family: Family, props: Props, use: MachineUse, name: string): string =>
  String(given(family, props, boundTo(use, name, 'prop')) ?? '')

/** What an option's row is, by what its owner says and what its props say. */
const rowOf = ({
  drag,
  label,
  member,
  move,
  press,
  said,
  selected,
  describes,
  lift,
  on,
}: {
  readonly describes: string
  readonly drag: WindowDrag | undefined
  readonly label: string
  readonly lift: ((key: object) => void) | undefined
  readonly member: OptionMember
  readonly move: OptionOwner['move']
  readonly on: (node: unknown) => void
  readonly press: () => void
  readonly said: string
  readonly selected: boolean
}): PartBinding => ({
  view: {
    accessibilityHint: describes === '' ? undefined : describes,
    accessibilityLabel: label === '' ? said : label,
    accessibilityState: {
      ...(member.href === '' ? { selected } : {}),
      ...(member.disabled ? { disabled: true } : {}),
    },
    ...(move === undefined
      ? {}
      : {
          accessibilityActions: [
            { label: 'Move up', name: 'decrement' },
            { label: 'Move down', name: 'increment' },
          ],
          onAccessibilityAction: (event: {
            readonly nativeEvent: { readonly actionName: string }
          }) => move(member.key, event.nativeEvent.actionName === 'decrement' ? -1 : 1),
        }),
    onPress: press,
    ref: on,
  },
  ...(drag === undefined || member.disabled
    ? {}
    : {
        wrap: (view: ReactNode) => (
          <Held at={-1} dragging={drag} horizontal={false} onLift={() => lift?.(member.key)}>
            {view}
          </Held>
        ),
      }),
})

/** What an option says of itself. */
const memberOf = (
  family: Family,
  props: Props,
  use: MachineUse,
  key: object,
  node: () => unknown,
  group: object | undefined,
): OptionMember & { readonly description: string; readonly words: string } => {
  const words = ownWords(props.children)
  const textValue = wordOf(family, props, use, 'textValue')
  const label = wordOf(family, props, use, 'label')
  return {
    declared: given(family, props, boundTo(use, 'selected', 'prop')) === true,
    description: wordOf(family, props, use, 'description'),
    disabled: given(family, props, boundTo(use, 'disabled', 'prop')) === true,
    group,
    href: wordOf(family, props, use, 'href'),
    key,
    node,
    text: textValue || words || label,
    value: wordOf(family, props, use, 'value'),
    words: words || label,
  }
}

/** What a press on an option does: it asks, then follows its link or tells its owner. */
const pressOf = (
  family: Family,
  props: Props,
  use: MachineUse,
  member: OptionMember,
  owner: OptionOwner | undefined,
) => {
  if (member.disabled) {
    return
  }
  const { href, node, value } = member
  const asks = boundTo(use, 'onBeforeSelect', 'event')
  const detail = href === '' ? { value } : { href, value }
  if (asks !== undefined && !tell(family, props, asks, detail, senderOf(family, value))) {
    return
  }
  if (href !== '') {
    void openLink().open(href)
    return
  }
  /* Focus first: a choice may close the list, which gives focus back to its trigger. */
  const view = node()
  if (view) {
    focus().focus(view, false)
  }
  owner?.choose(member)
}

/** What an option's parts read of where it stands. */
const statesOf = (
  use: MachineUse,
  described: boolean,
  checked: boolean,
  active: boolean,
  move: OptionStanding['move'],
): Readonly<Record<string, boolean>> => {
  const name = (field: string, fallback: string): string => boundTo(use, field, 'state') ?? fallback
  return {
    [name('checkShown', 'check-shown')]: checked,
    [name('described', 'described')]: described,
    [name('dragging', 'dragging')]: move === 'dragging',
    [name('dropAfter', 'drop-after')]: move === 'drop-after',
    [name('dropBefore', 'drop-before')]: move === 'drop-before',
    [name('dropShown', 'drop-shown')]: move === 'drop-after' || move === 'drop-before',
    [name('highlighted', 'highlighted')]: active,
  }
}

/**
 * Hosts an option: tells its owner its latest, reads what the owner says of it,
 * and gives its row a press, a key, and what a screen reader hears.
 */
export const useOption = (family: Family, props: Props, use: MachineUse): Behavior => {
  const owner = useContext(OptionOwnerContext)
  const group = useContext(OptionGroupContext)
  const key = useRef({}).current
  const node = useRef<unknown>(null)
  const own = memberOf(family, props, use, key, () => node.current, group)
  const member = owner?.disabled === true ? { ...own, disabled: true } : own
  useLayoutEffect(() => {
    owner?.hold(member)
  })
  const latest = useRef(owner)
  latest.current = owner
  useEffect(() => () => latest.current?.leave(key), [key])
  const standing = owner?.standing(member.value)
  const selected = standing === undefined ? member.declared : standing.selected
  const active =
    standing === undefined
      ? props.dataActive === true || props['data-active'] === true
      : standing.active
  const hasIndicator = named('indicator', props.children)
  const listening = useRef<(() => void) | undefined>(undefined)
  const on = (view: unknown): void => {
    listening.current?.()
    listening.current = undefined
    node.current = view
    if (view !== null && owner !== undefined) {
      listening.current = keys().listen(view, (pressed) => owner.key(member.value, pressed))
    }
  }
  return {
    marks: [
      ...(active ? ['active'] : []),
      ...(own.disabled ? ['disabled'] : []),
      ...(hasIndicator ? ['has-indicator'] : []),
      ...(selected ? ['selected'] : []),
    ],
    parts: {
      host: {
        states: statesOf(
          use,
          member.description !== '',
          selected && !hasIndicator,
          active,
          standing?.move,
        ),
      },
      item: rowOf({
        describes: member.description || slottedWords(props.children),
        drag: owner?.drag,
        label: member.words,
        lift: owner?.lift,
        member,
        move: owner?.move,
        on,
        press: () => pressOf(family, props, use, member, owner),
        said: member.text,
        selected,
      }),
    },
    ...(standing?.hidden === true ? { provide: () => null } : {}),
  }
}

/**
 * Hosts a group of options, or a rule between runs: a group's options know it, and
 * a filter that hides them all hides the heading, as the web's owner hides the
 * group. While a filter narrows the list, a rule goes.
 */
export const useOptionGroup = (use: MachineUse): Behavior => {
  const owner = useContext(OptionOwnerContext)
  const key = useRef({}).current
  const rule = boundTo(use, 'label', 'prop') === undefined
  const latest = useRef(owner)
  latest.current = owner
  useLayoutEffect(() => (rule ? undefined : latest.current?.holdGroup(key)), [key, rule])
  const facts = rule ? undefined : owner?.group(key)
  return {
    marks: [],
    parts: {
      host: {
        states: {
          [boundTo(use, 'emptied', 'state') ?? 'emptied']: facts?.hidden === true,
          [boundTo(use, 'later', 'state') ?? 'later']: facts?.later === true,
        },
      },
    },
    /* What a group holds stays drawn while a filter empties it, or its options
       would leave the list and the group would be no longer empty. */
    provide: (inside) =>
      rule && owner?.filtering === true ? null : (
        <OptionGroupContext.Provider value={key}>{inside}</OptionGroupContext.Provider>
      ),
  }
}
