import type { Example, Family } from '@fusion.dev/helix-docs'
import { findInCatalog } from '@fusion.dev/helix-docs'
import generated from './catalog.generated.json'

/**
 * The component catalog, imported rather than read.
 *
 * **Nothing about a component is written down in this app.** The shaping lives
 * in `@fusion.dev/helix-docs`, the sources are the manifests and the `.examples/*.html`
 * files beside each component, and `turbo run catalog` joins the two into the
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

/** An example by name and address, without its sources. */
export type ExampleListing = Pick<Example, 'label' | 'layout' | 'slug' | 'tier'>

/** A family by name and address, with its examples listed the same way. */
export interface FamilyListing extends Pick<Family, 'label' | 'slug' | 'status'> {
  examples: ExampleListing[]
}

/**
 * Every family as a listing, which is what crosses to a client component.
 *
 * **The whole catalog is the API tables and every example's three sources, and
 * a page that hands it to a client component ships all of it in the RSC
 * payload** to draw a rail of names. Measured on the sandbox: 4.2 MB of the
 * payload was this prop. A listing is what the rail needs, and the sources of
 * a family arrive when it is opened, from the `public/helix/components/*.json`
 * the catalog already writes beside each family's markdown.
 */
export const listFamilies = (): FamilyListing[] =>
  getFamilies().map(({ examples, label, slug, status }) => ({
    examples: examples.map((example) => ({
      label: example.label,
      ...(example.layout === undefined ? {} : { layout: example.layout }),
      slug: example.slug,
      tier: example.tier,
    })),
    label,
    slug,
    status,
  }))
