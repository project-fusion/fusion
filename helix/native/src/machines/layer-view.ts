/**
 * What a layer's own view takes, and what the layer answers and tells back
 * to a machine bound before it, as a tour stop's.
 */
import type { Around } from './binder'

/** A view that takes no touch and that no screen reader reaches. */
const HIDDEN = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
  pointerEvents: 'none',
} as const

/**
 * What answers a dismissal before the layer's toggle, where anything does:
 * a close request on a page below the top goes back a page, as the web's
 * menu leaves a page on Escape, and a machine before the layer may answer
 * for it, as a tour stop skips its tour.
 */
export const answeredFirst = (
  by: 'outside' | 'request' | 'swipe',
  {
    asked,
    open,
    stacked,
  }: {
    readonly asked?: Around['layering'] | undefined
    readonly open: boolean
    readonly stacked?: Around['stacked'] | undefined
  },
): boolean | undefined => {
  if (!open) {
    return undefined
  }
  if (by === 'request' && stacked?.leave?.() === true) {
    return true
  }
  return asked?.dismiss?.(by)
}

/** Tells the machine that answers for the layer whether focus is inside it, and its view. */
export const tellBack = (
  asked: Around['layering'] | undefined,
  holds: () => boolean,
  view: unknown,
): void => {
  if (asked !== undefined) {
    asked.holds = holds
    asked.view = () => view
  }
}

/**
 * What the layer's own view takes beside its handlers: a modal layer holds
 * the reader, what the layer holds is reached on its own, where a tooltip
 * is one thing a reader hears, a notice takes no touch of its own, so a
 * touch between its messages reaches the app under it, and a look alone
 * takes none and reaches no screen reader.
 */
export const partView = ({
  decorative,
  modal,
  notice,
  tooltip,
}: {
  readonly decorative: boolean
  readonly modal: boolean
  readonly notice: boolean
  readonly tooltip: boolean
}): Readonly<Record<string, unknown>> => ({
  ...(modal ? { accessibilityViewIsModal: true } : {}),
  ...(tooltip ? {} : { accessible: false }),
  ...(notice ? { pointerEvents: 'box-none' } : {}),
  ...(decorative ? HIDDEN : {}),
})
