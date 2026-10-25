import type { Asked, Done, Moved } from './compiled.js'
import type { Answer, Effect, Outcome, Request, Statechart, StateNode, Way } from './statechart.js'

export type { Asked, Done, Moved } from './compiled.js'

/*
 * A machine's data read the slow way: the format's meaning written a second
 * time, apart from the compiler, so a spec can hold a compiled module to it.
 * No module the package exports imports it.
 *
 * States are read depth first in the order the module writes them. The
 * module can be in a leaf, or in one leaf of each region of a parallel state,
 * and a move is external from the leaf that answered: it leaves the states
 * below the nearest state holding both that leaf and the target, deepest
 * first, runs its own effects, and enters the target's states, outermost
 * first.
 */

/** A chart with its type parameters set aside, which the reference reads as plain data. */
// biome-ignore lint/suspicious/noExplicitAny: the reference reads any machine's data
export type Chart = Statechart<string, string, any, any, string>

type Node = StateNode<string, string, unknown, unknown, string>
type AnyWay = Way<string, unknown, unknown, string>
type AnyRequest = Request<string, unknown, unknown, string>
type Choice = AnyWay | AnyRequest | 'ignore'

/** One state as the reference holds it. */
export interface Held {
  readonly name: string
  readonly node: Node
  readonly parent: number | undefined
  readonly region: string | undefined
}

/** An answer's choices, with a lone choice as a list of one. */
const choicesOf = (answer: Answer<string, unknown, unknown, string>): readonly Choice[] =>
  (Array.isArray(answer) ? answer : [answer]) as readonly Choice[]

/** Whether an answer moves nothing, whichever guard passes. */
const ignored = (answer: Answer<string, unknown, unknown, string>): boolean =>
  choicesOf(answer).every((one) => one === 'ignore')

/** Every choice of every state, in written order. */
export const choicesIn = (states: readonly Held[]): readonly Choice[] =>
  states.flatMap((one) =>
    Object.values(one.node.on ?? {}).flatMap((answer) =>
      answer === undefined ? [] : choicesOf(answer),
    ),
  )

/** The events a choice asks with, where it is a request. */
const asksOf = (choice: Choice): readonly string[] => {
  if (typeof choice !== 'object' || !('ask' in choice)) {
    return []
  }
  return typeof choice.ask === 'string' ? [choice.ask] : choice.ask
}

/** Every state, depth first in written order. */
export const held = (chart: Chart): Held[] => {
  const out: Held[] = []
  const visit = (states: Record<string, Node | undefined>, parent?: number, region?: string) => {
    for (const [name, node] of Object.entries(states)) {
      if (node === undefined) {
        continue
      }
      const index = out.push({ name, node, parent, region }) - 1
      visit(node.states ?? {}, index)
      for (const [named, inner] of Object.entries(node.regions ?? {})) {
        visit(inner.states, index, named)
      }
    }
  }
  visit(chart.states)
  return out
}

/** The leaves of a parallel state's region, in written order. */
const regionLeaves = (states: Held[], parallel: number, region: string): number[] =>
  states.flatMap((one, index) => (one.parent === parallel && one.region === region ? [index] : []))

/** Each state a compiled module can be in, by its leaves, with its name. */
export const configurations = (states: Held[]): { leaves: number[]; name: string }[] =>
  states.flatMap((one, index) => {
    if (one.node.regions !== undefined) {
      let products: number[][] = [[]]
      for (const region of Object.keys(one.node.regions)) {
        const leaves = regionLeaves(states, index, region)
        products = products.flatMap((so) => leaves.map((leaf) => [...so, leaf]))
      }
      return products.map((leaves) => ({
        leaves,
        name: `${one.name}(${leaves.map((leaf) => states[leaf]?.name).join(', ')})`,
      }))
    }
    const leaf = one.node.states === undefined && one.region === undefined
    return leaf ? [{ leaves: [index], name: one.name }] : []
  })

/** The steps from the top to a state: states, and regions as `region:<name>`. */
const chain = (states: Held[], node: number): string[] => {
  const steps = [String(node)]
  let at = node
  for (let parent = states[at]?.parent; parent !== undefined; parent = states[at]?.parent) {
    const region = states[at]?.region
    if (region !== undefined) {
      steps.unshift(`${parent}/${region}`)
    }
    steps.unshift(String(parent))
    at = parent
  }
  return steps
}

