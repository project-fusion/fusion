import { focus } from '@fusion.dev/helix-core/capabilities/focus'
import { useCallback, useEffect, useRef } from 'react'
import type { Behavior } from '../render/behavior'
import { type Sibling, useSiblings } from '../render/siblings'
import type { Family, Node } from '../style/form'

/** Whether an element's toggle only closes, as a callout's dismissal does. */
export const dismisses = (family: Family): boolean =>
  family.api?.toggle?.closes !== undefined && family.api.toggle.opens === undefined

/**
 * The press that sends `dismiss` on an element the page takes out, as an
 * announcement's dismiss button: no toggle hides it, and no set it joins
 * moves focus for it, as a tag group does.
 */
export const leavesBy = (family: Family): string | undefined => {
  if (family.api?.toggle !== undefined || family.api?.item !== undefined) {
    return undefined
  }
  const find = (nodes: readonly Node[] | undefined): string | undefined => {
    for (const node of nodes ?? []) {
      if (node.kind === 'pressable' && node.attributes?.sends === 'dismiss') {
        return node.name
      }
      const inner = find(node.children)
      if (inner !== undefined) {
        return inner
      }
    }
    return undefined
  }
  return find(family.tree)
}

/** What an element that is dismissed hands on. */
export interface HandOff {
  /** The view its dismiss press is drawn with, which focus can reach. */
  readonly behavior: Behavior
  /** Moves focus to the dismiss press of the nearest sibling still shown, the next ones first. */
  readonly hand: (around?: readonly Sibling[]) => void
  /** Whether the element's dismiss press was pressed, or holds keyboard focus now. */
  readonly holds: () => boolean
  /** The siblings now, the next ones nearest first, then those before. */
  readonly siblings: () => readonly Sibling[]
}

/**
 * **A dismissal hands focus on**, as the web's does: the press that
 * dismissed the element is gone once it hides, so focus moves to the
 * dismiss press of the element of its kind beside it that is still shown,
 * the next ones nearest first, then those before. A screen reader's focus
 * moves with it, through the focus capability.
 */
export const useHandOff = (family: Family, part: string, shown: boolean): HandOff => {
  const node = useRef<unknown>(null)
  const now = useRef(shown)
  now.current = shown
  const siblings = useSiblings(`${family.tag} focus`, {
    focus: () => {
      if (!now.current || node.current === null) {
        return false
      }
      focus().focus(node.current, false)
      return true
    },
    present: () => now.current,
  })
  const held = useCallback((next: unknown) => {
    node.current = next
  }, [])
  /* Pressed since it last closed, which hands focus on as focus on it does. */
  const pressed = useRef(false)
  const hand = (around: readonly Sibling[] = siblings.around()) => {
    for (const sibling of around) {
      if (sibling.present() && sibling.focus?.() === true) {
        return
      }
    }
  }
  return {
    behavior: {
      marks: [],
      parts: { [part]: { view: { onPress: () => (pressed.current = true), ref: held } } },
    },
    hand,
    holds: () => {
      const was = pressed.current
      pressed.current = false
      return was || (node.current !== null && focus().focused() === node.current)
    },
    siblings: siblings.around,
  }
}

/**
 * **A dismissal the page answers by taking the element out hands focus on
 * as the element leaves**, as an announcement's does: where its dismiss
 * press was pressed, and still holds focus, focus moves to the dismiss
 * press of the element of its kind beside it that is still drawn.
 */
export const useLeavingHandOff = (
  family: Family,
  part: string | undefined,
  shown: boolean,
): Behavior => {
  const handOff = useHandOff(family, part ?? '', shown)
  /* The siblings as they stood when the press was pressed, read while this
     element was still among them. */
  const armed = useRef<readonly Sibling[] | undefined>(undefined)
  const latest = useRef(handOff)
  latest.current = handOff
  useEffect(
    () => () => {
      if (armed.current !== undefined) {
        latest.current.hand(armed.current)
      }
    },
    [],
  )
  if (part === undefined) {
    return { marks: [], parts: {} }
  }
  const arm = () => {
    armed.current = latest.current.siblings()
  }
  const disarm = () => {
    armed.current = undefined
  }
  const view = handOff.behavior.parts[part]?.view
  return {
    marks: [],
    parts: { [part]: { view: { ...view, onBlur: disarm, onFocus: arm, onPress: arm } } },
  }
}
