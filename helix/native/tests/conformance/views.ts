import type { FakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import type { FakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import type { FakeOpenLink } from '@fusion.dev/helix-core/capabilities/open-link/fake'
import type { FakeTimers } from '@fusion.dev/helix-core/capabilities/timers/fake'
import {
  itemsOf,
  type PropValue,
  type Scenario,
  type Sent,
  type Setup,
  sectionsOf,
} from '@fusion.dev/helix-testing/conformance'
import { screen } from '@testing-library/react-native'
import { wordsOf as drawnWords, nodes } from '../../src/families/drawn'
import type { HelixEvent } from '../../src/machines/props'

/*
 * What the React Native half of the conformance suite holds while a scenario
 * runs, and how it finds an item's views: the press around its words, and
 * the node it listens for keys on.
 */

/** A rendered view, as Testing Library finds it. */
export type View = ReturnType<typeof screen.getByText>

/** What the harness reads and drives while a scenario runs. */
export interface Run {
  /** The fake clock, for a scenario that moves one. */
  readonly clock: FakeTimers | undefined
  readonly focus: FakeFocus<unknown>
  readonly heard: { event: HelixEvent; sent: Omit<Sent, 'canceled'> }[]
  readonly keys: FakeKeys<unknown>
  /** The node each item listens for keys on, in the order they started. */
  readonly listening: unknown[]
  readonly opened: FakeOpenLink
  readonly refused: Set<string>
  /** The events on which the page removes the item that sent them. */
  readonly removes: Set<string>
  /** The values of the items the page has removed. */
  readonly removed: Set<string>
  /** Each event a removing page heard during the intent, with the item that sent it. */
  readonly leaving: { readonly event: HelixEvent; readonly from: string | null }[]
  readonly scenario: Scenario
  /** The props the page has written, by the value of the item, or `null` for the element. */
  readonly sets: Map<string | null, Record<string, PropValue>>
}

/**
 * Whether an element's words are drawn inside a press, as the row of a page
 * that shows is, where the page's title says the same words outside one.
 */
export const inPress = (words: string): boolean =>
  screen.queryAllByText(words, { includeHiddenElements: true }).some((text) => {
    for (let at: View | null = text.parent; at !== null; at = at.parent) {
      if (typeof at.props.onResponderGrant === 'function') {
        return true
      }
    }
    return false
  })

/** The press around an element's words: the nearest view that answers a touch. */
export const pressOf = (words: string, last = false): View => {
  /* The first of the words drawn inside a press, where a title says them too. */
  const texts = screen.queryAllByText(words, { includeHiddenElements: true })
  let at: View | null = null
  for (const text of last ? [...texts].reverse() : texts) {
    let up: View | null = text
    while (up !== null && typeof up.props.onResponderGrant !== 'function') {
      up = up.parent
    }
    if (up !== null) {
      at = up
      break
    }
  }
  if (at === null) {
    throw new Error(`conformance: nothing answers a touch on "${words}"`)
  }
  return at
}

/**
 * The press that opens and closes the item around these words: the nearest
 * press that says whether it is expanded, among the views around the words.
 * **An accordion section's words are its content**, which no press is
 * around, so its trigger is found beside them, inside the section.
 */
export const triggerOf = (words: string): View => {
  let at: View | null = screen.getAllByText(words, { includeHiddenElements: true })[0] ?? null
  while (at !== null) {
    const found = at.queryAll(
      (node) =>
        typeof node.props.onResponderGrant === 'function' &&
        typeof node.props.accessibilityState?.expanded === 'boolean',
    )[0]
    if (found !== undefined) {
      return found
    }
    at = at.parent
  }
  throw new Error(`conformance: no press around "${words}" says whether it is expanded`)
}

/**
 * Whether a press is drawn for the part `part`: a node of that name, which
 * the renderer keys by its name, is among the views around it, as a tour
 * stop's `next` draws a Button.
 */
const drawnFor = (press: View, part: string): boolean => {
  // biome-ignore lint/suspicious/noExplicitAny: the renderer's fibers are untyped
  for (let fiber: any = press.unstable_fiber; fiber; fiber = fiber.return) {
    if (fiber.key === part) {
      return true
    }
  }
  return false
}

/**
 * The press of a part, for the words of the element or item that draws it:
 * the press drawn inside the press around the words, as a tag's dismiss is,
 * or, where no press is around the words, a press beside them, as a
 * callout's dismiss stands beside its content: the one drawn for the part
 * where one is, as a tour stop's Next stands beside its Skip, and the first
 * otherwise.
 */
export const partPressOf = (words: string, part?: string): View | undefined => {
  let around: View | undefined
  try {
    around = pressOf(words)
  } catch {
    around = undefined
  }
  const answers = (node: View) => typeof node.props.onResponderGrant === 'function'
  const pick = (found: readonly View[]) =>
    (part === undefined ? undefined : found.find((one) => drawnFor(one, part))) ?? found[0]
  if (around !== undefined) {
    return pick(around.queryAll(answers))
  }
  for (
    let at: View | null = screen.getAllByText(words, { includeHiddenElements: true })[0] ?? null;
    at !== null;
    at = at.parent
  ) {
    const found = at.queryAll(answers)
    if (found.length > 0) {
      return pick(found)
    }
  }
  return undefined
}

/** The press of the link an outline draws to the section with this id, found by the words its section gives it. */
export const linkOf = (setup: Setup, id: string): View =>
  pressOf(sectionsOf(setup).find((section) => section.id === id)?.label ?? id)

/**
 * The words of the item with this value, or of the element itself: the
 * words it holds, or its `label` where it holds none, as a megamenu's drawn
 * trigger says its label.
 */
export const wordsOf = (setup: Setup, value: string | undefined): string =>
  value === undefined
    ? (setup.children ?? []).filter((child) => typeof child === 'string').join(' ') ||
      String(setup.props?.label ?? '')
    : (itemsOf(setup).find((item) => item.value === value)?.words ?? value)

/** The node an item listens for keys on: the one among `listening` its press is drawn by. */
export const nodeOf = (run: Run, words: string): unknown => {
  const listening = new Set(run.listening)
  // biome-ignore lint/suspicious/noExplicitAny: the renderer's fibers are untyped
  for (let fiber: any = pressOf(words).unstable_fiber; fiber; fiber = fiber.return) {
    if (listening.has(fiber.stateNode)) {
      return fiber.stateNode
    }
  }
  return undefined
}

/**
 * Where focus goes for these words: the view that listens for keys there, as
 * an item and a button do, or else the press around the words.
 */
export const focusable = (run: Run, words: string): unknown => nodeOf(run, words) ?? pressOf(words)

/** The items the setup holds that the page has not removed. */
export const itemsIn = (run: Run) =>
  itemsOf(run.scenario.setup).filter((item) => !run.removed.has(item.value))

/** The families whose words are their reading, whose record says what they read. */
const READS: ReadonlySet<string> = new Set(['format-date', 'timeline'])

/**
 * The words the element draws, for a family whose words are its reading, as
 * a date. **A timeline entry draws its time once for each place a layout
 * may put it**, and the first is the one its own layout shows, so its
 * reading is the first run of words it draws.
 */
export const readsIn = (run: Run): { readonly reads?: string } => {
  if (!READS.has(run.scenario.family)) {
    return {}
  }
  const drawn = nodes(screen.toJSON())
  const read =
    run.scenario.family === 'timeline' ? drawn.filter((one) => one.type === 'Text') : drawn
  return { reads: read.slice(0, 1).map(drawnWords).join('') }
}
