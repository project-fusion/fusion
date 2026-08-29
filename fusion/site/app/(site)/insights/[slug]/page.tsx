import { sitePageSources } from '@fusion.dev/insights'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { pageMetadata } from '@/utils/metadata/metadata'
import { findInsight, formatDate, INSIGHTS } from '../../../../content/insights'
import { renderDocument } from '../../../../utils/mdx/mdx'
import { DocumentPage } from '../../document-page'
import styles from '../insights.module.css'
import { PublishedOn, ReadingProgress } from './reading'

export function generateStaticParams(): { slug: string }[] {
  return INSIGHTS.map((insight) => ({ slug: insight.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const insight = findInsight(slug)
  if (!insight) {
    return {}
  }
  /* `article`, which is the one place on this site the type is not `website`:
     these have an author, a date and a subject, and the rest are pages. */
  return pageMetadata({
    description: insight.summary,
    path: `/insights/${insight.slug}`,
    title: insight.title,
    type: 'article',
  })
}

/**
 * One post, set as a centered column.
 *
 * **The head is three tiers and they are ordered by what a reader needs first.**
 * The way out, then what the piece is, then who wrote it and how long it takes.
 * One undifferentiated row of chips holds topic, kind, date and minutes at the
 * same weight, where none of them answers a question anyone had. Filing labels
 * belong above the title, the byline belongs under it with the title between
 * them, and the way back belongs at the very top where a reader's hand already
 * is, as a trail rather than an arrow.
 *
 * Left, and the prose with it. A centered measure is a column the eye can find
 * while the column is narrow, and at 90ch it stops: a centered head starts in a
 * different place from every line beneath it, so the reader keeps two left edges
 * instead of one.
 *
 * `align` and not only `text-align`. This is a flex column, so its children are
 * placed as items rather than flowed as text: with `align="center"` the title,
 * the labels and the byline each sat at their own left edge, 515, 694 and 585
 * against the body's 429, and every one of them reported `text-align: start`.
 */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const insight = findInsight(slug)
  const source = insight ? sitePageSources[insight.slug] : undefined

  if (!insight || !source) {
    notFound()
  }

  const others = INSIGHTS.filter((entry) => entry.slug !== insight.slug).slice(0, 3)

  return (
    <DocumentPage
      body={await renderDocument(source)}
      footer={
        <helix-flex class="insightMore" direction="column" gap="lg">
          <helix-divider></helix-divider>
          <helix-flex align="center" gap="md" justify="between" wrap>
            <helix-text as="h2" variant="title">
              Keep reading
            </helix-text>
            {/* Quiet rather than the default link treatment: a bright underlined
                  link beside a section heading competes with the heading, and this
                  is an escape hatch under three rows that are themselves the main
                  way on. No arrow. The rows carry one because each of them is a
                  destination in a stack of destinations and the glyph says which
                  way they go; this sits beside a heading, where the same glyph is
                  decoration on a link that already reads as one. */}
            <Link data-link="quiet" href="/insights">
              All insights
            </Link>
          </helix-flex>

          {/* A hair of space between the rows now that no line divides them. Not
                more: these are one list, and a gap wide enough to read as a break
                would make three lists of them. */}
          <helix-flex direction="column" gap="2xs">
            {others.map((other) => (
              <Link
                className={styles.insightNext}
                href={`/insights/${other.slug}`}
                key={other.slug}
              >
                <helix-flex align="center" class={styles.insightNextRow} gap="md" justify="between">
                  <helix-flex direction="column" gap="2xs">
                    <helix-flex align="center" data-density="sm" gap="xs">
                      <helix-tag>{other.topic}</helix-tag>
                      <helix-text tone="subtle" variant="caption">
                        {other.minutes} min
                      </helix-text>
                    </helix-flex>
                    <helix-text variant="title">{other.title}</helix-text>
                    <helix-text data-measure tone="muted" variant="caption">
                      {other.summary}
                    </helix-text>
                  </helix-flex>
                  <helix-icon name="arrow-right"></helix-icon>
                </helix-flex>
              </Link>
            ))}
          </helix-flex>
        </helix-flex>
      }
      hero
      lede={insight.summary}
      meta={
        <>
          {/* One metadata line, and every fact on it is a tag.

                The byline and the filing are the same kind of fact, so drawing
                them as text with hairlines beside chips makes one row out of two
                vocabularies. As tags they are one set, and there are no dividers,
                because a chip already has an edge and a rule between two of them
                is a third boundary in a row that only has two.

                `outlined` for the facts about this post, which is the appearance
                `Tag` documents for exactly this case: a dense set of them filled
                would turn a row into a mosaic. The subject keeps its wash, so the
                one tag that leads somewhere else is the one that looks like it
                does, and the kind stays neutral beside it. */}
          <helix-flex align="center" class={styles.insightByline} gap="xs" wrap>
            <helix-tag>
              <helix-avatar name={insight.author} slot="prefix"></helix-avatar>
              {insight.author}
            </helix-tag>
            <helix-tag>
              <PublishedOn date={insight.date}>{formatDate(insight.date)}</PublishedOn>
            </helix-tag>
            <helix-tag>{insight.minutes} min read</helix-tag>
            {/* The two that lead somewhere actually lead there. The gallery
                  already seeds its filters from the query string on the server, so
                  a topic is a working filter rather than a label describing one,
                  and it costs an `href`. */}
            <Link data-link="quiet" href={`/insights?topic=${encodeURIComponent(insight.topic)}`}>
              <helix-tag tone="primary">{insight.topic}</helix-tag>
            </Link>
            <Link data-link="quiet" href={`/insights?kind=${encodeURIComponent(insight.kind)}`}>
              <helix-tag>{insight.kind}</helix-tag>
            </Link>
          </helix-flex>
        </>
      }
      title={insight.title}
      trail={
        <>
          <ReadingProgress />
          {/* The way out, above everything. A reader who opened this from the
                gallery wants it before they want the filing labels.

                **A control, not a crumb.** A trail's separators point forward, into
                a hierarchy, and this step points out of one, so a single crumb
                spends the component on a shape it does not have. The heights say
                the same thing: a crumb link measures 28 and every control measures
                40, so the moment anything sits beside this (a share, a subscribe)
                the row steps around it.

                The recipe carries all of it. `[data-button]` is `inline-flex`,
                centered, with a gap for the icon and a hover wash, so the chevron is
                just the first child and nothing here needs a rule for any of it.
                `Button` itself takes no `href`, which is the whole reason the
                recipe exists: this is the router's own anchor wearing the control's
                clothes. */}
          <Link className={styles.insightTrail} data-button="ghost" href="/insights">
            <helix-icon name="caret-left"></helix-icon>
            All insights
          </Link>
        </>
      }
    />
  )
}
