import type { OutlineEntry } from '@/utils/outline/outline'

/**
 * A document's own sections, as links to them.
 *
 * **The links and the heading, and not the box around them.** The two pages
 * that show this put it in different places: the reference and the docs have a
 * third grid column standing empty beside the prose, and a document page is a
 * capped column centered on the screen with nothing either side of it. One is a
 * sticky rail and the other is a block under the title, so the wrapper belongs
 * to the caller and what is shared is the part that is actually the same.
 *
 * `helix-outline` is the real component rather than a list of anchors: it reads
 * where the headings are and writes `aria-current` onto the entry a reader is
 * inside, which is the half a hand-rolled list never has.
 *
 * Nothing renders for a document with no sections: a rail naming the only thing
 * on screen is furniture.
 */
export function PageOutline({
  className,
  entries,
  label = 'On this page',
}: {
  /** Class for the visible heading, so a caller can match its own rail. */
  className?: string
  entries: readonly OutlineEntry[]
  label?: string
}) {
  if (entries.length === 0) {
    return null
  }

  return (
    <>
      {/* Named for a reader as well as for a screen reader: `label` on the
          component paints nothing, so without this the rail is a column of
          links with no word saying what they are. */}
      <helix-text class={className} tone="subtle" variant="label">
        {label}
      </helix-text>
      <helix-outline label={label}>
        {entries.map((entry) => (
          <a href={`#${entry.id}`} key={entry.id}>
            {entry.label}
          </a>
        ))}
      </helix-outline>
    </>
  )
}
