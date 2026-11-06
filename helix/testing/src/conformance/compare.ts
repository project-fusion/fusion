import {
  type DeclaredEvent,
  type Known,
  keyOf,
  type Left,
  type Platform,
  type Recording,
  type Scenario,
  type Sent,
  type Setup,
  type Step,
  type Written,
} from './format.js'

/** One intent whose record parts from the baseline, with both sides. */
export interface Difference {
  /**
   * What the platform recorded: its events and what the intent left.
   */
  readonly actual: unknown
  /**
   * The intent's place in its scenario, counting from 1.
   */
  readonly at: number
  /**
   * What the baseline holds for the same intent.
   */
  readonly expected: unknown
  /**
   * The intent, in words.
   */
  readonly intent: string
  /**
   * The scenario's key.
   */
  readonly scenario: string
}

/** An intent a platform could not perform, and why. */
export interface Unperformed {
  readonly at: number
  readonly cannot: string
  readonly intent: string
  readonly scenario: string
}

/**
 * What a platform keeps of an event before the records are compared: the
 * event, narrowed to the fields compared, or `undefined` for one left out.
 */
export type Keep = (sent: Sent, scenario: Scenario) => Sent | undefined

/** A value as JSON with its keys sorted, so two records compare by what they hold. */
export const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, inner: unknown) =>
    inner !== null && typeof inner === 'object' && !Array.isArray(inner)
      ? Object.fromEntries(
          Object.entries(inner as Readonly<Record<string, unknown>>).sort(([a], [b]) =>
            a < b ? -1 : a > b ? 1 : 0,
          ),
        )
      : inner,
  )

/** What a step holds once its events are narrowed, or `undefined` where it was not performed. */
const held = (
  step: Step,
  scenario: Scenario,
  keep: Keep,
): { events: Sent[]; left: Left } | undefined =>
  'cannot' in step
    ? undefined
    : {
        events: step.events.flatMap((sent) => {
          const kept = keep(sent, scenario)
          return kept === undefined ? [] : [kept]
        }),
        left: step.left,
      }

/** Keeps every event whole, as two browsers are compared. */
export const keepAll: Keep = (sent) => sent

/**
 * The elements of a setup that could have sent an event: the setup's root, or
 * each item with its value. Both halves hear an element with no value from
 * `''`, so every child without one is a candidate, as an outline beside the
 * sections of its page is.
 */
const sendersOf = (setup: Setup, from: string | null): Setup[] =>
  from === null
    ? [setup]
    : (setup.children ?? []).filter(
        (child): child is Setup =>
          typeof child !== 'string' &&
          (child.props?.value === undefined ? '' : String(child.props.value)) === from,
      )

/** The fields of an event's detail its form says it carries. */
const heldDetail = (event: DeclaredEvent, sent: Sent): Record<string, unknown> =>
  JSON.parse(
    JSON.stringify(Object.fromEntries(event.detail.map((field) => [field, sent.detail[field]]))),
  )

/**
 * Keeps an event the sender's neutral form declares, with the detail fields
 * the form says it carries. The rest is one platform's own. Of the elements
 * that share a value, the sender is the first whose form declares the event.
 */
export const keepDeclared =
  (declared: Readonly<Record<string, readonly DeclaredEvent[]>>): Keep =>
  (sent, scenario) => {
    const senders = sendersOf(scenario.setup, sent.from)
    const unformed = senders.find((sender) => declared[sender.tag] === undefined)
    if (unformed !== undefined && senders.every((sender) => declared[sender.tag] === undefined)) {
      throw new Error(`conformance: no form declares the events of <${unformed.tag}>`)
    }
    const event = senders
      .map((sender) => declared[sender.tag]?.find((one) => one.name === sent.name))
      .find((one) => one !== undefined)
    if (event === undefined) {
      /* **A part with no form of its own**, as a Table's row: the element around
         declares what the row sends, and a page hears it there. */
      const around = declared[scenario.setup.tag]?.find((one) => one.name === sent.name)
      return around === undefined || sent.from === null
        ? undefined
        : { ...sent, detail: heldDetail(around, sent), from: null }
    }
    return { ...sent, detail: heldDetail(event, sent) }
  }

