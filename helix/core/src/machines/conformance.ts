import type { Compiled } from './compiled.js'
import { type Chart, choicesIn, type Done, Reference } from './reference.js'

export type { Compiled } from './compiled.js'

/*
 * Holds a compiled module to its machine's data, which is the promise the
 * compiler makes. A spec walks every state the module can be in against
 * every event, every deadline, the cancel, the start, the effects of
 * starting, and the marks, under the contexts and inputs it gives, and
 * expects no difference. No module the package exports imports it.
 */

/** One place a compiled module and its machine part. */
export interface Difference {
  readonly actual: unknown
  readonly at: string
  readonly want: unknown
}

/** At most this many differences are kept, so a broken module fails readably. */
const KEPT = 20

const same = (actual: unknown, want: unknown): boolean => Bun.deepEquals(actual, want)

/** Where the module's names part from the machine's. */
const names = <C, I>(reference: Reference, compiled: Compiled<C, I>): Difference[] => {
  const pairs: [string, unknown, unknown][] = [
    ['STATES', compiled.STATES, reference.configs.map((config) => config.name)],
    ['NODES', compiled.NODES, reference.states.map((one) => one.name)],
    ['EVENTS', compiled.EVENTS, reference.chart.events],
    ['EFFECTS', compiled.EFFECTS, reference.effects],
    ['ASKS', compiled.ASKS, reference.asks()],
  ]
  return pairs
    .filter(([, actual, want]) => !same(actual, want))
    .map(([at, actual, want]) => ({ actual, at, want }))
}

/** Where each state's start, starting effects, and marks part from the machine's. */
const states = <C, I>(
  reference: Reference,
  compiled: Compiled<C, I>,
  contexts: readonly C[],
): Difference[] => {
  const found: Difference[] = []
  contexts.forEach((context, index) => {
    const want = reference.start(context)
    if (compiled.start(context) !== want) {
      found.push({ actual: compiled.start(context), at: `start, context ${index}`, want })
    }
  })
  reference.configs.forEach((config, state) => {
    const active = reference.activeOf(state)
    const entering = active.flatMap((node) => reference.enterEffects(node))
    const marks = active
      .filter((node) => reference.states[node]?.node.mark === true)
      .map((node) => reference.states[node]?.name)
    if (!same(compiled.entering(state), entering)) {
      found.push({
        actual: compiled.entering(state),
        at: `entering ${config.name}`,
        want: entering,
      })
    }
    if (!same(compiled.mark(state), marks)) {
      found.push({ actual: compiled.mark(state), at: `mark ${config.name}`, want: marks })
    }
  })
  return found
}

/** Where each state's answer to each event parts from the machine's. */
const steps = <C, I>(
  reference: Reference,
  compiled: Compiled<C, I>,
  contexts: readonly C[],
  inputs: readonly I[],
): Difference[] => {
  const found: Difference[] = []
  reference.configs.forEach((config, state) => {
    reference.chart.events.forEach((event, code) => {
      contexts.forEach((context, c) => {
        inputs.forEach((input, i) => {
          const actual = compiled.step(state, context, code, input)
          const want = reference.step(state, event, context, input)
          if (found.length < KEPT && !same(actual, want)) {
            found.push({ actual, at: `${config.name} on ${event}, context ${c}, input ${i}`, want })
          }
        })
      })
    })
  })
  return found
}

/** Where each deadline and the cancel part from the machine's. */
const deadlines = <C, I>(
  reference: Reference,
  compiled: Compiled<C, I>,
  contexts: readonly C[],
): Difference[] => {
  const found: Difference[] = []
  reference.configs.forEach((config, state) => {
    contexts.forEach((context, c) => {
      reference.states.forEach((one, owner) => {
        const deadline = one.node.after
        const live = deadline !== undefined && reference.activeOf(state).includes(owner)
        const want = live ? reference.plan(state, owner, deadline, context, undefined) : undefined
        const actual = compiled.expire(state, context, owner)
        if (found.length < KEPT && !same(actual, want)) {
          found.push({ actual, at: `${config.name}, ${one.name}'s deadline, context ${c}`, want })
        }
      })
      const cancel = reference.chart.cancel
      const want =
        cancel === undefined
          ? undefined
          : reference.plan(state, undefined, cancel, context, undefined)
      if (found.length < KEPT && !same(compiled.cancel(state, context), want)) {
        found.push({
          actual: compiled.cancel(state, context),
          at: `${config.name}, cancel, context ${c}`,
          want,
        })
      }
    })
  })
  return found
}

/**
 * Every place a compiled module parts from its machine, under the contexts
 * and inputs given: none, where the compiler kept its promise.
 */
export const conforms = <C, I>(
  chart: Chart,
  compiled: Compiled<C, I>,
  contexts: readonly C[],
  inputs: readonly I[],
): Difference[] => {
  const reference = new Reference(chart)
  return [
    ...names(reference, compiled),
    ...states(reference, compiled, contexts),
    ...steps(reference, compiled, contexts, inputs),
    ...deadlines(reference, compiled, contexts),
  ].slice(0, KEPT)
}

/** A state's number in a compiled module, by its name. */
export const stateOf = <C, I>(compiled: Compiled<C, I>, name: string): number =>
  compiled.STATES.indexOf(name)

/** The names of the effects a move runs, in order, for a spec to read. */
export const effectNames = <C, I>(
  compiled: Compiled<C, I>,
  effects: readonly Done[] | undefined,
): string[] => (effects ?? []).map(([effect]) => compiled.EFFECTS[effect] ?? `${effect}`)

/**
 * Every pair of a state and a guard's answer the contexts and inputs reach,
 * for a spec that holds its samples to cover the machine: each state's name,
 * and each guard's name with `true` or `false`.
 */
export const coverage = <C, I>(
  chart: Chart,
  contexts: readonly C[],
  inputs: readonly I[],
): Set<string> => {
  const reference = new Reference(chart)
  const seen = new Set<string>()
  const guards = new Map<string, (context: C, input: I) => boolean>()
  for (const choice of choicesIn(reference.states)) {
    if (typeof choice === 'object' && choice.guard !== undefined) {
      guards.set(choice.guard.name, choice.guard as (context: C, input: I) => boolean)
    }
  }
  for (const context of contexts) {
    seen.add(reference.configs[reference.start(context)]?.name ?? '')
    for (const input of inputs) {
      for (const [name, guard] of guards) {
        seen.add(`${name} ${guard(context, input)}`)
      }
    }
  }
  return seen
}
