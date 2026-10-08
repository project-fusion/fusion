/* The catalog and its naming live in `@fusion.dev/helix-cem`, which writes each
   tier's `api.json` from them, and are re-exported here for the site. */
export type {
  ApiMember,
  Element,
  EventDoc,
  Example,
  ExampleSource,
  Family,
  PropertyDoc,
} from '@fusion.dev/helix-cem'
export {
  catalog,
  displayName,
  findInCatalog,
  place,
  startCase,
  tierOf,
} from '@fusion.dev/helix-cem'
export {
  type ReferenceFamily,
  type ReferenceOptions,
  reference,
  referenceFamilies,
} from './reference.js'
export {
  contentPath,
  type DocNavPage,
  type DocNavSection,
  type DocPage,
  type DocSection,
  findPage,
  navigation,
  pages,
  sections,
} from './registry.js'
export { findSection } from './sections.js'
export { docSources } from './sources.generated.js'