/**
 * Every intent whose record in `actual` parts from `expected`, the baseline,
 * after `keep` narrows the events of both. A scenario the baseline does not
 * hold, or holds with other intents, is a difference at its first intent, so
 * a record written before a scenario changed is found.
 */
export const differences = (
  scenarios: readonly Scenario[],
  expected: Recording,
  actual: Recording,
  keep: Keep = keepAll,
): Difference[] =>
  scenarios.flatMap((scenario): Difference[] => {
    const key = keyOf(scenario)
    const want = expected[key] ?? []
    const got = actual[key] ?? []
    const intents = (steps: readonly Step[]) => steps.map((step) => step.intent)
    if (canonical(intents(want)) !== canonical(intents(got))) {
      return [
        {
          actual: intents(got),
          at: 1,
          expected: intents(want),
          intent: 'the intents recorded',
          scenario: key,
        },
      ]
    }
    return got.flatMap((step, index) => {
      const mine = held(step, scenario, keep)
      const theirs = held(want[index] as Step, scenario, keep)
      if (mine === undefined || theirs === undefined || canonical(mine) === canonical(theirs)) {
        return []
      }
      return [{ actual: mine, at: index + 1, expected: theirs, intent: step.intent, scenario: key }]
    })
  })

/** Every intent either record says its platform could not perform. */
export const unperformed = (records: readonly Recording[]): Unperformed[] =>
  records.flatMap((record) =>
    Object.entries(record).flatMap(([scenario, steps]) =>
      steps.flatMap((step, index) =>
        'cannot' in step
          ? [{ at: index + 1, cannot: step.cannot, intent: step.intent, scenario }]
          : [],
      ),
    ),
  )

/**
 * The differences no entry of `known` names, and the entries that name no
 * difference: both fail a run, so the list says what is still wrong.
 */
export const judge = (
  found: readonly Difference[],
  known: readonly Known[],
): { stale: Known[]; unexpected: Difference[] } => {
  const names = (one: Known, difference: Difference) =>
    one.scenario === difference.scenario && one.intent === difference.at
  return {
    stale: known.filter((one) => !found.some((difference) => names(one, difference))),
    unexpected: found.filter((difference) => !known.some((one) => names(one, difference))),
  }
}

/** An event in one line: `before-select from b {"value":"b"} refused`. */
const line = (sent: Sent): string =>
  `${sent.name}${sent.from === null ? '' : ` from ${sent.from}`} ${canonical(sent.detail)}${
    sent.canceled ? ' refused' : ''
  }`

/** One side of a difference, an event to a line and then what the intent left. */
const side = (value: unknown): string => {
  const step = value as { events?: Sent[]; left?: Left }
  if (step.events === undefined || step.left === undefined) {
    return canonical(value)
  }
  const events = step.events.length === 0 ? ['no events'] : step.events.map(line)
  return [...events, `left ${canonical(step.left)}`].join('\n      ')
}

/** The differences in words, each with both sides, for a failing run to print. */
export const explain = (found: readonly Difference[], names: [string, string]): string =>
  found
    .map(
      (one) =>
        `${one.scenario}\n  ${one.at}. ${one.intent}\n    ${names[0]}: ${side(one.expected)}\n    ${names[1]}: ${side(one.actual)}`,
    )
    .join('\n\n')

/** Each platform by the name a report gives it. */
export const PLATFORM_NAMES: Readonly<Record<Platform, string>> = {
  chromium: 'Chromium',
  'react-native': 'React Native',
  webkit: 'WebKit',
}

/** What the comparison of the written records found. */
export interface Verdict {
  /**
   * Each failure in words, with both sides of a difference. Empty where the
   * records agree.
   */
  readonly failures: readonly string[]
  /**
   * The lines a run prints whether it fails or not: the intents a platform
   * could not perform, and the known differences with their causes.
   */
  readonly notes: readonly string[]
}

/**
 * Compares what the halves wrote. Every browser is held to Chromium exactly,
 * and React Native to the web after `keepDeclared` narrows both, with the
 * differences the native half lists as known reported and the entries that
 * no longer differ failing. A platform in `expected` with no record fails, as
 * does a record missing a scenario, or holding one twice where CI split a
 * browser's families across jobs.
 */
