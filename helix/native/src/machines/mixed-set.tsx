import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import { runAround } from '@fusion.dev/helix-core/menu-items'
import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import type { MachineUse } from '../ir.generated'
import type { Family } from '../style/form'
import type { Binder } from './binder'
import { collection, type Member, type Offer, useMembers } from './collection'
import { boundTo, given, type Sender, senderOf, tell } from './props'
import { type Rove, useRovingFocus } from './roving-focus'
import { useTypeahead } from './typeahead'

/** The roving focus a set binds where it binds none, so every set runs the same hooks. */
const STAYS: MachineUse = { bind: {}, machine: 'roving-focus' }

/** Nothing a set that mixes chooses as focus arrives. */
const NOTHING = (): void => undefined

/** Whether an item is chosen: never, in a set that holds no chosen value. */
const NONE = (): boolean => false

type Drawn = ReactElement<{ readonly children?: ReactNode; readonly value?: unknown }>

/** The elements among `children`, in order, with a fragment's own children in its place. */
const siblingsIn = (children: ReactNode): Drawn[] =>
  Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) {
      return []
    }
    const drawn = child as Drawn
    return drawn.type === Fragment ? siblingsIn(drawn.props.children) : [drawn]
  })

/**
 * The values of each run of exclusive items among `children`, by each
 * item's value: the items drawn next to it that are exclusive too, up to
 * the first element that is not, such as a divider, as core's `runAround`
 * walks the web's siblings.
 */
const runsIn = (children: ReactNode, exclusive: ReadonlySet<string>): Map<string, Set<string>> => {
  const runs = new Map<string, Set<string>>()
  const valueIn = (drawn: Drawn) => (typeof drawn.props.value === 'string' ? drawn.props.value : '')
  const inRun = (drawn: Drawn) => exclusive.has(valueIn(drawn))
  const walk = (level: ReactNode) => {
    const siblings = siblingsIn(level)
    siblings.forEach((drawn, at) => {
      if (inRun(drawn)) {
        runs.set(valueIn(drawn), new Set(runAround(siblings, at, inRun).map(valueIn)))
      }
      walk(drawn.props.children)
    })
  }
  walk(children)
  return runs
}

/**
 * The other members of the run of the member known by `key`. **An item is
 * read in the elements the set holds, by its value**, so a divider between
 * two runs parts them as on the web. An item with no value, or drawn by an
 * element of the page's own, stands in a run among the members next to it.
 */
const runAmong = (
  members: readonly Member[],
  runs: ReadonlyMap<string, ReadonlySet<string>>,
  key: object,
): Member[] => {
  const at = members.findIndex((member) => member.key === key)
  const self = members[at]
  if (self?.exclusive !== true) {
    return []
  }
  const found = self.value === '' ? undefined : runs.get(self.value)
  if (found !== undefined) {
    return members.filter((member) => member.key !== key && found.has(member.value))
  }
  return runAround(members, at, (member) => member.exclusive === true && !runs.has(member.value))
}

/**
 * Hosts a set that mixes commands and choices, as a menu holds its rows,
 * bound as the expansion binds `mixed-set`: the prop that disables every
 * item. It holds no chosen value. **Its keys move focus among the items**,
 * with roving focus and then typeahead, and arriving chooses nothing.
 * **Space and Enter press the item focus is on**, as the item's own press
 * hears them, and an item's events reach the set's consumer as they bubble
 * on the web. It tells each item of a run the other items of its run, which
 * the item turns off as it turns on.
 */
export const mixingSet = (family: Family, uses: readonly MachineUse[], use: MachineUse): Binder => {
  const roving = uses.find((each) => each.machine === 'roving-focus') ?? STAYS
  const types = uses.some((each) => each.machine === 'typeahead')
  const keys = family.api?.collection?.keys
  const rove: Rove = { chooses: false, reserved: keys?.keeps ?? [], wrap: keys?.wrap === true }
  const Offered = collection(family.name)
  const closes = family.api?.collection?.closes
  const after = family.api?.collection?.after
  return (props, around) => {
    const { join, leave, members } = useMembers(props.children)
    const off = given(family, props, boundTo(use, 'disabled', 'prop')) === true
    const moves = useRovingFocus(family, props, roving, members, NOTHING, rove)
    const { key: typed, reset } = useTypeahead(members, false, NOTHING)
    const exclusive = new Set(members.filter((member) => member.exclusive).map((one) => one.value))
    const runs = runsIn(props.children as ReactNode, exclusive)
    const latest = useRef({ members, props, runs, toggled: around.toggled })
    latest.current = { members, props, runs, toggled: around.toggled }
    const key = useCallback(
      (from: string, press: KeyPress): boolean => {
        if (moves(from, press)) {
          reset()
          return true
        }
        return types && typed(from, press)
      },
      [moves, reset, typed],
    )
    /* **A turn of a choice sends the set's `after` events** once the row's
       event has gone out, as the web's menu sends `change` while its row's
       `select` is on its way: after the set hears it where it stands. */
    const pending = useRef(false)
    const flush = useCallback(() => {
      if (!pending.current) {
        return
      }
      pending.current = false
      for (const event of after ?? []) {
        tell(family, latest.current.props, event, {}, senderOf(family, ''))
      }
    }, [])
    const hear = useCallback(
      (event: string, detail: Readonly<Record<string, unknown>>, sender: Sender) => {
        const stands =
          family.api?.events.some((sent) => sent.name === event) !== true ||
          tell(family, latest.current.props, event, detail, sender)
        flush()
        return stands
      },
      [flush],
    )
    const runOf = useCallback(
      (member: object) => runAmong(latest.current.members, latest.current.runs, member),
      [],
    )
    /* **A choice that stood closes the element**, where the set's `closes`
       names the event and the item's own prop or the element's `while`
       lets it, as a menu closes as a row is chosen. **A Space on a choice
       keeps it open** where the item's own prop says nothing. */
    const chose = useCallback((own: unknown, kept = false) => {
      const { props: now, toggled } = latest.current
      const lets =
        own === true || (own !== false && !kept && given(family, now, closes?.while) !== false)
      if (closes !== undefined && lets && toggled?.checked === true) {
        toggled.turn()
      }
    }, [])
    const turned = useCallback(() => {
      pending.current = true
    }, [])
    const sent = useCallback(
      (stands: boolean) => {
        if (!stands) {
          flush()
        }
      },
      [flush],
    )
    const offer = useMemo<Offer>(
      () => ({
        choose: NOTHING,
        chose,
        chosen: NONE,
        ...(off ? { disabled: true } : {}),
        follows: false,
        hear,
        join,
        key,
        leave,
        mixes: true,
        ownKeys: true,
        runOf,
        ...(after === undefined || after.length === 0 ? {} : { sent, turned }),
      }),
      [chose, hear, join, key, leave, off, runOf, sent, turned],
    )
    return {
      marks: [],
      parts: {},
      provide: (drawn: ReactNode) => <Offered.Provider value={offer}>{drawn}</Offered.Provider>,
    }
  }
}
