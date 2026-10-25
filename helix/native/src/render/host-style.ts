import type { Style, Transition } from '../style/resolved'
import { animationStyle, transitionStyle, VIEW_MOVES } from './animation'
import { type Scope, transformed } from './styles'

/**
 * The host's style, with what the element around gives it, and its own
 * keyframes. **The host runs its keyframes**, as an icon spins as a whole, and
 * the transitions the element around gives it, as a speed dial's actions
 * arrive, on Reanimated's view, which `moves` asks for.
 */
export const hostStyle = (
  scope: Scope,
  given: Style | undefined,
  moved: Readonly<Record<string, Transition>> = {},
): { readonly moves: boolean; readonly style: unknown } => {
  const still = { ...scope.host.style, ...given }
  const motion = {
    ...animationStyle(scope.host.motion, still),
    ...transitionStyle(moved, VIEW_MOVES),
  }
  const moves = Object.keys(motion).length > 0
  return { moves, style: moves ? [transformed(still), motion] : transformed(still) }
}
