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
          check(
            event.name === event.name.toLowerCase() && !event.name.includes('_'),
            'kebab-events',
            path,
            `${declaration.name}:${event.name}`,
            'Event names must be kebab-case so React prop generation is predictable.',
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
