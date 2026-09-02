import type { ReactNode } from 'react'
import { PageOutline } from '@/components/page-outline/page-outline'
import type { OutlineEntry } from '@/utils/outline/outline'
import styles from './document-page.module.css'

/**
 * One argued document, laid out the way this site lays out an argument.
 */
export function DocumentPage({
  body,
  centered,
  footer,
  hero,
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
  /**
   * The head centered over the body rather than aligned to its left edge.
   */
  centered?: boolean
  /**
   * The head on a lit band rather than on the page, for a document that is read
   * as a piece rather than consulted as a reference.
   */
  hero?: boolean
  /** The small line above the title, where the page has one. */
  kicker?: string
  /**
   * The document's own sections, shown between the head and the body.
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
  /* The head, which is the same content in both arrangements and differs only
     in what it sits on and in what order the facts come. On the band the filing
     leads, because a reader arriving at a piece wants to know what it is before
     they are given its title; in the plain head the title leads, because a
     reader who came to a policy already knows. */
  const head = (
    <helix-flex align="start" direction="column" gap="md">
      {kicker && (
        <helix-text class={styles.documentKicker} tone="subtle" variant="label">
          {kicker}
        </helix-text>
      )}
      <helix-text as="h1" class={hero ? styles.documentHeroTitle : styles.documentTitle}>
        {title}
      </helix-text>
      {lede && (
        /* **Muted on the page and not on the band, which is a contrast finding
           rather than a preference.** Over the gradient in light the ground under
           this paragraph is a pale blue rather than the page's white, and a muted
           ink on it measures 4.23:1 at 18px, under the 4.5 body text answers to.
           Measured against the painted pixel with the column hidden, so the
           reading is the band rather than a glyph.

           Full strength clears it at once, and costs nothing the head needs: on
           the band the standfirst is already told apart from the title by size
           and by weight, and the tone was doing the same job a second time. On
           the plain head there is no band, the ground is the page, and muted is
           what separates the standfirst from the body under it. */
        <helix-text as="p" class={styles.documentLede} tone={hero ? undefined : 'muted'}>
          {lede}
        </helix-text>
      )}
    </helix-flex>
  )

  return (
    <div className={styles.document}>
      {hero && (
        <section className={styles.documentHero}>
          <helix-flex align="start" class={styles.documentHeroInner} direction="column" gap="lg">
            {trail}
            {meta}
            {head}
          </helix-flex>
        </section>
      )}

      <helix-flex class={styles.documentShell} direction="column" gap="xl">
        {!hero && (
          <helix-flex
            align={centered ? 'center' : 'start'}
            class={`${styles.documentHead} ${centered ? styles.documentHeadCentred : ''}`}
            direction="column"
            gap="lg"
          >
            {trail}
            {centered ? meta : undefined}
            {head}
            {centered ? undefined : meta}
          </helix-flex>
        )}

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
    </div>
  )
}
