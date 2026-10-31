import type { Left, Setup } from '@fusion.dev/helix-testing/conformance'
import { screen } from '@testing-library/react-native'
import { rowNode } from './inspector'
import type { Run, View } from './views'

/*
 * Carousel, as the React Native half of the conformance suite finds its presses
 * and reads what a screen reader hears of its panes and dots.
 */

/** Whether the setup draws a carousel. */
export const carousels = (setup: Setup): boolean => setup.tag === 'helix-carousel'

const viewsWhere = (test: (node: View) => boolean): View[] =>
  (screen.root?.queryAll((node: View) => node.type === 'View' && test(node), {
    includeHiddenElements: true,
  } as never) ?? []) as unknown as View[]

const buttons = (): View[] => viewsWhere((node) => node.props.accessibilityRole === 'button')

const nameOf = (node: View): string => String(node.props.accessibilityLabel ?? '')

/** What the setup calls each arrow. */
const arrowNames = (setup: Setup): readonly [previous: string, next: string] => [
  String(setup.props?.['previous-label'] ?? 'Previous slide'),
  String(setup.props?.['next-label'] ?? 'Next slide'),
]

/** Whether a button is the rotation control. */
const isRotation = (node: View): boolean => /rotation/.test(nameOf(node))

/** The dots, in the order they stand. */
const dots = (setup: Setup): View[] => {
  const arrows = arrowNames(setup)
  return buttons().filter((node) => !isRotation(node) && !arrows.includes(nameOf(node)))
}

/** The press of a part, or of a dot by its place. */
export const carouselPress = (
  setup: Setup,
  part: string | undefined,
  row: number | undefined,
): View | undefined => {
  if (row !== undefined) {
    return dots(setup)[row]
  }
  const [previous, next] = arrowNames(setup)
  const all = buttons()
  switch (part) {
    case 'next':
      return all.find((node) => nameOf(node) === next)
    case 'previous':
      return all.find((node) => nameOf(node) === previous)
    case 'rotation':
      return all.find(isRotation)
    default:
      return undefined
  }
}

/** The dot at a place, for a focus intent. */
export const carouselDot = (setup: Setup, row: number): View | undefined => dots(setup)[row]

const disabledOf = (node: View | undefined): boolean =>
  node?.props.accessibilityState?.disabled === true

/** What a carousel says of its panes and its dots, and which dot has focus. */
export const carouselLeft = (run: Run): Pick<Left, 'carousel'> => {
  const { setup } = run.scenario
  if (!carousels(setup)) {
    return {}
  }
  const drawn = dots(setup)
  const panes = viewsWhere(
    (node) =>
      node.props.accessibilityRole !== 'button' &&
      typeof node.props.accessibilityHint === 'string' &&
      node.props.accessibilityHint.startsWith('slide'),
  )
  const held = run.focus.focused() as unknown
  const current = drawn.findIndex((node) => node.props.accessibilityValue?.text !== undefined)
  const focused = drawn.findIndex((node) => held !== null && rowNode(run, node) === held)
  return {
    carousel: {
      current: current < 0 ? null : current,
      dots: drawn.map(nameOf),
      focused: focused < 0 ? null : focused,
      next: disabledOf(carouselPress(setup, 'next', undefined)),
      panes: panes.map(nameOf),
      previous: disabledOf(carouselPress(setup, 'previous', undefined)),
      rotation: buttons().find(isRotation) ? nameOf(buttons().find(isRotation) as View) : '',
    },
  }
}
