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
 * **Flat, at both levels, because this is navigation.** Indenting would need an
 * active-state rule that knows which parent to hold open, and a `###` is a place
 * to jump to whether or not a reader can see what it sits under. There are 278
 * `##` and 16 `###` across the documentation today, so the second level is a
 * long tail rather than a second structure.
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
