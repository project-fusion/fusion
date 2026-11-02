import { openLink } from '@fusion.dev/helix-core/capabilities/open-link'
import type { MachineUse } from '../ir.generated'
import type { Props } from '../render/behavior'
import type { Family, Node } from '../style/form'
import type { Around, Binder } from './binder'
import { type Joined, wordsOf } from './join'
import { linkedBy, linksInside } from './links'
import { opensOnHold } from './long-press'
import { type Told, usePress } from './press'
import { boundTo, camel, followUpOf, given, senderOf, tell } from './props'
import { scrollingOf } from './scrolling'
import { turnsAlone } from './turns'

/**
 * What a press tells and what follows it.
 *
 * **A scroll button pages the box it is in.** **A press on the part that
 * toggles turns the element's toggle**, while the element has joined no
 * set, and sends no event of its own. **A press on the part that
 * chooses the item asks its set**: its event first, which the item's consumer
 * and then the set's may refuse, then the choice, and then the item's link
 * where the set does not follow it. A tab's link opens once its choice is
 * sent, and a refused choice keeps it closed. **Where the item draws its
 * link inside its press, as a tag and a list's row do, a press in a set that
 * chooses opens the link and chooses nothing**, as a press on the web's link
 * part only follows it. A press that joins no set goes
 * to its link, as `linkedBy` says, its event's `label` the element's words.
 * **Any other press of an item reaches its set** once its event stands, as a
 * tag's `dismiss` bubbles to its group on the web. **An item of a set that
 * mixes commands and choices turns first**, before its event is sent, and a
 * Space that chose a choice keeps the set's element open. **In a
 * stack of pages, the back press goes back one page, and a row that holds a
 * page shows it**, sending nothing of its own. **A request that stands is
 * followed by its notification** where the family sends one, as a menu's
 * row sends `select` once its `before-select` stood, before anything the
 * choice does.
 */
const toldBy = (family: Family, use: MachineUse, around: Around, props: Props): Told => {
  const part = boundTo(use, 'part', 'part') ?? ''
  const { joined, stacked } = around
  const alone = ownTold(family, part, around)
  if (alone !== undefined) {
    return alone
  }
  const sends = boundTo(use, 'sends', 'event')
  const after = sends === undefined ? undefined : followUpOf(family, sends)
  if (joined?.offer === undefined) {
    const linked = linkedBy(family, props, part)
    const own = joined === undefined ? {} : { value: joined.value }
    const detail = { label: wordsOf(props.children), ...linked.detail, ...own }
    if (after === undefined) {
      return { ...linked, detail }
    }
    const sender = senderOf(family, given(family, props, 'value'))
    return {
      ...linked,
      detail,
      stood: (key) => {
        tell(family, props, after, detail, sender)
        linked.stood?.(key)
      },
    }
  }
  const detail = { label: joined.words, value: joined.value }
  if (part !== joined.chooser) {
    const { offer, value } = joined
    return sends === undefined
      ? { detail }
      : { detail, stood: () => offer?.hear(sends, detail, senderOf(family, value)) }
  }
  const closes = family.api?.item?.closes
  const own = closes === undefined ? undefined : props[camel(closes)]
  return chosenBy(family, { after, detail, joined, own, part, props, sends, stacked })
}

/**
 * What a press tells that pages a box, goes back a page, or turns the
 * element's own toggle, or nothing where it does none of these.
 */
const ownTold = (family: Family, part: string, around: Around): Told | undefined => {
  const scrolling = scrollingOf(family, part)
  if (scrolling !== undefined) {
    return { stood: () => around.pagers.get(scrolling.scroller)?.page(scrolling.toward) }
  }
  const { entered, joined, stacked, toggled } = around
  /* **The press that clears empties the field**, once its own event stands. */
  if (entered?.clears !== undefined && entered.clears === part) {
    return { quiet: true, stood: entered.clear }
  }
  /* **The back press of a stack goes back one page**, once its event stands. */
  if (stacked.back !== undefined && stacked.back.part === part) {
    return { stood: stacked.back.go }
  }
  /* **An item that turns turns only while it has joined no set**, as a
     toggle outside a toggle group does, and then sends no `select`. */
  if (toggled !== undefined && part === toggled.part && turnsAlone(joined)) {
    return { quiet: true, stood: toggled.turn }
  }
  return undefined
}

/**
 * Whether the set lets the item's event stand, where the item sends one.
 * **A choice that stood is said**, to the item's consumer and then its
 * set's, as the web's `helix-select` bubbles from the row.
 */
