import { existsSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import type { HelixContext, HelixManifest, Plugin } from '../types.js'
import { eachComponent } from '../types.js'

/**
 * The repository root, found by walking up for `.git`.
 *
 * Asked rather than configured. The alternative is a base path in each
 * package's analyzer config, which is the same fact written four times and
 * wrong the first time a package moves. The analyzer runs with the package
 * directory as `cwd`, so the walk is short and the answer is exact.
 */
const repoRoot = (from: string): string => {
  let dir = from
  while (!existsSync(join(dir, '.git')) && dirname(dir) !== dir) {
    dir = dirname(dir)
  }
  return dir
}

/**
 * Records where a family's source lives, as a path and not a URL.
 *
 * **A path, because the URL has a version in it and this file does not know
 * which one.** Documentation will be versioned and the reader will choose the
 * version, so the ref belongs to whoever is rendering the link at the time. Bake
 * `main` into the manifest and every archived version of the docs points at
 * today's source, which is the one thing a versioned reference must not do.
 * What is durable is where the directory sits in the repository; what is not is
 * which commit anyone wants to read. So this records the first and the site
 * composes the second.
 *
 * **The directory, not the file.** A family is several files across two tiers,
 * and `View Source` on a family's page means "show me this component", which is
 * the folder. Per-element links can point at their own module later, from the
 * same `module.path` this is derived from.
 *
 * Derived rather than authored, for the reason `helix-composition` derives the
 * group and the part from the same string: a hand-written `@source` is 70
 * chances to be wrong and goes stale the first time a file moves, while a path
 * computed from the module cannot disagree with where the module is.
 */
export const source = (): Plugin => ({
  name: 'helix-source',
  packageLinkPhase({ context, customElementsManifest }) {
    const root = repoRoot(process.cwd())

    for (const { declaration, module } of eachComponent(
      customElementsManifest as HelixManifest,
      context as HelixContext,
    )) {
      if (declaration.helix?.part !== 'Root') {
        continue
      }

      const family = /(?:^|\/)src\/([^/]+)\/[^/]+\/[^/]+\.[jt]s$/.exec(module.path ?? '')?.[1]
      if (!family) {
        continue
      }

      /* Posix separators, always. This lands in a manifest that a URL is built
         from, and a Windows build would otherwise record `helix\web\src\card`
         and produce a link that resolves nowhere. */
      const path = relative(root, join(process.cwd(), 'src', family))
        .split(sep)
        .join('/')
      declaration.helix = { ...declaration.helix, source: path }
    }
  },
})
