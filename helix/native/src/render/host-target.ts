/**
 * The host of an element given an `id`, registered under it as a target,
 * as the web finds an element by its id: a tour stop whose `for` holds the
 * id is placed against the element's view, and an app header whose
 * `scroller` holds it follows the view. A page's code shared with the web
 * names a target as the web does.
 */
import { bothRefs } from './behavior'
import { useTarget } from './targets'

/** The host's view props with a ref that registers the view under `id`, where it is one. */
export const useHostTarget = (
  id: unknown,
): ((props: Readonly<Record<string, unknown>>) => Readonly<Record<string, unknown>>) => {
  const named = typeof id === 'string' && id !== '' ? id : undefined
  const register = useTarget(named)
  return (props) => {
    if (named === undefined) {
      return props
    }
    const own = props.ref
    return {
      ...props,
      ref:
        typeof own === 'function' ? bothRefs(own as (node: unknown) => void, register) : register,
    }
  }
}
