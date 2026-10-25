/**
 * Who takes a long press on a view: what claims it, and which claim wins.
 *
 * **A press held still for half a second is a long press**, which core's
 * press machine says as its `hold` effect, as Speed Dial's and Menu's
 * `LongPress` say it on the web. Three kinds of element want one on the same
 * trigger, so a press asks this registry which one takes it.
 *
 * **The trigger's own long press wins**, as the plan's decision on hover-only
 * patterns says: a tooltip's bubble shows on a long press only where the
 * trigger has no long press of its own. A Menu or a Speed Dial that opens on a
 * long press claims its trigger as `own`, and a Tooltip claims the control it
 * describes as a `hint`. **Among claims of one rank, the one made last
 * wins**, as the view registered last under an id stands in for the ones
 * before it. A press whose own node says `held` claims first of all, since its
 * element is the trigger's.
 *
 * **Claims are by view**, the host instance a press is drawn as, since a phone
 * has no element to listen on: a claim on a view no press draws is never
 * taken.
 */
import type { Stop } from '@fusion.dev/helix-core/capabilities/types'
import type { Told } from './press'
import type { Turned } from './toggle'

/** How a claim ranks: the trigger's own long press, or the hint a tooltip shows on one. */
export type HoldRank = 'hint' | 'own'

/** One claim on a view's long press. */
interface Claim {
  readonly rank: HoldRank
  readonly take: () => void
}

/** The claims on each view, in the order they were made. */
const claims = new WeakMap<object, Claim[]>()

/**
 * Claims the long press of `view`, a host instance a press draws: `take` runs
 * when a press on it is held, where no claim that outranks it stands. Gives
 * the stop that takes the claim back.
 */
export const claimLongPress = (view: unknown, rank: HoldRank, take: () => void): Stop => {
  if (typeof view !== 'object' || view === null) {
    return () => undefined
  }
  const claim: Claim = { rank, take }
  const held = claims.get(view) ?? []
  held.push(claim)
  claims.set(view, held)
  return () => {
    const now = claims.get(view)
    const at = now?.indexOf(claim) ?? -1
    if (now !== undefined && at !== -1) {
      now.splice(at, 1)
    }
  }
}

/**
 * What takes a long press on `view`: `own`, the press's own long press where
 * its node says `held`, first, then the last `own` claim, then the last
 * `hint`. Nothing where no one claims it, and the press then stays an
 * ordinary press however long it is held.
 */
export const longPressOf = (view: unknown, own?: () => void): (() => void) | undefined => {
  if (own !== undefined) {
    return own
  }
  const held = typeof view === 'object' && view !== null ? (claims.get(view) ?? []) : []
  const last = (rank: HoldRank) => held.findLast((claim) => claim.rank === rank)?.take
  return last('own') ?? last('hint')
}

/**
 * What a press tells, with its own long press: opening the element's
 * toggle, where it has one and stands closed, as a speed dial's trigger
 * opens its actions. The press runs it only where its node says `held`.
 */
export const opensOnHold = (told: Told, toggled: Turned | undefined): Told =>
  toggled === undefined
    ? told
    : {
        ...told,
        held: () => {
          if (!toggled.checked) {
            toggled.turn()
          }
        },
      }
