/* **The catalog and its naming are not here.** They live in
   `@fusion.dev/helix-cem`, which writes each tier's `api.json` from them and is
   not published, so this package cannot import them and the site imports them
   from there. */
export {
  type ReferenceFamily,
  type ReferenceManifest,
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