/** The active states of a configuration, with how deep each is. */
const active = (states: Held[], leaves: readonly number[]): [node: number, depth: number][] => {
  const found = new Map<number, number>()
  for (const leaf of leaves) {
    chain(states, leaf).forEach((step, depth) => {
      if (!step.includes('/')) {
        found.set(Number(step), depth)
      }
    })
  }
  return [...found]
}

const find = (states: Held[], name: string): number => states.findIndex((one) => one.name === name)

/** The steps two chains share from the top. */
const shared = (first: readonly string[], second: readonly string[]): string[] => {
  let at = 0
  while (at < first.length && at < second.length && first[at] === second[at]) {
    at += 1
  }
  return second.slice(0, at)
}

/** The leaves a target enters, from the leaves the machine is in. */
const resolve = (states: Held[], target: number, current: readonly number[]): number[] => {
  const held = states[target]
  const node = held?.node
  if (node?.states !== undefined) {
    return resolve(states, find(states, node.initial ?? ''), current)
  }
  if (node?.regions !== undefined) {
    return Object.values(node.regions).map((region) => find(states, region.initial))
  }
  const parallel = held?.parent
  const regions = parallel === undefined ? undefined : states[parallel]?.node.regions
  if (held?.region === undefined || parallel === undefined || regions === undefined) {
    return [target]
  }
  return Object.entries(regions).map(([name, region]) => {
    if (name === held.region) {
      return target
    }
    const kept = current.find(
      (leaf) => states[leaf]?.parent === parallel && states[leaf]?.region === name,
    )
    return kept ?? find(states, region.initial)
  })
}

/** The machine, read once, with what every move needs. */
export class Reference {
  readonly configs: { leaves: number[]; name: string }[]
  readonly effects: readonly string[]
  readonly states: Held[]

  constructor(readonly chart: Chart) {
    this.states = held(chart)
    this.configs = configurations(this.states)
    const deadlines = this.states.some((one) => one.node.after !== undefined)
    this.effects = [...chart.effects, ...(deadlines ? ['deadline', 'deadline-end'] : [])]
  }

  /** A configuration's number, from its leaves. */
  configOf(leaves: readonly number[]): number {
    return this.configs.findIndex((config) => config.leaves.join() === leaves.join())
  }

  /** An effect as a compiled module numbers it. */
  done(effect: Effect<string>): Done {
    if (typeof effect === 'string') {
      return [this.effects.indexOf(effect)]
    }
    return [this.effects.indexOf(effect.effect), effect.with]
  }

  enterEffects(node: number): Done[] {
    const state = this.states[node]?.node
    const own = (state?.entry ?? []).map((effect) => this.done(effect))
    const ms = state?.after?.ms
    return ms === undefined
      ? own
      : [...own, [this.effects.indexOf('deadline'), { ms, owner: node }]]
  }

  exitEffects(node: number): Done[] {
    const state = this.states[node]?.node
    const own = (state?.exit ?? []).map((effect) => this.done(effect))
    const ends: Done[] =
      state?.after === undefined ? [] : [[this.effects.indexOf('deadline-end'), { owner: node }]]
    return [...ends, ...own]
  }

  /** The states a move leaves and enters, below the nearest state holding both. */
  private between(from: number, to: number, by: number | undefined, target: number) {
    const towards = chain(this.states, target)
    const around = by === undefined ? undefined : chain(this.states, by)
    const domain =
      around === undefined
        ? []
        : around.includes(String(target))
          ? towards.slice(0, -1)
          : shared(around, towards)
    const below = (node: number) => {
      const steps = chain(this.states, node)
      return steps.length > domain.length && domain.every((step, at) => steps[at] === step)
    }
    const pick = (config: number) =>
      active(this.states, this.configs[config]?.leaves ?? []).filter(([node]) => below(node))
    const left = pick(from).sort(([a, x], [b, y]) => y - x || a - b)
    const entered = pick(to).sort(([a, x], [b, y]) => x - y || a - b)
    return { entered, left }
  }

