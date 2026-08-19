import type { HelixDeclaration, Plugin } from '../types.js'

/** Tags Helix reads that the CEM spec does not define. */
const SINGLE = ['category', 'description', 'since', 'status', 'documentation'] as const

/** Comma-separated, so one tag rather than a stack of near-identical lines. */
const LIST = ['aliases'] as const

/** Values `@status` may take. Anything else is ignored rather than trusted. */
const STATUSES = ['deprecated', 'experimental', 'stable'] as const

/**
 * What a component is for, as the one axis the catalog groups on.
 *
 * A closed set, checked the same way `@status` is: a typo lands a component in
 * a category of one rather than failing, and a category of one is invisible
 * until someone counts. Eight, which is the coarsest split that still puts
 * every family somewhere a reader would look for it.
 *
 * **This exists because the alternative was inferring it.** The gallery grouped
 * families by which of five art files their drawing happened to live in, and
 * those files are split for authoring convenience: one of them is named for the
 * ten components the drawing system was worked out on, which is a fact about
 * the order they were made in. Twenty-nine of sixty-five sat in a bucket that
 * did not describe them. A category is a fact about a component, so it belongs
 * on the component, in the manifest, beside `@status`.
 */
const CATEGORIES = [
  'actions',
  'content',
  'feedback',
  'forms',
  'layout',
  'navigation',
  'overlays',
  'tooling',
] as const

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
 * `@aliases` is comma-separated. It records the names people search for that
 * are not the component's own: Tag is also a Chip, Toast is also a Snackbar.
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
      if ((LIST as readonly string[]).includes(tagName)) {
        aliases.push(
          ...value
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean),
        )
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
    const category = CATEGORIES.find((candidate) => candidate === found.category)

    declaration.helix = {
      ...declaration.helix,
      ...(category ? { category } : {}),
      ...(found.since ? { since: found.since } : {}),
      ...(status ? { status } : {}),
      ...(found.documentation ? { documentation: found.documentation } : {}),
      ...(aliases.length > 0 ? { aliases } : {}),
    }
  },
  name: 'helix-metadata',
})
