import { slugify } from '@/components/prose/prose'

/** One entry in a page's outline: the anchor, and the words to show for it. */
export interface OutlineEntry {
  /** The `id` the rendered heading carries, without the hash. */
  id: string
  label: string
}

/**
 * The second-level headings of an MDX document, as an outline.
 *
 * **Read from the source rather than from the rendered page**, which is the
 * whole reason this is a function and not a hook. Both routes that want an
 * outline already hold the document's text: the docs page passes it to
 * `renderMdx` and a document page to `renderDocument`. Scraping the headings
 * back out of the DOM afterwards would move the work to the client, arrive a
 * frame after the prose, and give a reader with no JavaScript nothing.
 *
 * **And read from the source rather than from the registry**, which was the
 * other candidate. `DocPage` holds frontmatter, so putting headings there means
 * `bun run gen:docs` extracting them into a generated file and `check:gen:docs` holding
 * the two together: a generator, a type and a staleness check, to derive
 * something already sitting in a string the caller has.
 *
 * The anchors come from `slugify`, which is what the heading renderer uses, so
 * the two agree by construction rather than by having been written to match.
 */
export const outlineOf = (source: string): OutlineEntry[] => {
  /* Frontmatter first, because a `## ` can appear in a description, and fenced
     code second, because a shell prompt and a markdown heading are the same two
     characters. A page documenting markdown is exactly where that bites. */
  const body = source.replace(/^---\n[\s\S]*?\n---\n/, '')
  const entries: OutlineEntry[] = []
  let fenced = false

  for (const line of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced
      continue
    }
    if (fenced) {
      continue
    }
    const heading = /^##\s+(.+?)\s*$/.exec(line)
    if (!heading?.[1]) {
      continue
    }
    /* The inline marks a heading may carry, removed so the words match what the
       renderer put on screen: a link keeps its text and drops its target, and
       code, emphasis and strong keep their contents. */
    const label = heading[1]
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[`*_]/g, '')
      .trim()
    const id = slugify(label)
    if (id) {
      entries.push({ id, label })
    }
  }

  return entries
}
