import { type Left, panelsOf, type Setup } from '@fusion.dev/helix-testing/conformance'
import { screen } from '@testing-library/react-native'
import { colorLeft } from './color'
import { filesLeft } from './files'
import { formOf, HOST_STATES, isElement } from './forms'
import { inspectorLeft } from './inspector'
import { layerIn, PAGE } from './layers'
import { logLeft } from './log'
import { rangeLeft } from './range'
import { tableLeft } from './table'
import { textLeft } from './text'
import { treeLeft } from './tree'
import { inPress, itemsIn, nodeOf, pressOf, type Run, readsIn, triggerOf, wordsOf } from './views'
import { windowLeft } from './window'

/*
 * What a scenario's setup shows after an intent, as the React Native half
 * of the conformance suite reads it: from what the components tell a screen
 * reader, and from what their machines last told their hosts.
 */

/**
 * What the setup holds focus on: an item's value, or the element's tag
 * where focus is on anything else it draws, as a tag group's `empty` part,
 * or `null`.
 */
const focusedIn = (run: Run): string | null => {
  const at = run.focus.focused()
  if (at === null) {
    return null
  }
  if (at === PAGE) {
    return 'page'
  }
  return (
    itemsIn(run).find((item) => inPress(item.words) && nodeOf(run, item.words) === at)?.value ??
    itemsIn(run).find((item) => holds(at, item.words))?.value ??
    run.scenario.setup.tag
  )
}

/**
 * Whether the view with focus holds an item's words, as a tour stop's
 * panel does, which takes focus itself where the web's panel does.
 */
const holds = (at: unknown, words: string): boolean =>
  words !== '' &&
  screen.queryAllByText(words, { includeHiddenElements: true }).some((text) => {
    // biome-ignore lint/suspicious/noExplicitAny: the renderer's fibers are untyped
    for (let fiber: any = text.unstable_fiber; fiber; fiber = fiber.return) {
      if (fiber.stateNode === at) {
        return true
      }
    }
    return false
  })

/**
 * The values of the stops a tour shows, as each stop's machine last told
 * its host, for a setup whose items are a tour's stops.
 */
const stopsIn = (run: Run): readonly string[] | undefined => {
  const stops = (run.scenario.setup.children ?? []).filter(
    (child) =>
      typeof child !== 'string' &&
      isElement(child.tag) &&
      formOf(child.tag).api?.stop !== undefined,
  )
  if (stops.length === 0) {
    return undefined
  }
  return itemsIn(run)
    .filter((item) => HOST_STATES.get(`helix-tour-stop#${item.value}`)?.current === true)
    .map((item) => item.value)
}

/**
 * Whether an element that turns on and off is checked, or `mixed`, as its
 * toggling press tells a screen reader, for an element whose form binds a
 * toggle.
 */
const checkedIn = (setup: Setup): Pick<Left, 'checked'> => {
  const form = formOf(setup.tag)
  /* A toggle that closes, as a callout's dismissal, is never checked. */
  if (
    !(form.machines ?? []).some((use) => use.machine === 'toggle') ||
    form.api?.toggle?.closes !== undefined
  ) {
    return {}
  }
  const checked = pressOf(wordsOf(setup, undefined)).props.accessibilityState?.checked
  return { checked: checked === 'mixed' ? 'mixed' : checked === true }
}

/** Whether the trigger of the item around these words says it is expanded, as a section's does. */
export const expanded = (words: string): boolean =>
  triggerOf(words).props.accessibilityState?.expanded === true

/** Whether the setup's items open and close, as an accordion's sections do. */
const opens = (run: Run): boolean => {
  const child = (run.scenario.setup.children ?? []).find((one) => typeof one !== 'string')
  return (
    typeof child === 'object' &&
    isElement(child.tag) &&
    formOf(child.tag).api?.treeItem === undefined &&
    formOf(child.tag).api?.toggle?.opens !== undefined
  )
}

/** The values of the items that stand open, where the items' forms open and close. */
const openIn = (run: Run): Pick<Left, 'open'> =>
  opens(run)
    ? {
        open: itemsIn(run)
          .filter((item) => expanded(item.words))
          .map((item) => item.value),
      }
    : {}

