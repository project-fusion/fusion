import { useMemo, useRef } from 'react'
import type { MachineUse } from '../ir.generated'
import {
  type Behavior,
  merged,
  type PartBinding,
  type Props,
  type UseBehavior,
} from '../render/behavior'
import type { Pager } from '../render/scroll'
import type { Family } from '../style/form'
import { aroundToolbar } from './axis'
import type { Around, Binder } from './binder'
import { useColor } from './color'
import { useColorField } from './color-field'
import { type Copied, useCopy } from './copy'
import { standsOpen, useReportOpen } from './disclosed'
import { type Entered, useEntry } from './entry'
import { useFiles } from './files'
import { HOOKS, leaving } from './hosted'
import { useJoin } from './join'
import { layering } from './layer'
import { mixedItem } from './mixed-item'
import { mixingSet } from './mixed-set'
import { heardBy, useNotice, useNoticeStack, useNotices } from './notices'
import { usePage } from './page'
import { pressing } from './pressing'
import { boundTo } from './props'
import { useRange } from './range'
import { useReorderItem } from './reorder-item'
import { useSplit } from './resize'
import { useScale } from './scale'
import { scrollersOf } from './scrolling'
import { setting } from './setting'
import { spinShaping, useSpin } from './spin'
import { stacking } from './stack'
import { stackRow } from './stack-row'
import { useTour } from './tour'
import { useTourStop } from './tour-stop'
import { settingTurns, turning, turnsAlone } from './turns'
import { type Judged, useValidation } from './validation'

export { scrollingOf } from './scrolling'

/** No methods beside `validate`, one object for every render so the ref keeps its handle. */
const NO_HANDLE: Readonly<Record<string, unknown>> = {}

/** The machines that hold a set's choice, one of which a set binds. */
const SELECTIONS: ReadonlySet<string> = new Set([
  'marked-set',
  'multiple-selection',
  'single-selection',
])

/**
 * Hosts the verdict on a form control's answer, where its form binds one: an
 * answer is missing while its toggle is not checked, while its field holds no
 * text, while its set has nothing chosen, or while its row of steps has no
 * score, and never for a range moved along a track. A field's text is held
 * to its own constraint as well.
 */
const validating = (
  family: Family,
  uses: readonly MachineUse[],
): ((props: Props, around: Around) => Judged | undefined) => {
  const use = uses.find((each) => each.machine === 'validation')
  if (use === undefined) {
    return () => undefined
  }
  const toggles = boundTo(use, 'checked', 'prop') !== undefined
  const types = boundTo(use, 'value', 'prop') !== undefined
  /* A range moved along a track always holds a value, so its answer is
     never missing. A score picked from a row of steps is missing until one
     is picked, which the scale holds as its choice. */
  const ranges =
    boundTo(use, 'ranged', 'prop') !== undefined && !uses.some((each) => each.machine === 'scale')
  return (props, around) =>
    useValidation(
      family,
      props,
      use,
      around.handle.current,
      types
        ? {
            empty: (around.entered?.value ?? '') === '',
            number: around.spun.current ?? around.entered?.number,
            text: around.entered,
          }
        : {
            empty: ranges
              ? false
              : toggles
                ? around.toggled?.checked !== true
                : (around.chosen.current ?? '') === '',
            /* A color's text that is no color is the verdict's as a number's is. */
            number: around.spun.current,
          },
    )
}

/** What a machine hosted on its own gives the element's drawing, where it is hosted. */
const behaviorOf = (hosted: { readonly behavior: Behavior } | undefined): readonly Behavior[] =>
  hosted === undefined ? [] : [hosted.behavior]

/**
 * The pager each scrolling part hands its binding as it is drawn, kept by
 * the part's name, and the bindings that take them.
 */
const usePagers = (
  scrollers: readonly string[],
): { readonly paged: Behavior; readonly pagers: Map<string, Pager> } => {
  const pagers = useRef(new Map<string, Pager>()).current
  const paged = useMemo(() => {
    const parts: Record<string, PartBinding> = {}
    for (const name of scrollers) {
      const pager = (handed: Pager | null) => {
        if (handed === null) {
          pagers.delete(name)
        } else {
          pagers.set(name, handed)
        }
      }
      parts[name] = { view: { pager } }
    }
    return { marks: [], parts }
  }, [pagers, scrollers])
  return { paged, pagers }
}

