import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findInsight, formatDate, INSIGHTS } from '../../../../lib/insights'
import { BODIES } from '../../../../lib/insights/bodies'

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
  return { description: insight.summary, title: insight.title }
}

/**
 * One post, set as a centered column.
 *
 * **The head is three tiers and they are ordered by what a reader needs first.**
 * The way out, then what the piece is, then who wrote it and how long it takes.
 * It used to be one undifferentiated row of four chips: topic, kind, date and
 * minutes all at the same weight, so nothing in it was answering a question
 * anyone had. Filing labels belong above the title, the byline belongs under it
 * with the title between them, and the way back belongs at the very top where a
 * reader's hand already is, as a trail rather than an arrow.
 *
 * Left, and the prose with it. Centred was the old arrangement, on the argument
 * that a centred measure is a column the eye can find, and that holds while the
 * column is narrow. At 90ch it stops: a centred head starts in a different place
 * from every line beneath it, so the reader keeps two left edges instead of one.
 *
 * `align` and not only `text-align`. This is a flex column, so its children are
 * placed as items rather than flowed as text: with `align="center"` the title,
 * the labels and the byline each sat at their own left edge, 515, 694 and 585
 * against the body's 429, and every one of them reported `text-align: start`.
 */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const insight = findInsight(slug)
  const Body = insight ? BODIES[insight.slug] : undefined

  if (!insight || !Body) {
    notFound()
  }

  const others = INSIGHTS.filter((entry) => entry.slug !== insight.slug).slice(0, 3)

  return (
    <helix-flex class="insightShell" direction="column" gap="2xl">
      <helix-flex align="start" class="insightHead" direction="column" gap="lg">
        {/* The way out, above everything. A reader who opened this from the
            gallery wants it before they want the filing labels. */}
        {/* **One crumb pointing back, and it is a real `Breadcrumbs` rather
            than a link dressed as one.** The crumb already owns the hover wash,
            the radius, the padding and the pull-back that makes the first step
            start where the content does. A back link styled to match would be
            those four decisions copied into a stylesheet, to drift the first
            time one of them changes.

            A full trail was here for a moment and said `Insights / Company /
            this title`, which is where the page sits and is not what a reader
            wants from the top left: the title is already the next thing they
            read, and the topic is a filter they did not ask for. The one thing
            worth offering is the way out.

            The chevron is inside the link rather than drawn by the component,
            which is what lets a single crumb point left: `Breadcrumbs` puts its
            separators *between* steps, so it has none to give before the
            first. */}
        <helix-breadcrumbs aria-label="Breadcrumb" class="insightTrail">
          <helix-breadcrumb>
            <Link data-link="quiet" href="/insights">
              <helix-icon name="caret-left"></helix-icon>
              All insights
            </Link>
          </helix-breadcrumb>
        </helix-breadcrumbs>

        <helix-flex align="center" data-density="sm" gap="xs" wrap>
          <helix-tag tone="primary">{insight.topic}</helix-tag>
          <helix-tag>{insight.kind}</helix-tag>
        </helix-flex>

        <helix-text as="h1" class="insightTitle">
          {insight.title}
        </helix-text>

        <helix-text as="p" class="insightLede" tone="muted">
          {insight.summary}
        </helix-text>

        {/* The byline under the title rather than beside the topic. Who wrote a
            thing and how long it takes are the two questions a reader has once
            they have decided the subject is theirs. */}
        <helix-flex align="center" class="insightByline" data-density="sm" gap="sm">
          <helix-avatar name={insight.author} size="sm"></helix-avatar>
          <helix-text appearance="body-strong">{insight.author}</helix-text>
          <helix-divider orientation="vertical"></helix-divider>
          <helix-text tone="muted">
            <time dateTime={insight.date}>{formatDate(insight.date)}</time>
          </helix-text>
          <helix-divider orientation="vertical"></helix-divider>
          <helix-text tone="muted">{insight.minutes} min read</helix-text>
        </helix-flex>
      </helix-flex>

      {/* `data-prose` because this is the one place on the site rendering prose
          the design system did not lay out. */}
      <article className="insightBody" data-prose>
        <Body />
      </article>

      <helix-flex class="insightMore" direction="column" gap="lg">
        <helix-divider></helix-divider>
        <helix-flex align="center" gap="md" justify="between" wrap>
          <helix-text appearance="title" as="h2">
            Keep reading
          </helix-text>
          <Link data-link href="/insights">
            All insights
          </Link>
        </helix-flex>

        <helix-flex direction="column" gap="none">
          {others.map((other) => (
            <Link className="insightNext" href={`/insights/${other.slug}`} key={other.slug}>
              <helix-flex align="center" class="insightNextRow" gap="md" justify="between">
                <helix-flex direction="column" gap="2xs">
                  <helix-flex align="center" data-density="sm" gap="xs">
                    <helix-tag>{other.topic}</helix-tag>
                    <helix-text appearance="caption" tone="subtle">
                      {other.minutes} min
                    </helix-text>
                  </helix-flex>
                  <helix-text appearance="title">{other.title}</helix-text>
                  <helix-text appearance="caption" class="measure" tone="muted">
                    {other.summary}
                  </helix-text>
                </helix-flex>
                <helix-icon name="arrow-right"></helix-icon>
              </helix-flex>
            </Link>
          ))}
        </helix-flex>
      </helix-flex>
    </helix-flex>
  )
}