export const compareWritten = (
  scenarios: readonly Scenario[],
  written: readonly Written[],
  expected: readonly Platform[],
): Verdict => {
  const failures: string[] = []
  const records = new Map<Platform, { [scenario: string]: readonly Step[] }>()
  let declared: Written['declared']
  let known: readonly Known[] = []
  for (const file of written) {
    const into = records.get(file.platform) ?? {}
    records.set(file.platform, into)
    for (const [key, steps] of Object.entries(file.record)) {
      if (key in into) {
        failures.push(`${PLATFORM_NAMES[file.platform]} recorded \`${key}\` twice.`)
      }
      into[key] = steps
    }
    declared = file.declared ?? declared
    known = file.known ?? known
  }
  for (const platform of expected.filter((one) => !records.has(one))) {
    failures.push(`No ${PLATFORM_NAMES[platform]} record was written.`)
  }
  for (const [platform, record] of records) {
    const lacking = scenarios.map(keyOf).filter((key) => !(key in record))
    if (lacking.length > 0) {
      failures.push(
        `The ${PLATFORM_NAMES[platform]} record holds none of these scenarios:\n  ${lacking.join('\n  ')}`,
      )
    }
  }
  /* The scenarios every record named holds, so a missing one fails once. */
  const heldBy = (...platforms: Platform[]) =>
    scenarios.filter((one) =>
      platforms.every((platform) => keyOf(one) in (records.get(platform) ?? {})),
    )
  const web = (['chromium', 'webkit'] as const).find((platform) => records.has(platform))
  const native = records.get('react-native')
  if (web !== undefined) {
    const base = records.get(web) ?? {}
    for (const [platform, record] of records) {
      if (platform === web || platform === 'react-native') {
        continue
      }
      const found = differences(heldBy(web, platform), base, record)
      if (found.length > 0) {
        const names: [string, string] = [PLATFORM_NAMES[web], PLATFORM_NAMES[platform]]
        failures.push(`${names[1]} parts from ${names[0]}:\n\n${explain(found, names)}`)
      }
    }
    if (native !== undefined && declared === undefined) {
      failures.push('The React Native record declares no events, so it cannot be compared.')
    } else if (native !== undefined && declared !== undefined) {
      const compared = heldBy(web, 'react-native')
      const found = differences(compared, base, native, keepDeclared(declared))
      /* An entry for a scenario a record lacks waits for that record, and an
         entry for a scenario nobody holds is stale. */
      const keys = new Set(compared.map(keyOf))
      const all = new Set(scenarios.map(keyOf))
      const judged = known.filter((one) => keys.has(one.scenario) || !all.has(one.scenario))
      const { stale, unexpected } = judge(found, judged)
      if (unexpected.length > 0) {
        const names: [string, string] = [PLATFORM_NAMES[web], PLATFORM_NAMES['react-native']]
        failures.push(
          `React Native parts from the web, as ${names[0]} recorded it:\n\n${explain(unexpected, names)}`,
        )
      }
      if (stale.length > 0) {
        const listed = stale.map((one) => `${one.scenario}, intent ${one.intent}`).join('\n  ')
        failures.push(
          `These no longer differ. Take them out of helix/native/tests/conformance/known.ts:\n  ${listed}`,
        )
      }
    }
  }
  const notes: string[] = []
  const skipped = [...records].flatMap(([platform, record]) =>
    unperformed([record]).map(
      (one) =>
        `  ${PLATFORM_NAMES[platform]}: ${one.scenario}, ${one.at}. ${one.intent}: ${one.cannot}`,
    ),
  )
  if (skipped.length > 0) {
    notes.push('Intents a platform cannot perform', ...skipped)
  }
  if (known.length > 0) {
    notes.push(
      ...(notes.length > 0 ? [''] : []),
      'Differences waiting on a decision, from helix/native/tests/conformance/known.ts',
      ...known.map((one) => `  ${one.scenario}, ${one.intent}: ${one.cause}`),
    )
  }
  return { failures, notes }
}
