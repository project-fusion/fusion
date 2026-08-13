import type { HelixDeclaration, Plugin } from '../types.js'

/** Tags Helix reads that the CEM spec does not define. */
const SINGLE = ['description', 'since', 'status', 'documentation'] as const
const REPEATED = ['alias'] as const

/** Values `@status` may take. Anything else is ignored rather than trusted. */
const STATUSES = ['deprecated', 'experimental', 'stable'] as const

const text = (comment: unknown): string => {
  if (typeof comment === 'string') {
    return comment.trim()
  }
  if (Array.isArray(comment)) {
    return comment
      .map((part) => (part as { text?: string }).text ?? '')
      .join('')
      .trim()
  }
  return ''
}

/**
 * Carries Helix's own JSDoc tags into the manifest.
 *
 * `@summary` is part of the CEM spec and the analyzer captures it. `@since`,
 * `@status`, `@documentation`, `@alias`, and an explicit `@description` are
 * not, so without this they exist only as comments: invisible to the docs site,
 * to the convention linter, and to any agent reading the manifest. A
 * `@status experimental` that cannot put a badge on a page or warn a consumer
 * is decoration.
 *
 * `@alias` repeats. It records the names people search for that are not the
 * component's own: Tag is also a Chip, Toast is also a Snackbar.
 */
export const metadata = (): Plugin => ({
  analyzePhase({ moduleDoc, node, ts }) {
    if (!ts.isClassDeclaration(node) || !node.name) {
      return
    }

    const name = node.name.getText()
    const declaration = (moduleDoc.declarations ?? []).find(
      (candidate) => candidate.name === name,
    ) as HelixDeclaration | undefined

    if (!declaration) {
      return
    }

    const aliases: string[] = []
    const found: Record<string, string> = {}

    for (const tag of ts.getJSDocTags(node)) {
      const tagName = tag.tagName.getText()
      const value = text(tag.comment)
      if (!value) {
        continue
      }
      if ((REPEATED as readonly string[]).includes(tagName)) {
        aliases.push(value)
      } else if ((SINGLE as readonly string[]).includes(tagName)) {
        found[tagName] = value
      }
    }

    // An explicit @description wins over the analyzer's free-text body, which
    // is empty when every line of the comment is a tag.
    if (found.description) {
      declaration.description = found.description
    }

    const status = STATUSES.find((candidate) => candidate === found.status)

    declaration.helix = {
      ...declaration.helix,
      ...(found.since ? { since: found.since } : {}),
      ...(status ? { status } : {}),
      ...(found.documentation ? { documentation: found.documentation } : {}),
      ...(aliases.length > 0 ? { aliases } : {}),
    }
  },
  name: 'helix-metadata',
})
