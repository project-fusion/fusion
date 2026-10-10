/*
 * `@fusion.dev/helix-headless/words`: `registerWords` and the rest of core's words
 * registry, without the elements.
 *
 * **For a page that registers its words before it loads any element**, as
 * core's own `/words` entry is. The package's index registers every element
 * it holds, so taking `registerWords` from there costs the whole library. The
 * types published for this entry, `types/words.d.ts`, re-export the same
 * names and type each call against this package's families.
 */
export * from '@fusion.dev/helix-core/words'