  /** The move from configuration `from` by `way`, answered by `by`, or by nothing for a cancel. */
  plan<C, I>(
    from: number,
    by: number | undefined,
    way: Outcome<string, C, I, string>,
    context: C,
    input: I,
  ): Moved<C> {
    const updated = way.update === undefined ? context : way.update(context, input)
    const own = (way.effects ?? []).map((effect) => this.done(effect))
    if (way.target === undefined) {
      return { context: updated, effects: own, state: from }
    }
    const target = find(this.states, way.target)
    const to = this.configOf(resolve(this.states, target, this.configs[from]?.leaves ?? []))
    const { entered, left } = this.between(from, to, by, target)
    const effects = [
      ...left.flatMap(([node]) => this.exitEffects(node)),
      ...own,
      ...entered.flatMap(([node]) => this.enterEffects(node)),
    ]
    return this.finish({ context: updated, effects, state: to }, input)
  }

  /** A move that leaves every region of a parallel state final takes its `done`. */
  private finish<C, I>(moved: Moved<C>, input: I): Moved<C> {
    const leaves = this.configs[moved.state]?.leaves ?? []
    const first = this.states[leaves[0] ?? -1]
    const parallel = first?.region === undefined ? undefined : first.parent
    const done = parallel === undefined ? undefined : this.states[parallel]?.node.done
    const final = leaves.every((leaf) => this.states[leaf]?.node.final === true)
    if (done?.target === undefined || !final) {
      return moved
    }
    const after = this.plan(
      moved.state,
      parallel,
      done as Outcome<string, C, I, string>,
      moved.context,
      input,
    )
    return { ...after, effects: [...moved.effects, ...after.effects] }
  }

  /** What a configuration answers an event with, and the leaf that answers. */
  answer(
    config: number,
    event: string,
  ): [by: number, answer: Answer<string, unknown, unknown, string>] | undefined {
    const leaves = this.configs[config]?.leaves ?? []
    const single = leaves.length === 1 && this.states[leaves[0] ?? -1]?.region === undefined
    for (const leaf of leaves) {
      const answer = this.answerOf(leaf, single, event)
      if (answer !== undefined && (single || !ignored(answer))) {
        return [leaf, answer]
      }
    }
    return undefined
  }

  /** A leaf's own answer, or, outside a region, its parent's. */
  private answerOf(leaf: number, single: boolean, event: string) {
    const own = this.states[leaf]?.node.on?.[event]
    const parent = this.states[leaf]?.parent
    return (
      own ?? (single && parent !== undefined ? this.states[parent]?.node.on?.[event] : undefined)
    )
  }

  /** What `step` returns, read the slow way. */
  step<C, I>(config: number, event: string, context: C, input: I): Moved<C> | Asked<C> | undefined {
    const found = this.answer(config, event)
    if (found === undefined) {
      return undefined
    }
    const [by, answer] = found
    const choices: readonly Choice[] = Array.isArray(answer) ? answer : [answer as Choice]
    for (const choice of choices) {
      if (choice === 'ignore') {
        return undefined
      }
      if (choice.guard !== undefined && !choice.guard(context, input)) {
        continue
      }
      return this.take(config, by, choice as AnyWay | AnyRequest, context, input)
    }
    return undefined
  }

  private take<C, I>(
    config: number,
    by: number,
    choice: AnyWay | AnyRequest,
    context: C,
    input: I,
  ) {
    if ('ask' in choice) {
      const asks = (typeof choice.ask === 'string' ? [choice.ask] : choice.ask) as readonly string[]
      return {
        accept: this.plan(
          config,
          by,
          choice.accept as Outcome<string, C, I, string>,
          context,
          input,
        ),
        ask: asks.map((one) => this.asks().indexOf(one)),
        refuse: this.plan(
          config,
          by,
          choice.refuse as Outcome<string, C, I, string>,
          context,
          input,
        ),
      }
    }
    return this.plan(config, by, choice as Outcome<string, C, I, string>, context, input)
  }

  /** Every event a request asks with, sorted, as the compiled module numbers them. */
  asks(): string[] {
    return [...new Set(choicesIn(this.states).flatMap(asksOf))].sort()
  }

  /** The configuration the machine starts in, from its context. */
  start<C>(context: C): number {
    const way = this.chart.initial.find((one) => one.guard === undefined || one.guard(context))
    return this.configOf(resolve(this.states, find(this.states, way?.target ?? ''), []))
  }

  /** The active states of a configuration, outermost first. */
  activeOf(config: number): number[] {
    return active(this.states, this.configs[config]?.leaves ?? [])
      .sort(([a, x], [b, y]) => x - y || a - b)
      .map(([node]) => node)
  }
}
