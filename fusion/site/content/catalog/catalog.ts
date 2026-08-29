import type { Family } from '@fusion.dev/helix-docs'
import { findInCatalog } from '@fusion.dev/helix-docs'
import generated from './catalog.generated.json'

/**
 * The component catalog, imported rather than read.
 *
 * **Nothing about a component is written down in this app.** The shaping lives
 * in `@fusion.dev/helix-docs`, the sources are the manifests and the `.examples/*.html`
 * files beside each component, and `bun run gen:catalog` joins the two into the
 * file imported above. `fusion/site` runs it before `next build` and `next dev`,
 * the same way it already builds the frame and the specs.
 *
 * **Never reach out of the project with `fs` to read those sources instead.**
 * Turbopack cannot statically scope such a path, so it traces the whole
 * repository into the server bundle, public folder included, and warns on every
 * build. An import inside the project reads nothing at runtime and has nothing
 * to trace.
 */
export type {
  ApiMember,
  Element,
  EventDoc,
  Example,
  Family,
  PropertyDoc,
} from '@fusion.dev/helix-docs'

/** Every family, alphabetical, each with its elements and examples. */
export const getFamilies = (): Family[] => generated as Family[]

export const findFamily = (slug: string): Family | undefined => findInCatalog(getFamilies(), slug)
