import type { Family } from '@helix-io/docs'
import { findInCatalog } from '@helix-io/docs'
import generated from './catalog.generated.json'

/**
 * The component catalog, imported rather than read.
 *
 * **Nothing about a component is written down in this app.** The shaping lives
 * in `@helix-io/docs`, the sources are the manifests and the `.examples/*.html`
 * files beside each component, and `bun run catalog` joins the two into the
 * file imported above. `site/ui` runs it before `next build` and `next dev`,
 * the same way it already builds the frame and the specs.
 *
 * This used to reach out of the project with `fs` to find those sources, which
 * Turbopack warned about on every build: a path it cannot statically scope
 * traces the whole repository into the server bundle, public folder included.
 * An import inside the project reads nothing at runtime and has nothing to
 * trace.
 */
export type {
  ApiMember,
  Element,
  EventDoc,
  Example,
  Family,
  PropertyDoc,
} from '@helix-io/docs'

/** Every family, alphabetical, each with its elements and examples. */
export const getFamilies = (): Family[] => generated as Family[]

export const findFamily = (slug: string): Family | undefined => findInCatalog(getFamilies(), slug)
