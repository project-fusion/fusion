import type { OutlineEntry } from '@/utils/outline/outline'

/**
 * A document's own sections, as links to them.
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
      <helix-text class={className} emphasis="subtle" variant="label">
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
