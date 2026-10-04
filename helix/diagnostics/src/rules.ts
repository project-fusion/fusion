/**
 * How serious each finding is, and how a project says otherwise.
 *
 * **One shipped set, and two ways to override it.** The set is ours and is
 * versioned with this package, so a project that takes a new version gets new
 * rules without forking ours. On top of it a project may hand `diagnose` its
 * own file, parsed, and may pass overrides at the call site. **The call site
 * wins**: the file is the project's standing answer, and the argument is the
 * caller's, for this run.
 *
 * **An override may say three things**: a severity, `off`, and which tags it
 * applies to. Anything more waits until a project asks for it.
 *
 * **A rule that names nothing is an error.** An override for a kind that does
 * not exist does nothing, silently, which is the exact class of fault this
 * package exists to find, so it throws and names the closest kind.
 */
import { nearest } from './manifest.js'
import {
  type Configuration,
  type Finding,
  type Identified,
  KINDS,
  type Kind,
  type Layer,
  type Raw,
  type Severity,
} from './report.js'

/** One override: a severity, `off`, or either for some tags only. */
export type Override =
  | Severity
  | 'off'
  | {
      /** The severity, or `off`. */
      severity: Severity | 'off'
      /** The tags it applies to. Every other tag keeps the layer below. */
      tags: string[]
    }

/** Overrides by kind. A list holds several, each for different tags. */
export type Rules = Partial<Record<Kind, Override | Override[]>>

/**
 * The shipped severities.
 *
 * `unforwarded-part` is a warning because the fault is in Helix: the part
 * exists on the other tier, and the styled tier never forwarded it.
 * Everything else means the page's CSS does nothing where it was written, or
 * that the manifest cannot be trusted, and is an error.
 */
export const SHIPPED_RULES: Readonly<Record<Kind, Severity>> = {
  'dead-hook': 'error',
  'dead-part': 'error',
  'duplicate-registration': 'error',
  'invalid-value': 'error',
  'manifest-skew': 'error',
  'unforwarded-part': 'warn',
  'unknown-attribute': 'error',
  'unknown-tag': 'error',
}

const SEVERITIES = new Set(['error', 'info', 'off', 'warn'])

/** Throws on an override that would silently do nothing. */
export const checkRules = (rules: Rules | undefined, layer: Exclude<Layer, 'shipped'>): void => {
  for (const [kind, value] of Object.entries(rules ?? {})) {
    if (!(KINDS as readonly string[]).includes(kind)) {
      const close = nearest(kind, KINDS)
      throw new Error(
        `The ${layer} overrides \`${kind}\`, which is no kind of finding.` +
          (close ? ` The closest is \`${close}\`.` : ` The kinds are ${KINDS.join(', ')}.`),
      )
    }
    for (const one of Array.isArray(value) ? value : [value]) {
      const severity = typeof one === 'string' ? one : one?.severity
      if (!SEVERITIES.has(severity as string)) {
        throw new Error(
          `The ${layer} sets \`${kind}\` to \`${String(severity)}\`. A severity is error, warn, info, or off.`,
        )
      }
      if (typeof one === 'object' && !(Array.isArray(one.tags) && one.tags.length > 0)) {
        throw new Error(
          `The ${layer} scopes \`${kind}\` with no tags. Give the tags it applies to, or set the severity alone.`,
        )
      }
    }
  }
}

/**
 * What one layer says about one finding, if anything. An override scoped to
 * the finding's tag outranks one that is not, within a layer.
 */
const said = (rules: Rules | undefined, finding: Raw): Severity | 'off' | undefined => {
  const value = rules?.[finding.kind]
  if (value === undefined) {
    return undefined
  }
  const list = Array.isArray(value) ? value : [value]
  const scoped = list.find((one) => typeof one === 'object' && one.tags.includes(finding.tag))
  if (scoped && typeof scoped === 'object') {
    return scoped.severity
  }
  const plain = list.find((one) => typeof one === 'string')
  return typeof plain === 'string' ? plain : undefined
}

/**
 * The findings with their severities, and how many each override turned off,
 * by kind and layer.
 *
 * The shipped rule first, then the file, then the argument, each later layer
 * replacing what it speaks to.
 */
export const applyRules = (
  findings: Identified[],
  file: Rules | undefined,
  argument: Rules | undefined,
): { findings: Finding[]; silenced: Configuration['silenced'] } => {
  const off = new Map<string, Configuration['silenced'][number]>()
  const kept: Finding[] = []
  for (const finding of findings) {
    let severity: Severity | 'off' = SHIPPED_RULES[finding.kind]
    let decidedBy: Layer = 'shipped'
    for (const [layer, rules] of [
      ['file', file],
      ['argument', argument],
    ] as const) {
      const value = said(rules, finding)
      if (value !== undefined) {
        severity = value
        decidedBy = layer
      }
    }
    if (severity === 'off') {
      const layer = decidedBy as Exclude<Layer, 'shipped'>
      const key = `${finding.kind} ${layer}`
      const entry = off.get(key) ?? { count: 0, kind: finding.kind, layer }
      entry.count += 1
      off.set(key, entry)
      continue
    }
    kept.push({ ...finding, decidedBy, severity })
  }
  return { findings: kept, silenced: [...off.values()] }
}

/** Every override in effect, flattened, for the report's configuration. */
export const overridesOf = (
  file: Rules | undefined,
  argument: Rules | undefined,
): Configuration['overrides'] =>
  (
    [
      ['file', file],
      ['argument', argument],
    ] as const
  ).flatMap(([layer, rules]) =>
    Object.entries(rules ?? {}).flatMap(([kind, value]) =>
      (Array.isArray(value) ? value : [value]).map((one) =>
        typeof one === 'string'
          ? { kind: kind as Kind, layer, severity: one }
          : { kind: kind as Kind, layer, severity: one.severity, tags: one.tags },
      ),
    ),
  )
