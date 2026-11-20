import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { Stop } from '@fusion.dev/helix-core/capabilities/types'
import { useCallback, useContext, useLayoutEffect, useMemo, useRef } from 'react'
import type { HostInstance, LayoutChangeEvent } from 'react-native'
import { layoutChanged } from '../capabilities/measure'
import type { Behavior, Props } from '../render/behavior'
import type { Family } from '../style/form'
import { collection, type Member, type Offer } from './collection'
import { valued } from './gives'
import { askedBy, chooserIn, chooserOf, disabledBy, laidOver } from './join-parts'
import { camel, given, senderOf, tell } from './props'
import { useRemove } from './removal'
import { wordsOf } from './words'

export { wordsOf } from './words'

/** What an item that joins a set has of it, at one render. */
export interface Joined {
  /** The item's bindings: its choice as `selected`, and what the set lays over its parts. */
  readonly behavior: Behavior
  /** The part a press on which chooses the item, such as a tab's `tab`, where it has one. */
  readonly chooser: string | undefined
  /** Where a press on the item goes, where it is a link. */
  readonly link: string | undefined
  /** What the set knows the item by. */
  readonly key: object
  /** The set the item joined, or `undefined` outside one. */
  readonly offer: Offer | undefined
  /**
   * Whether the item is checked now, which an item that turns on its own
   * writes as it draws, for the set to read.
   */
  readonly turned: { current: boolean | undefined }
  /** Asks the item to turn, as a press on it does, which its toggle writes as it draws. */
  readonly request: { current: ((checked: boolean) => void) | undefined }
  /**
   * Turns an item of a set that mixes as a press does, before its press's
   * event is sent, which its choice writes as it draws, and says whether the
   * item is a choice, which a command is not.
   */
  readonly tick: { current: (() => boolean) | undefined }
  readonly value: string
  /**
   * The item's words, which typeahead matches and the events it sends name it
   * by. `''` where it has none: typeahead passes it over, and an event's
   * `label` is empty, as the web's `dismissEvent` sends it.
   */
  readonly words: string
}

/**
 * What the item is called and what it stands for in its set. **An item its
 * form names by several regions stands for their words** where it has no
 * `value`, as a tag stands for its category and its label, and typeahead
 * matches them.
 */
const namedBy = (
  family: Family,
  props: Props,
  words: string,
): { readonly name: string; readonly value: string } => {
  const named = family.api?.item?.named
  /* An item may stand for another prop, as a destination stands for its `href`. */
  const own = String(given(family, props, family.api?.item?.value ?? 'value') ?? '')
  if (named === undefined) {
    return { name: words, value: own }
  }
  const name = wordsOf(
    named.map((region) => (region === 'default' ? props.children : props[camel(region)])),
  )
  return { name, value: own === '' ? name : own }
}

/**
 * **The item's markup says it is chosen** by `selected`, or by the prop its
 * form flags it with, as a step is `current`, or by a value the element
 * computes, as a megamenu is current while its panel holds the page. A flag
 * that holds a word flags it while the word is any but `false`, as a
 * destination is `current` as `page`, and the set reads the word.
 */
const flagOf = (
  family: Family,
  props: Props,
): { readonly flagged: string | undefined; readonly marked: boolean } => {
  const named = family.api?.item?.flag ?? 'selected'
  const flag =
    family.api?.derived?.[named] === undefined ? props[camel(named)] : valued(family, props, named)
  const flagged = typeof flag === 'string' && flag !== '' && flag !== 'false' ? flag : undefined
  return { flagged, marked: flag === true || flagged !== undefined }
}

/** What an item tells its set of itself beside what every item tells. */
interface Telling {
  readonly act: () => void
  readonly acts: boolean
  readonly ask: () => boolean
  readonly asks: string | undefined
  readonly flagged: string | undefined
  readonly link: string | undefined
  readonly marked: boolean
  readonly remove: () => void
  readonly removes: boolean
}

/** The member an item joins its set as, with only the fields it has. */
const memberOf = (base: Member, telling: Telling): Member => ({
  ...base,
  ...(telling.marked ? { marked: true } : {}),
  ...(telling.flagged === undefined ? {} : { flagged: telling.flagged }),
  ...(telling.acts ? { act: telling.act } : {}),
  ...(telling.asks === undefined ? {} : { ask: telling.ask }),
  ...(telling.link === undefined ? {} : { link: telling.link }),
  ...(telling.removes ? { remove: telling.remove } : {}),
})

/**
 * Joins the set an item belongs to, as the form's `item` names it: the item
 * tells the set its value, words, link, and whether it is disabled, and the
 * set says whether it is chosen, which the item's parts read as `selected`.
 *
 * **The part whose press chooses the item is the one focus moves to**, and
 * the keys pressed on it go to the set first, as the web set hears the keys
 * pressed on its items. Its size reaches the measure capability, so a set
 * that observes it, as a tab set's mark does, hears it change. An item
 * outside a set draws as its props say.
 *
 * **A disabled item its set still reaches takes presses and keys**, as a
 * list with `disabled-behavior="selection"` keeps a disabled row out of its
 * choice alone. The part that chooses the item reads its `disabled` as
 * `false`, so its press and what a screen reader hears of it are not
 * disabled, and the item still draws as disabled. The web list tells its
 * rows the same with `selectionOnly`.
 *
 * Answers `undefined` for a family that is no set's item.
 */