/** Where a copy stands, by the states its machine last gave its host. */
const resultOf = (
  states: Readonly<Record<string, unknown>>,
  copy: { readonly copied: string; readonly failed: string },
): 'copied' | 'failed' | 'resting' => {
  if (states[copy.copied] === true) {
    return 'copied'
  }
  return states[copy.failed] === true ? 'failed' : 'resting'
}

/**
 * How the element's picture stands, where its last copy stands, and whether
 * it waits out a delay, as its machines last told its host: `loaded` where
 * its form runs a load machine, `result` where it declares a `copy`, and
 * `waiting` where it declares a `delay` that names that state.
 */
const statesIn = (run: Run): Pick<Left, 'loaded' | 'result' | 'waiting'> => {
  const { tag } = run.scenario.setup
  const form = formOf(tag)
  const states = HOST_STATES.get(tag) ?? {}
  const loads = (form.machines ?? []).some((use) => use.machine === 'load')
  const delay = form.api?.delay
  const copy = form.api?.copy
  return {
    ...(loads
      ? { loaded: states.loaded === true ? 'loaded' : states.error === true ? 'error' : 'loading' }
      : {}),
    ...(copy === undefined ? {} : { result: resultOf(states, copy) }),
    ...(delay !== undefined && run.scenario.family === 'loader'
      ? { waiting: states[delay.waiting] === true }
      : {}),
  }
}

/**
 * Whether the element's layer stands closed, whose rows are taken away as
 * its exit ends, which the harness does not wait for.
 */
const shut = (run: Run): boolean => layerIn(run).layer === false

/** Whether the element shows a stack of pages. */
const stacked = (run: Run): boolean => formOf(run.scenario.setup.tag).api?.stack !== undefined

/** The values of the rows drawn on the page showing, where the element shows a stack of pages. */
const rowsIn = (run: Run): Pick<Left, 'rows'> =>
  !stacked(run)
    ? {}
    : {
        rows: shut(run)
          ? []
          : itemsIn(run)
              .filter((item) => inPress(item.words))
              .map((item) => item.value),
      }

/** Whether the element's items say themselves which is current, as a navigation's do. */
const marks = (run: Run): boolean => formOf(run.scenario.setup.tag).api?.collection?.marked === true

/**
 * The values of the items a phone says are current, in words after their
 * own, where the element's items say themselves which is current. An item a
 * closed layer holds is not drawn, so it is current in neither record.
 */
const currentIn = (run: Run): Pick<Left, 'current'> =>
  marks(run)
    ? {
        current: itemsIn(run)
          .filter(() => !shut(run))
          .filter((item) => {
            const said = pressOf(item.words).props.accessibilityValue as
              | { readonly text?: string }
              | undefined
            return typeof said?.text === 'string' && said.text !== ''
          })
          .map((item) => item.value),
      }
    : {}

/** What the setup shows now. */
export const leftBy = (run: Run, opened: number): Left => {
  const { setup } = run.scenario
  return {
    ...checkedIn(setup),
    ...openIn(run),
    ...statesIn(run),
    ...layerIn(run),
    /* Chosen as a tab or a row is selected, or as a toggle or a box is
       checked. A section that opens is never chosen, and its words are in
       no press, and an item a closed layer holds is not drawn. */
    chosen: itemsIn(run)
      .filter((item) => {
        if (opens(run) || (stacked(run) && shut(run)) || !inPress(item.words)) {
          return false
        }
        const state = pressOf(item.words).props.accessibilityState
        return state?.selected === true || state?.checked === true
      })
      .map((item) => item.value),
    ...currentIn(run),
    focused: focusedIn(run),
    opened: run.opened.opened.slice(opened),
    ...readsIn(run),
    ...rowsIn(run),
    shown:
      stopsIn(run) ??
      panelsOf(setup)
        .filter((panel) => screen.queryByText(panel.words) !== null)
        .map((panel) => panel.value),
    ...textLeft(run),
    ...rangeLeft(run),
    ...filesLeft(run),
    ...windowLeft(run),
    ...treeLeft(run),
    ...inspectorLeft(run),
    ...logLeft(run, String(HOST_STATES.get(run.scenario.setup.tag)?.selectedLines ?? '')),
    ...tableLeft(run),
    ...colorLeft(run),
  }
}
