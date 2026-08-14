import type { HelixContext, HelixManifest, Plugin, Violation } from '../types.js'
import { eachComponent } from '../types.js'

export interface ConventionLintOptions {
  /**
   * What to do when a convention is violated. `error` throws and fails the
   * build; `warn` logs and continues.
   */
  failOn?: 'error' | 'warn'
}

/** Words that describe how a component looks rather than what it is for. */
const APPEARANCE_OPENERS = ['themed', 'a styled', 'styled', 'a themed']

/**
 * Native events a component may re-emit from its host under the native name.
 *
 * Relaying is what makes a component behave like the control it wraps, and the
 * name has to be the native one for a consumer, and for React, to hear it.
 */
const RELAYED_NATIVE = new Set(['blur', 'change', 'focus', 'input', 'invalid'])

/**
 * Verbs React's synthetic system claims on a custom element.
 *
 * Measured rather than assumed: a probe dispatched each name from a custom
 * element and recorded which fired the matching React prop. `select`, `close`,
 * `toggle`, `open`, `dismiss`, `navigate` and `remove` are all free, which is
 * what lets the verb-only form work.
 */
const REACT_CLAIMED = new Set([
  'blur',
  'change',
  'copy',
  'drag',
  'focus',
  'input',
  'paste',
  'reset',
  'scroll',
  'submit',
])

const EM_DASH = /[—–]/

/**
 * Enforces the documented Helix conventions against the manifest.
 *
 * These rules are written down in `CLAUDE.md`, which means they are followed
 * exactly as often as someone remembers them. Checking them here turns prose
 * into a gate, and does it at the layer where the consequences actually land:
 * the manifest is what IDE tooltips, wrapper generators, and code-authoring
 * agents read, so an undocumented property is invisible tooling-wide, not just
 * untidy.
 */
export const conventionLint = (options: ConventionLintOptions = {}): Plugin => {
  const { failOn = 'error' } = options

  return {
    name: 'helix-convention-lint',
    packageLinkPhase({ context, customElementsManifest }) {
      const violations: Violation[] = []

      const check = (
        condition: boolean,
        rule: string,
        module: string,
        subject: string,
        message: string,
      ): void => {
        if (!condition) {
          violations.push({ message, module, rule, subject })
        }
      }

      for (const { declaration, module } of eachComponent(
        customElementsManifest as HelixManifest,
        context as HelixContext,
      )) {
        const path = module.path ?? 'unknown'
        const summary = declaration.summary ?? declaration.description ?? ''
        const lowered = summary.trim().toLowerCase()

        check(
          summary.trim().length > 0,
          'class-description',
          path,
          declaration.name,
          'Component has no class-level description.',
        )

        check(
          !APPEARANCE_OPENERS.some((opener) => lowered.startsWith(opener)),
          'purpose-first',
          path,
          declaration.name,
          'Class description opens with appearance. Lead with what the component is for.',
        )

        check(
          !EM_DASH.test(summary),
          'no-em-dash',
          path,
          declaration.name,
          'Description contains an em or en dash.',
        )

        // These live only as comments unless helix-metadata carries them into
        // the manifest, and only there can the docs site render a status badge
        // or an agent know what is stable.
        for (const field of ['since', 'status', 'documentation'] as const) {
          check(
            Boolean(declaration.helix?.[field]),
            `documented-${field}`,
            path,
            declaration.name,
            `Missing @${field} in the class JSDoc.`,
          )
        }

        for (const member of declaration.members ?? []) {
          if (member.privacy && member.privacy !== 'public') {
            continue
          }
          const subject = `${declaration.name}.${member.name}`
          check(
            Boolean(member.description?.trim()),
            'documented-member',
            path,
            subject,
            'Public member has no description.',
          )
          check(
            !EM_DASH.test(member.description ?? ''),
            'no-em-dash',
            path,
            subject,
            'Description contains an em or en dash.',
          )
        }

        for (const event of declaration.events ?? []) {
          check(
            Boolean(event.description?.trim()),
            'documented-event',
            path,
            `${declaration.name}:${event.name}`,
            'Event has no description. Events are public API.',
          )
          // The name decides the framework prop, because the manifest derives
          // one from the other by stripping `helix-` and camel-casing. Two
          // rules follow.
          //
          // Prefixed and lowercase, because an event from inside a shadow root
          // is retargeted to look like it came from the host: a bare `input`
          // from a `<helix-input>` is indistinguishable from the inner
          // control's own. A relayed native event is exempt, since being
          // indistinguishable from the native one is the entire point of it.
          check(
            /^helix-[a-z][a-z0-9-]*$/.test(event.name) || RELAYED_NATIVE.has(event.name),
            'prefixed-events',
            path,
            `${declaration.name}:${event.name}`,
            'Event names must be `helix-{verb}`, or a native name being relayed.',
          )
          // Verbs React has already claimed cannot be used, because stripping
          // the prefix lands on a prop its synthetic system owns: a
          // `helix-change` becomes `onChange`, which React has wired to the
          // native `change`, so ours would never fire. Measured in a browser,
          // not assumed.
          //
          // A relayed native is exempt, and has to be: landing on the prop
          // React already wired to that event is precisely what relaying is
          // for.
          check(
            RELAYED_NATIVE.has(event.name) || !REACT_CLAIMED.has(event.name.replace(/^helix-/, '')),
            'claimed-events',
            path,
            `${declaration.name}:${event.name}`,
            'React already owns this prop. Qualify the verb (helix-value-change, not helix-change).',
          )
        }

        for (const part of declaration.cssParts ?? []) {
          check(
            Boolean(part.description?.trim()),
            'documented-csspart',
            path,
            `${declaration.name}::part(${part.name})`,
            'CSS part has no description. Parts are the public override API.',
          )
        }
      }

      if (violations.length === 0) {
        return
      }

      const report = violations
        .map((v) => `  [${v.rule}] ${v.subject} (${v.module})\n    ${v.message}`)
        .join('\n')
      const header = `Helix convention violations (${violations.length}):`

      if (failOn === 'error') {
        throw new Error(`${header}\n${report}`)
      }
      console.warn(`${header}
${report}`)
    },
  }
}
