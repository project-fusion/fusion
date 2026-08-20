import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findInsight, formatDate, INSIGHTS } from '../../../../lib/insights'
import { BODIES } from '../../../../lib/insights/bodies'

/**
 * Every post, rendered at build. The set is a static registry, so there is
 * nothing to discover at request time and no reason for any of these to be
 * dynamic.
 */
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
 * One post.
 *
 * A column of prose, held to a measure, with the metadata above it and the
 * neighbouring posts below. No hero: this page is the writing, and a band of
 * chrome over it would be the site talking about itself on top of the thing a
 * reader came to read.
 *
 * **The body is looked up rather than imported by name**, so `bodies.tsx` is
 * the only file that has to change when a post is added, and `notFound` covers
 * both halves: a slug with no registry entry and a registry entry with no
 * prose. The second is the one worth guarding, because it is what a
 * half-finished commit looks like and it would otherwise render a title over
 * nothing.
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
    <helix-flex class="shell insightShell" direction="column" gap="2xl">
      <helix-flex class="measure" direction="column" gap="md">
        <helix-flex align="center" data-density="sm" gap="sm" wrap>
          <helix-tag>{insight.topic}</helix-tag>
          <helix-text appearance="caption" tone="subtle">
            {insight.kind}
          </helix-text>
          <helix-text appearance="caption" tone="subtle">
            <time dateTime={insight.date}>{formatDate(insight.date)}</time>
          </helix-text>
          <helix-text appearance="caption" tone="subtle">
            {insight.minutes} min
          </helix-text>
        </helix-flex>
        <helix-text as="h1" class="insightTitle">
          {insight.title}
        </helix-text>
        <helix-text as="p" class="lede" tone="muted">
          {insight.summary}
        </helix-text>
      </helix-flex>

      {/* `data-prose` because this is the one place on the site rendering prose
          the design system did not lay out: the base layer themes headings,
          paragraphs and anchors only under this attribute, which is what keeps
          it off every component that happens to slot a `<p>`. */}
      <article className="insightBody measure" data-prose>
        <Body />
      </article>

      <helix-divider></helix-divider>

      <helix-flex direction="column" gap="lg">
        <helix-text appearance="label" tone="subtle">
          More insights
        </helix-text>
        <helix-grid gap="xl" min="18rem">
          {others.map((other) => (
            <Link
              aria-label={other.title}
              className="insightCard"
              data-card
              href={`/insights/${other.slug}`}
              key={other.slug}
            >
              <helix-card appearance="outlined">
                <helix-tag slot="header">{other.topic}</helix-tag>
                <helix-flex direction="column" gap="xs">
                  <helix-text appearance="title" as="h3">
                    {other.title}
                  </helix-text>
                  <helix-text appearance="caption" tone="muted">
                    {other.summary}
                  </helix-text>
                </helix-flex>
              </helix-card>
            </Link>
          ))}
        </helix-grid>
      </helix-flex>
    </helix-flex>
  )
}
