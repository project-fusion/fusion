import { slugify } from '@/components/prose/prose'

/** One entry in a page's outline: the anchor, and the words to show for it. */
export interface OutlineEntry {
  /** The `id` the rendered heading carries, without the hash. */
  id: string
  label: string
}

/**
 * The second- and third-level headings of an MDX document, as an outline.
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
 * `turbo run docs` extracting them into a generated file and `turbo run docs -- --check` holding
 * the two together: a generator, a type and a staleness check, to derive
 * something already sitting in a string the caller has.
 *
 * The anchors come from `slugify`, which is what the heading renderer uses, so
 * the two agree by construction rather than by having been written to match.
 *
 * **Flat, at both levels, because this is navigation.** Indenting would need an
 * active-state rule that knows which parent to hold open, and a `###` is a place
 * to jump to whether or not a reader can see what it sits under. There are 278
 * `##` and 16 `###` across the documentation today, so the second level is a
 * long tail rather than a second structure.
 *
 * **A repeated heading is refused rather than rendered.** `slugify` does not
 * deduplicate, and it cannot usefully: this walks a document in order and the
 * heading renderer sees one heading at a time with no memory of the last, so any
 * numbering scheme would have to be invented twice and agree. Two headings with
 * one slug means two outline entries pointing at whichever the browser finds
 * first, which looks like a broken link and reads like a bug in the outline.
 * This runs at build time, so throwing here fails the build with the document
 * and the word in the message, which is the cheapest place to find it.
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
    const heading = /^#{2,3}\s+(.+?)\s*$/.exec(line)
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
    if (!id) {
      continue
    }
    const clash = entries.find((entry) => entry.id === id)
    if (clash) {
      throw new Error(
        `outline: two headings share the anchor "#${id}" ("${clash.label}" and "${label}"). ` +
          'Both would link to whichever the browser finds first. Reword one.',
      )
    }
    entries.push({ id, label })
  }

  return entries
}