export const useJoin = (family: Family, props: Props): Joined | undefined => {
  const item = family.api?.item
  const offer = useContext(collection(item?.of ?? ''))
  const words = wordsOf(props.children)
  const { name, value } = namedBy(family, props, words)
  /* A set that disables its items disables each, as a disabled radio group does. */
  const cascaded = offer?.disabled === true
  const disabled = given(family, props, 'disabled') === true || cascaded
  const { flagged, marked } = flagOf(family, props)
  const href = given(family, props, 'href')
  const link = typeof href === 'string' && href !== '' ? href : undefined
  const chooses = item?.chooses === true
  const chooser = chooserOf(family.tree)
  const asks = askedBy(family.tree)
  const lifted = disabled && offer?.reachesDisabled === true ? disabledBy(family.tree) : undefined
  const acts = family.api?.events.some((event) => event.name === 'action') === true

  /* The latest of what the set and the keys read, so the listener and the
     member's functions keep one identity across renders. */
  const latest = useRef({ offer, props, value, words })
  latest.current = { offer, props, value, words }
  const key = useRef({}).current
  const node = useRef<unknown>(null)
  const listening = useRef<Stop | undefined>(undefined)
  const held = useCallback(
    (next: unknown) => {
      listening.current?.()
      listening.current = undefined
      node.current = next
      if (next !== null) {
        listening.current = keys().listen(next, (press) => {
          const now = latest.current
          return now.offer?.key(now.value, press, key) ?? false
        })
      }
    },
    [key],
  )
  const act = useCallback(() => {
    const { props: now, value: own } = latest.current
    tell(family, now, 'action', {}, senderOf(family, own))
  }, [family])
  /* **A key that arrives on an item and chooses it asks first, as a press
     does**: the item's consumer hears its event, then the set's, and a
     refusal by either keeps the choice where it was. The web's tab sends
     `helix-select` on arrival for the same reason. */
  const ask = useCallback((): boolean => {
    const { offer: set, props: now, value: own, words: named } = latest.current
    if (asks === undefined) {
      return true
    }
    const detail = { label: named, value: own }
    const sender = senderOf(family, own)
    return tell(family, now, asks, detail, sender) && (set?.hear(asks, detail, sender) ?? true)
  }, [asks, family])
  /* Delete and Backspace press the item's remove button from its set. */
  const { remove, removes } = useRemove(family, props, offer?.removes, latest)
  const sized = useCallback((event: LayoutChangeEvent) => {
    if (node.current !== null) {
      layoutChanged(node.current as HostInstance, event.nativeEvent.layout)
    }
  }, [])

  const turned = useRef<boolean | undefined>(undefined)
  const request = useRef<((checked: boolean) => void) | undefined>(undefined)
  const tick = useRef<(() => boolean) | undefined>(undefined)
  const turns = family.api?.toggle !== undefined
  /* An item of a set that mixes is checked or not as its own choice holds it. */
  const mixes = item?.checked !== undefined
  const exclusive = item?.exclusive !== undefined && given(family, props, item.exclusive) === true
  /* An item that turns tells its set whether it is checked, as it draws,
     and turns when the set asks, as a press on it does. */
  const reads = useMemo(
    () =>
      turns || mixes
        ? {
            checked: () => turned.current === true,
            request: (checked: boolean) => request.current?.(checked),
          }
        : {},
    [mixes, turns],
  )
  const join = offer?.join
  const leave = offer?.leave
  useLayoutEffect(() => {
    if (item === undefined || join === undefined) {
      return undefined
    }
    const base: Member = {
      ...reads,
      chooses,
      disabled,
      ...(exclusive ? { exclusive } : {}),
      key,
      node: () => node.current,
      value,
      words: name,
    }
    join(key, memberOf(base, { act, acts, ask, asks, flagged, link, marked, remove, removes }))
    return () => leave?.(key)
  }, [
    act,
    acts,
    ask,
    asks,
    chooses,
    disabled,
    exclusive,
    flagged,
    item,
    join,
    key,
    leave,
    link,
    marked,
    name,
    reads,
    remove,
    removes,
    value,
  ])

  if (item === undefined) {
    return undefined
  }
  const laid = laidOver(offer, value, chooser, {
    /* A set whose items mark themselves lays no flag over them. */
    flag: offer?.marks === true ? undefined : item.flag,
    off: cascaded ? disabledBy(family.tree) : undefined,
    on: lifted,
    state: item.state,
    /* A section that opens moves among its set's by the keys, as an accordion's do. */
    toggler:
      family.api?.toggle?.opens === undefined ? undefined : chooserIn(family.tree, 'toggles')?.name,
    turns,
    view: offer === undefined ? {} : { onLayout: sized, ref: held },
  })
  return {
    behavior: { marks: [], parts: laid },
    chooser,
    key,
    link,
    offer,
    request,
    tick,
    turned,
    value,
    words,
  }
}