/** Draws an item by the grip its form names, as its set moves it. */
const gripping =
  (family: Family): Binder =>
  (_props, around) =>
    useReorderItem(family, around.joined)

/**
 * The hook that hosts the machines `family` binds, which `element` draws
 * with. **The machines are read once, as the element is made**, so each
 * render runs the same hooks in the same order: the item's join, the
 * element's toggle, the set's selection, moves, and keys, a press for each
 * part that takes one, the page it follows, the moves of an item whose form names a grip, the
 * verdict on a form control's answer, and the direction of an element that
 * runs across a toolbar. Last, whether it stands open, which it tells the
 * element around that names a `disclosed` state.
 *
 * A machine with no native binder yet binds nothing.
 */
export const behaviorFor = (family: Family): UseBehavior => {
  const uses = family.machines ?? []
  const select = uses.find((use) => SELECTIONS.has(use.machine))
  const set = uses.find((use) => use.machine === 'toggle-set')
  const mixed = uses.find((use) => use.machine === 'mixed-set')
  const binders: Binder[] = [
    ...(select === undefined ? [] : [setting(family, uses, select)]),
    ...(set === undefined ? [] : [settingTurns(family, set)]),
    ...(mixed === undefined ? [] : [mixingSet(family, uses, mixed)]),
    ...uses.filter((use) => use.machine === 'mixed-item').map((use) => mixedItem(family, use)),
    ...uses.filter((use) => use.machine === 'stack').map((use) => stacking(family, use)),
    ...uses.filter((use) => use.machine === 'stack-row').map((use) => stackRow(family, use)),
    /* A stack of messages before its layer, which opens while it holds one. */
    ...uses
      .filter((use) => use.machine === 'notices')
      .map(
        (use): Binder =>
          (props) =>
            useNotices(family, props, use),
      ),
    /* A tour and its stops before their layers, which open as they stand. */
    ...uses
      .filter((use) => use.machine === 'tour')
      .map(
        (use): Binder =>
          (props, around) =>
            useTour(family, props, use, around.toggled),
      ),
    ...uses
      .filter((use) => use.machine === 'tour-stop')
      .map(
        (use): Binder =>
          (props, around) =>
            useTourStop(family, props, use, around),
      ),
    /* A value moved along a track, which a move touches the verdict on. */
    ...uses
      .filter((use) => use.machine === 'range')
      .map(
        (use): Binder =>
          (props, around) =>
            useRange(family, props, use, around.touch),
      ),
    /* A score picked from a row of steps, which a choice touches the verdict
       on, and which the verdict reads as its answer. */
    ...uses
      .filter((use) => use.machine === 'scale')
      .map(
        (use): Binder =>
          (props, around) => {
            const { behavior, value } = useScale(family, props, use, around.touch)
            around.chosen.current = value
            return behavior
          },
      ),
    /* The files a reader picks, which the verdict reads as its answer, and
       whose methods the element's ref holds. */
    ...uses
      .filter((use) => use.machine === 'files')
      .map(
        (use): Binder =>
          (props, around) => {
            const { behavior, handle, names } = useFiles(family, props, use, around.touch)
            around.chosen.current = names
            around.handle.current = handle
            return behavior
          },
      ),
    /* The color a reader builds, which the verdict reads as its answer. */
    ...uses
      .filter((use) => use.machine === 'color')
      .map(
        (use): Binder =>
          (props, around) => {
            const { behavior, flawed, value } = useColor(family, props, use, around.touch)
            around.chosen.current = value
            around.spun.current = flawed ? { flaw: { flag: 'badInput' }, locale: '' } : undefined
            return behavior
          },
      ),
    /* What a field that opens a color picker computes from its text. */
    ...uses
      .filter((use) => use.machine === 'color-field')
      .map(
        (use): Binder =>
          (props, around) => {
            const { behavior, flawed } = useColorField(family, props, use, around.entered)
            around.spun.current = flawed ? { flaw: { flag: 'badInput' }, locale: '' } : undefined
            return behavior
          },
      ),
    /* The divider of a split a reader moves between two panes. */
    ...uses
      .filter((use) => use.machine === 'resize')
      .map(
        (use): Binder =>
          (props) =>
            useSplit(family, props, use),
      ),
    /* A number a reader types and steps, which steps the text its entry holds. */
    ...uses
      .filter((use) => use.machine === 'spin')
      .map(
        (use): Binder =>
          (props, around) => {
            const { behavior, spun } = useSpin(family, props, use, around.entered)
            around.spun.current = spun
            return behavior
          },
      ),
    /* The layer before the presses, which read what it gives its anchor. */
    ...uses.filter((use) => use.machine === 'layer').map((use) => layering(family, use)),
    ...uses.filter((use) => use.machine === 'press').map((use) => pressing(family, use)),
    /* A message's place in its stack before its countdown, which waits while it does. */
    ...uses
      .filter((use) => use.machine === 'notice')
      .map(
        (use): Binder =>
          (_props, around) =>
            useNotice(use, around.toggled),
      ),
    /* The machines a hook hosts on its own, each in the order the form binds it. */
    ...uses.flatMap((use): Binder[] => {
      const host = HOOKS[use.machine]
      return host === undefined
        ? []
        : [(props, around) => host(family, props, use, around.bound, around.toggled)]
    }),
    /* The page it follows, which an open folded region keeps it in view over. */
    ...uses
      .filter((use) => use.machine === 'page')
      .map(
        (use): Binder =>
          (props, around) =>
            usePage(family, props, use, around.toggled?.checked === true),
      ),
    ...(family.api?.item?.grip === undefined ? [] : [gripping(family)]),
    ...(leaving(family, uses) ?? []),
  ]
  const scrollers = scrollersOf(family, uses)
  const turns = turning(family, uses)
  const judges = validating(family, uses)
  const axisOf = aroundToolbar(family)
  const entering = uses.find((use) => use.machine === 'entry')
  /* A number a reader types and steps shapes the text its entry holds. */
  const spinning = uses.find((use) => use.machine === 'spin')
  const enterer =
    entering === undefined
      ? (): Entered | undefined => undefined
      : (props: Props, touch: () => void): Entered | undefined =>
          useEntry(
            family,
            props,
            entering,
            touch,
            spinning === undefined ? undefined : spinShaping(family, props, spinning),
          )
  const copying = uses.find((use) => use.machine === 'copy')
  const copier =
    copying === undefined
      ? (): Copied | undefined => undefined
      : (props: Props): Copied | undefined => useCopy(family, props, copying)
  return (_family, passed) => {
    /* A message hears what the stack around it hears of it, after its own handler. */
    const props = heardBy(useNoticeStack(family), passed)
    const joined = useJoin(family, props)
    /* A turn touches the verdict, which is hosted after the toggle. */
    const touched = useRef<() => void>(() => undefined)
    const toggled = turns(props, () => touched.current(), joined)
    const axis = axisOf(props)
    const { paged, pagers } = usePagers(scrollers)
    const chosen = useRef<string | undefined>(undefined)
    const copied = copier(props)
    const entered = enterer(props, () => touched.current())
    const bound: Behavior[] = []
    const touch = () => touched.current()
    const around: Around = {
      anchored: {},
      bound,
      chosen,
      copied,
      entered,
      handle: { current: entered?.methods ?? NO_HANDLE },
      joined,
      layering: {},
      pagers,
      spun: { current: undefined },
      stacked: {},
      toggled,
      touch,
    }
    for (const bind of binders) {
      bound.push(bind(props, around))
    }
    const judged = judges(props, around)
    touched.current = judged?.touch ?? (() => undefined)
    const behavior = merged(
      ...(joined === undefined ? [] : [joined.behavior]),
      paged,
      /* A set says whether its item is chosen, in place of the item's toggle. */
      ...(toggled === undefined || !turnsAlone(joined) ? [] : [toggled.behavior]),
      ...bound,
      ...behaviorOf(copied),
      ...behaviorOf(entered),
      ...behaviorOf(judged),
      axis,
    )
    /* An element that stands open tells the element around it, as a
       navigation is open while a megamenu among its destinations is. */
    useReportOpen(standsOpen(family, behavior, toggled))
    return behavior
  }
}
