import type { ReactNode } from 'react'
import styles from './document-page.module.css'

/**
 * One argued document, laid out the way this site lays out an argument.
 *
 * **Insights, Trust and Thesis are the same kind of page**, which is 206's
 * finding: each is a single sustained argument rather than a marketing surface,
 * and the insight page already had the layout worked out for it. The other two
 * carried a layout apiece that reproduced most of it and none of its reasoning,
 * so the measure, the heading scale and the block rhythm differed between three
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
  /** The paragraph under the title, where the page shows one before its body. */
  lede?: string
  /** Facts about this document, where it has any worth stating. */
  meta?: ReactNode
  title: string
  /** The way back, where this document is one of a set. */
  trail?: ReactNode
}) {
  /* **No `data-shell` on the shell.** That attribute means "full width, held off
     the edges by the inset", and this box is neither: it is capped and centred,
     so above the cap it is nowhere near an edge, and its `6vw` inset was eating
     the reading column as the window grew. The shell supplies its own fixed
     one. */
  return (
    <helix-flex class={styles.documentShell} direction="column" gap="xl">
      <helix-flex align="start" class={styles.documentHead} direction="column" gap="lg">
        {trail}
        <helix-flex align="start" direction="column" gap="md">
          {kicker && (
            <helix-text tone="subtle" variant="label">
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

      <article className={styles.documentBody} data-prose>
        {body}
      </article>

      {footer}
    </helix-flex>
  )
}
