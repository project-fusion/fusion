import type { Focus } from './contract.generated.js'

/** One move of focus, as it was asked for. */
export interface Moved<N> {
  readonly node: N
  readonly preventScroll: boolean
}

/** A focus capability that keeps where focus is and every move asked of it, for a spec to read. */
export interface FakeFocus<N> extends Focus<N> {
  /** Every move asked for, in order. */
  readonly moved: readonly Moved<N>[]

  /**
   * Puts focus on `node`, or on nothing, as a reader does with Tab or a click.
   * Where focus is changes, and no move is kept.
   */
  readonly place: (node: N | null) => void
}

/** A fake that keeps where focus is and each move it is asked to make. */
export const fakeFocus = <N>(): FakeFocus<N> => {
  const moved: Moved<N>[] = []
  let at: N | null = null
  return {
    focus: (node, preventScroll) => {
      moved.push({ node, preventScroll })
      at = node
    },
    focused: () => at,
    moved,
    place: (node) => {
      at = node
    },
  }
}
