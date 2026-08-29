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
   * The head on a lit band rather than on the page, for a document that is read
   * as a piece rather than consulted as a reference.
   *
   * **Opt-in, because this shell serves six pages and only some of them are
   * that.** An insight and the thesis are arguments somebody chose to read, and
   * a hero is the cover of the piece. Terms of use, the privacy notice and the
   * acceptable use policy are documents a reader arrives at with a question, and
   * a full-bleed aura over a legal notice reads as marketing wrapped around a
   * contract. So the band is a prop the two pass and the other four do not,
   * rather than a change to the shell.
   *
   * The body below is the same in both: same measure, same rhythm, same prose
   * treatment. What changes is the head.
   */
  hero?: boolean
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
          <helix-flex align="start" class={styles.documentHead} direction="column" gap="lg">
            {trail}
            {head}
            {meta}
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
