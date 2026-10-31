/**
 * The machine an item of a tree runs on a phone: it says what it is to the tree
 * it stands in, and takes from the tree what it is chosen as and where it
 * stands, and a press and a key on its row.
 */
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { locale } from '@fusion.dev/helix-core/capabilities/locale'
import { measure } from '@fusion.dev/helix-core/capabilities/measure'
import { openLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { passedCount } from '@fusion.dev/helix-core/reorder'
import { formatMessage, lookupWord } from '@fusion.dev/helix-core/words'
import {
  Children,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react'
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { boundTo, given, tell } from './props'
import type { Turned } from './toggle'
import { TreeContext, type TreeOffer, TreeParent } from './tree'
import type { Facts, TreeRow } from './tree-rows'
import { wordsOf } from './words'

/** Whether anything is passed into an item's `children` region. */
const holdsItems = (children: unknown): boolean =>
  Children.toArray(children as never).some(
    (child) => isValidElement(child) && (child.props as Props).slot === 'children',
  )

/** The item's own words: what is passed in with no region. */
const ownWords = (children: unknown): string =>
  wordsOf(
    Children.toArray(children as never).filter(
      (child) => !isValidElement(child) || (child.props as Props).slot === undefined,
    ),
  )

/** The words a phone says of a row's level and its place. */
const placeWords = (level: number, position: number, size: number): string => {
  const tag = locale().read()
  const found = lookupWord(tag, 'helix-tree', 'treeItemPlace')
  const words = typeof found?.[0] === 'string' ? found[0] : 'Level {level}, {position} of {size}'
  return formatMessage(words, { level, position, size }, tag)
}

/**
 * Where a finger that has traveled `by` along the column drops an item: past
 * the middle of each sibling its own middle has passed.
 */
const travelTo = (by: number, siblings: readonly TreeRow[], from: number): number => {
  const box = (row: TreeRow | undefined) => {
    const node = row?.node()
    return node === undefined || node === null ? null : measure().box(node)
  }
  const own = box(siblings[from])
  if (own === null) {
    return from
  }
  const at = own.y + own.height / 2 + by
  const centers = siblings.flatMap((row, place) => {
    const one = place === from ? null : box(row)
    return one === null ? [] : [one.y + one.height / 2]
  })
  return passedCount(centers, at)
}

/** What a grip's touches do, which a drag and a press on it share. */
const gripView = (
  offer: {
    readonly drag: {
      readonly end: (dropped: boolean) => void
      readonly move: (travel: number) => void
      readonly start: (row: object) => void
    }
    readonly pick: (row: object) => void
  },
  key: object,
  start: { current: number | undefined },
) => ({
  onResponderGrant: (event: { readonly nativeEvent: { readonly pageY: number } }) => {
    start.current = event.nativeEvent.pageY
  },
  onResponderMove: (event: { readonly nativeEvent: { readonly pageY: number } }) => {
    if (start.current === undefined) {
      return
    }
    const by = event.nativeEvent.pageY - start.current
    if (Math.abs(by) > 4) {
      offer.drag.start(key)
      offer.drag.move(by)
    }
  },
  onResponderRelease: (event: { readonly nativeEvent: { readonly pageY: number } }) => {
    const by = event.nativeEvent.pageY - (start.current ?? event.nativeEvent.pageY)
    start.current = undefined
    if (Math.abs(by) > 4) {
      offer.drag.end(true)
    } else {
      offer.pick(key)
    }
  },
  onResponderTerminate: () => {
    start.current = undefined
    offer.drag.end(false)
  },
  /* A drag on the grip moves the item, and the page around it stays. */
  onResponderTerminationRequest: () => false,
  onStartShouldSetResponder: () => true,
})

/** What an item is, as its states are worked out from it. */
interface Standing {
  readonly around: unknown
  readonly branch: boolean
  readonly disabled: boolean
  readonly facts: Facts | undefined
  readonly href: string
  readonly lazy: boolean
  readonly offer: TreeOffer | undefined
  readonly open: boolean
}

/** Where the check mark and the chevron stand. */
const markStates = ({ branch, facts, offer }: Standing): Readonly<Record<string, boolean>> => {
  const checkable = offer?.multiple === true
  const checked = facts?.checked ?? false
  const chevron = offer?.chevron ?? 'start'
  const atStart = chevron !== 'end' && chevron !== 'label'
  return {
    'check-mark': checkable && checked === true,
    checkable,
    checked: checkable && checked === true,
    'chevron-end': branch && chevron === 'end',
    'chevron-label': branch && chevron === 'label',
    'chevron-start': branch && atStart,
    'dash-mark': checkable && checked === 'mixed',
    mixed: checkable && checked === 'mixed',
    reserved: !branch && atStart,
  }
}

/** What an item's parts read: the web's custom states, and what a phone computes. */
const statesOf = (one: Standing): Readonly<Record<string, boolean>> => {
  const { around, branch, disabled, facts, href, lazy, offer, open } = one
  const nested = around !== undefined
  return {
    ...markStates(one),
    branch,
    dragging: facts?.move === 'dragging',
    'drop-after': facts?.move === 'drop-after',
    'drop-before': facts?.move === 'drop-before',
    grip: offer?.reorderable === true && !disabled,
    heading: branch && offer?.nesting === 'heading',
    leaf: !branch,
    linked: href !== '',
    loading: open && lazy,
    nested,
    selected: facts?.selected === true,
    subordinate: nested && offer?.nesting === 'subordinate',
  }
}

/** What a screen reader hears of a row, and whether it holds the tree's one stop. */
const rowReading = ({
  branch,
  disabled,
  facts,
  lazy,
  level,
  offer,
  open,
}: Omit<Standing, 'around' | 'href'> & { readonly level: number }) => {
  const checked = facts?.checked ?? false
  return {
    accessibilityActions: offer?.reorderable
      ? [
          { label: 'Move up', name: 'decrement' },
          { label: 'Move down', name: 'increment' },
        ]
      : undefined,
    accessibilityState: {
      ...(branch ? { expanded: open } : {}),
      ...(offer?.multiple === true
        ? { checked: checked === 'mixed' ? 'mixed' : checked === true }
        : { selected: facts?.selected === true }),
      ...(disabled ? { disabled: true } : {}),
      ...(open && lazy ? { busy: true } : {}),
    },
    ...(facts === undefined
      ? {}
      : { accessibilityValue: { text: placeWords(level, facts.position, facts.size) } }),
    focusable: facts?.stop === true,
  }
}

/**
 * Hosts an item: tells the tree its latest, reads what the tree says of it, and
 * gives its parts their presses, their keys, and what a screen reader hears.
 */
export const useTreeItem = (
  family: Family,
  props: Props,
  use: MachineUse,
  toggled: Turned | undefined,
): Behavior => {
  const offer = useContext(TreeContext)
  const around = useContext(TreeParent)
  const key = useRef({}).current
  const open = toggled?.checked === true
  const disabled = given(family, props, boundTo(use, 'disabled', 'prop')) === true
  const lazy = given(family, props, boundTo(use, 'lazy', 'prop')) === true
  const value = String(given(family, props, boundTo(use, 'value', 'prop')) ?? '')
  const href = String(given(family, props, boundTo(use, 'href', 'prop')) ?? '')
  const branch = lazy || holdsItems(props.children)
  const words = ownWords(props.children)
  const level = (around?.level ?? 0) + 1
  const facts = offer?.facts(key)
  const checkable = offer?.multiple === true
  const node = useRef<unknown>(null)
  const heard = useRef<(press: never) => boolean>(() => false)
  const grip = useRef<number | undefined>(undefined)

  const turn = (next: boolean): void => {
    if (toggled !== undefined && toggled.checked !== next) {
      toggled.turn()
    }
  }
  const select = (): void => {
    if (disabled) {
      return
    }
    const chosen = boundTo(use, 'onBeforeSelect', 'event')
    const stands =
      chosen === undefined || tell(family, props, chosen, { value }, { value } as never)
    if (stands && offer?.bubble(chosen ?? '', { value })) {
      offer.selected(key)
    }
  }
  const choosable = value !== '' && offer?.heads !== true && !checkable && !disabled
  const toggleOpen = (): void => {
    if (!disabled) {
      turn(!open)
    }
  }
  const follow = (): void => {
    if (href !== '') {
      void openLink().open(href)
    }
  }
  const activate = (): void => {
    if (disabled) {
      return
    }
    if (branch) {
      if (choosable) {
        select()
      }
      toggleOpen()
    } else {
      select()
      follow()
    }
  }
  const press = (): void => {
    if (offer?.pressed(key) === true || disabled) {
      return
    }
    if (branch && href === '') {
      if (choosable) {
        select()
      }
      toggleOpen()
      return
    }
    select()
    follow()
  }
  const row: TreeRow = {
    activate,
    branch,
    disabled,
    key,
    node: () => node.current,
    open,
    parent: around?.key,
    select,
    travel: travelTo,
    turn,
    value,
    words,
  }
  useLayoutEffect(() => {
    offer?.hold(row)
  })
  useLayoutEffect(() => () => offer?.leave(key), [key, offer?.leave])
  /* A lazy branch asks for its items as it opens. */
  const loads = boundTo(use, 'onLoad', 'event')
  const latest = useRef(props)
  latest.current = props
  useEffect(() => {
    if (open && lazy && loads !== undefined) {
      tell(family, latest.current, loads, {})
    }
  }, [family, lazy, loads, open])
  heard.current = ((pressed: Parameters<NonNullable<typeof offer>['key']>[1]) =>
    offer?.key(key, pressed) === true) as never
  const rowRef = useCallback((view: unknown) => {
    node.current = view
    if (view === null) {
      return undefined
    }
    return keys().listen(view, (pressed) => heard.current(pressed as never))
  }, [])

  return {
    marks: [],
    parts: {
      checkbox: { view: { onPress: select } },
      grip: { view: gripView(offer ?? NO_GRIP, key, grip) },
      host: { states: statesOf({ around, branch, disabled, facts, href, lazy, offer, open }) },
      row: {
        states: { level: String(level) },
        view: {
          ...rowReading({ branch, disabled, facts, lazy, level, offer, open }),
          onAccessibilityAction: (event: {
            readonly nativeEvent: { readonly actionName: string }
          }) => offer?.move(key, event.nativeEvent.actionName === 'decrement' ? -1 : 1),
          onFocus: () => offer?.focused(key),
          onPress: press,
          ref: rowRef,
        },
      },
      /* A link's chevron is what opens it, and elsewhere the whole row does. */
      toggle: {
        view:
          href === ''
            ? {}
            : {
                onResponderRelease: toggleOpen,
                onStartShouldSetResponder: () => true,
              },
      },
    },
    provide: (inside) => <TreeParent.Provider value={{ key, level }}>{inside}</TreeParent.Provider>,
  }
}

/** A grip with no tree around it, which does nothing. */
const NO_GRIP = {
  drag: { end: () => undefined, move: () => undefined, start: () => undefined },
  pick: () => undefined,
}
