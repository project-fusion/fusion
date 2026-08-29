import type { ReactNode } from 'react'
import { PageOutline } from '@/components/page-outline/page-outline'
import type { OutlineEntry } from '@/utils/outline/outline'
import styles from './document-page.module.css'

/**
 * One argued document, laid out the way this site lays out an argument.
 *
 * **Insights, Trust and Thesis are the same kind of page.** Each is a single
 * sustained argument rather than a marketing surface, so a layout apiece means
 * the measure, the heading scale and the block rhythm differing between three
 * pages a reader reads identically.
 *
 * **What it costs is that the three stop being able to diverge**, which is a
 * real loss only if one of them grows something the others cannot hold. None
 * has yet, and the escape is ordinary: `meta` and `footer` are where a page puts
 * what is only true of it, which is how the insight page keeps its byline and
 * its Keep reading list without either of those reaching Trust.
 *
 * `data-prose` on the body rather than on the shell, because the base layer
 * themes prose with it and the head is components rather than prose.
 */
export function DocumentPage({
  body,
  footer,
  kicker,
  outline,
  lede,
  meta,
  title,
  trail,
}: {
  /** The document itself, already rendered.  */
  body: ReactNode
  /** Anything after the argument, such as a list of what to read next. */
  footer?: ReactNode
  /** The small line above the title, where the page has one. */
  kicker?: string
  /**
   * The document's own sections, shown between the head and the body.
   *
   * **Inline rather than a rail, because this page is a column.** The docs and
   * the reference put their outline in a third grid track beside the prose;
   * this shell is capped at a reading measure and centered, so there is nothing
   * either side of it to put a rail in without dismantling the one thing the
   * layout is for. A contents block under the title is how a policy presents
   * the same list anyway.
   */
  outline?: readonly OutlineEntry[]
  /** The paragraph under the title, where the page shows one before its body. */
  lede?: string
  /** Facts about this document, where it has any worth stating. */
  meta?: ReactNode
  title: string
  /** The way back, where this document is one of a set. */
  trail?: ReactNode
}) {
  /* **No `data-shell` on the shell.** That attribute means "full width, held off
     the edges by the inset", and this box is neither: it is capped and centered,
     so above the cap it is nowhere near an edge and its `6vw` inset eats the
     reading column as the window grows. The shell supplies its own fixed
     one. */
  return (
    <helix-flex class={styles.documentShell} direction="column" gap="xl">
      <helix-flex align="start" class={styles.documentHead} direction="column" gap="lg">
        {trail}
        <helix-flex align="start" direction="column" gap="md">
          {kicker && (
            <helix-text class={styles.documentKicker} tone="subtle" variant="label">
              {kicker}
            </helix-text>
          )}
          <helix-text as="h1" class={styles.documentTitle}>
            {title}
          </helix-text>
          {lede && (
            <helix-text as="p" class={styles.documentLede} tone="muted">
              {lede}
            </helix-text>
          )}
        </helix-flex>
        {meta}
      </helix-flex>

      {outline && outline.length > 0 && (
        <nav className={styles.documentContents}>
          <PageOutline
            className={styles.documentContentsTitle}
            entries={outline}
            label="Contents"
          />
        </nav>
      )}

      <article className={styles.documentBody} data-prose>
        {body}
      </article>

      {footer}
    </helix-flex>
  )
}
