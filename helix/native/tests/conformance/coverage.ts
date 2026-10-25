import type { Compiled } from '@fusion.dev/helix-core/machines/compiled'
import { indicator } from '@fusion.dev/helix-core/machines/indicator/machine'
import { multipleSelection } from '@fusion.dev/helix-core/machines/multiple-selection/machine'
import { press } from '@fusion.dev/helix-core/machines/press/machine'
import { type Chart, Reference } from '@fusion.dev/helix-core/machines/reference'
import { reorder } from '@fusion.dev/helix-core/machines/reorder/machine'
import { rovingFocus } from '@fusion.dev/helix-core/machines/roving-focus/machine'
import type { Host, Platform, Runner } from '@fusion.dev/helix-core/machines/runner'
import { singleSelection } from '@fusion.dev/helix-core/machines/single-selection/machine'
import type { Answer } from '@fusion.dev/helix-core/machines/statechart'
import { toggle } from '@fusion.dev/helix-core/machines/toggle/machine'
import { typeahead } from '@fusion.dev/helix-core/machines/typeahead/machine'

/*
 * Which transitions of each machine the conformance scenarios take. The
 * spec runs every machine through `watch`, which reads each step the slow
 * way, with the reference interpreter, to name the way the machine went.
 *
 * **A transition is one way a state answers an event**, the way a guard
 * picks in the order the machine writes them, `ignored` included. A request
 * is two, accepted and refused, and a deadline is one.
 */

/** The machines a form names, by the name it gives them. */
const CHARTS: Readonly<Record<string, Chart>> = {
  indicator: indicator as Chart,
  'multiple-selection': multipleSelection as Chart,
  press: press as Chart,
  reorder: reorder as Chart,
  'roving-focus': rovingFocus as Chart,
  'single-selection': singleSelection as Chart,
  toggle: toggle as Chart,
  typeahead: typeahead as Chart,
}

type Choice = Exclude<Answer<string, unknown, unknown, string>, readonly unknown[]>

const choicesOf = (answer: unknown): readonly Choice[] =>
  (Array.isArray(answer) ? answer : [answer]) as readonly Choice[]

/** One way in words: its state, its event, its place, and its guard or what it does. */
const named = (state: string, event: string, choice: Choice, at: number): string => {
  if (choice === 'ignore') {
    return `${state} ${event} #${at + 1} ignored`
  }
  const target = 'target' in choice && choice.target !== undefined ? ` to ${choice.target}` : ''
  return `${state} ${event} #${at + 1} ${choice.guard?.name ?? 'always'}${target}`
}

/**
 * Every transition of a machine, in the order it is written. A state in a
 * region that ignores an event entirely leaves it to another region, so that
 * answer is no transition.
 */
export const transitionsOf = (chart: Chart): string[] =>
  new Reference(chart).states.flatMap((held) => [
    ...Object.entries(held.node.on ?? {}).flatMap(([event, answer]) => {
      const choices = choicesOf(answer)
      if (held.region !== undefined && choices.every((choice) => choice === 'ignore')) {
        return []
      }
      return choices.flatMap((choice, at) => {
        const one = named(held.name, event, choice, at)
        return typeof choice === 'object' && 'ask' in choice
          ? [`${one}, accepted`, `${one}, refused`]
          : [one]
      })
    }),
    ...(held.node.after === undefined ? [] : [`${held.name} after its deadline`]),
  ])

/** The machine a compiled module runs, found by its states and events. */
const shapeOf = (states: readonly string[], events: readonly string[]): string =>
  JSON.stringify([states, events])

const SHAPES = new Map(
  Object.entries(CHARTS).map(([name, chart]) => {
    const reference = new Reference(chart)
    const states = reference.configs.map((config) => config.name)
    return [shapeOf(states, chart.events), { name, reference }] as const
  }),
)

/** The family whose scenario is running, which each transition taken is counted for. */
let running: string | undefined

/** Each family's transitions taken, by machine. */
const TAKEN = new Map<string, Map<string, Set<string>>>()

const note = (machine: string, transition: string): void => {
  if (running === undefined) {
    return
  }
  const family = TAKEN.get(running) ?? new Map<string, Set<string>>()
  TAKEN.set(running, family)
  const taken = family.get(machine) ?? new Set<string>()
  family.set(machine, taken)
  taken.add(transition)
}

/** Counts what runs from here on for `family`, or for nobody. */
export const countFor = (family: string | undefined): void => {
  running = family
}

/** The way `reference` goes from `state` on `event`, in words, or `undefined` where none answers. */
const wayOf = (
  reference: Reference,
  state: number,
  event: string,
  context: unknown,
  input: unknown,
): { readonly asks: boolean; readonly name: string } | undefined => {
  const found = reference.answer(state, event)
  if (found === undefined) {
    return undefined
  }
  const [leaf, answer] = found
  const own = reference.states[leaf]
  const owner = own?.node.on?.[event] !== undefined ? own : reference.states[own?.parent ?? -1]
  const choices = choicesOf(answer)
  for (const [at, choice] of choices.entries()) {
    if (choice !== 'ignore' && choice.guard !== undefined && !choice.guard(context, input)) {
      continue
    }
    return {
      asks: typeof choice === 'object' && 'ask' in choice,
      name: named(owner?.name ?? '', event, choice, at),
    }
  }
  return undefined
}

/**
 * `run`, with each step of a machine the conformance suite knows counted as
 * the transition it took. Stands in for the runner's `run` in the spec.
 */
export const watch = <C, I, E extends string>(
  run: (
    machine: Compiled<C, I>,
    context: C,
    host: Host<C, E, I>,
    platform: Platform<C>,
  ) => Runner<C, I>,
  machine: Compiled<C, I>,
  context: C,
  host: Host<C, E, I>,
  platform: Platform<C>,
): Runner<C, I> => {
  const known = SHAPES.get(shapeOf(machine.STATES, machine.EVENTS))
  if (known === undefined) {
    return run(machine, context, host, platform)
  }
  let asking: string | undefined
  const watched: Compiled<C, I> = {
    ...machine,
    expire: (state, now, owner) => {
      note(known.name, `${known.reference.states[owner]?.name ?? ''} after its deadline`)
      return machine.expire(state, now, owner)
    },
    step: (state, now, event, input) => {
      const way = wayOf(known.reference, state, machine.EVENTS[event] ?? '', now, input)
      if (way?.asks === true) {
        asking = way.name
      } else if (way !== undefined) {
        note(known.name, way.name)
      }
      return machine.step(state, now, event, input)
    },
  }
  const answering: Platform<C> = {
    ...platform,
    ask: (events, proposed, now) => {
      const accepted = platform.ask(events, proposed, now)
      if (asking !== undefined) {
        note(known.name, `${asking}, ${accepted ? 'accepted' : 'refused'}`)
        asking = undefined
      }
      return accepted
    },
  }
  return run(watched, context, host, answering)
}

/** One machine's coverage: the transitions taken, and those that were not. */
export interface Covered {
  readonly machine: string
  readonly missed: readonly string[]
  readonly taken: readonly string[]
}

/** What a family's scenarios took of each machine its elements bind. */
export const coverageOf = (family: string, machines: readonly string[]): Covered[] =>
  machines.flatMap((machine) => {
    const chart = CHARTS[machine]
    if (chart === undefined) {
      return []
    }
    const all = transitionsOf(chart)
    const taken = TAKEN.get(family)?.get(machine) ?? new Set<string>()
    return [
      {
        machine,
        missed: all.filter((one) => !taken.has(one)),
        taken: all.filter((one) => taken.has(one)),
      },
    ]
  })