const heardBy = (
  offer: NonNullable<Joined['offer']>,
  asked: {
    readonly after: string | undefined
    readonly detail: Readonly<Record<string, unknown>>
    readonly family: Family
    readonly props: Props
    readonly sends: string | undefined
    readonly value: string
  },
): boolean => {
  const { after, detail, family, props, sends, value } = asked
  const sender = senderOf(family, value)
  if (sends !== undefined && !offer.hear(sends, detail, sender)) {
    return false
  }
  if (after !== undefined) {
    tell(family, props, after, detail, sender)
    offer.hear(after, detail, sender)
  }
  return true
}

/** What a press on the part that chooses an item tells and what follows it. */
const chosenBy = (
  family: Family,
  press: {
    /** The notification that follows the press's event once it stands, as `select`. */
    readonly after: string | undefined
    readonly detail: Readonly<Record<string, unknown>>
    readonly joined: Joined
    /** The item's own prop its item's `closes` names, as a menu row's `close-on-select`. */
    readonly own: unknown
    readonly part: string
    readonly props: Props
    readonly sends: string | undefined
    readonly stacked: Around['stacked']
  },
): Told => {
  const { after, detail, joined, own, part, props, sends, stacked } = press
  /* **A row that holds a page shows it**, and sends no event of its own, as
     the web's row drills where it holds a page. */
  if (stacked.enter !== undefined) {
    return { detail, quiet: true, stood: stacked.enter }
  }
  /* **An item of a set that mixes turns before its event is sent**, as the
     web's Menu Item ticks a choice row and then sends `helix-select`. */
  let choice = false
  const first =
    joined.offer?.mixes === true
      ? {
          first: () => {
            choice = joined.tick.current?.() === true
          },
          sent: (stands: boolean) => joined.offer?.sent?.(stands),
        }
      : {}
  return {
    detail,
    ...first,
    stood: (key) => {
      const { link, offer, value } = joined
      if (offer === undefined || !heardBy(offer, { after, detail, family, props, sends, value })) {
        return
      }
      /* **A Space on a choice keeps the element open**, as a Space on a
         menu's choice row leaves the menu open on the web. */
      offer.chose?.(own, key === ' ' && choice)
      if (link !== undefined && !offer.follows && linksInside(family, part)) {
        openLink().open(link)
        return
      }
      offer.choose(value)
      if (link !== undefined && !offer.follows) {
        openLink().open(link)
      }
    },
  }
}

/** Whether the part `part` is drawn inside the part `around`, in a tree. */
const drawnIn = (nodes: readonly Node[], around: string | undefined, part: string): boolean => {
  if (around === undefined) {
    return false
  }
  const holds = (inside: readonly Node[]): boolean =>
    inside.some((node) => node.name === part || holds(node.children ?? []))
  const find = (from: readonly Node[]): boolean =>
    from.some((node) =>
      node.name === around && node.kind !== 'region'
        ? holds(node.children ?? [])
        : find(node.children ?? []),
    )
  return find(nodes)
}

/** **The press that copies copies** once its own event stands, and any other tells as `toldBy` says. */
const copiedOr = (family: Family, use: MachineUse, around: Around, props: Props): Told => {
  const { copied } = around
  return copied !== undefined && copied.part === boundTo(use, 'part', 'part')
    ? { stood: copied.copy }
    : toldBy(family, use, around, props)
}

/** What the layer gives a press its own element draws inside the layer's anchor part. */
const anchorOf = (family: Family, around: Around, part: string) =>
  drawnIn(family.tree ?? [], around.anchored.part, part) ? around.anchored.press : undefined

/**
 * Hosts a press on one part. **The press hears Enter and Space on its part
 * outside a set, and where its set leaves them to it**, as a button group
 * and a checkbox group do: other items' keys go to their set. It reads what
 * the set lays over its part in place of the props it names.
 */
export const pressing =
  (family: Family, use: MachineUse): Binder =>
  (props, around) => {
    const part = boundTo(use, 'part', 'part') ?? ''
    const states = around.joined?.behavior.parts[part]?.states
    const offer = around.joined?.offer
    const told = opensOnHold(copiedOr(family, use, around, props), around.toggled)
    const anchor = anchorOf(family, around, part)
    return usePress(family, props, use, told, {
      ...(anchor === undefined ? {} : { anchor }),
      keys: offer === undefined || offer.ownKeys === true,
      ...(states === undefined ? {} : { states }),
    })
  }
