import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findInsight, formatDate, INSIGHTS } from '../../../../lib/insights'
import { BODIES } from '../../../../lib/insights/bodies'
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
      <ReadingProgress />
      {/* **Three groups, not five evenly spaced things.**
          
          Every child used to sit `lg` from the next, so the way out, the
          filing, the title, the standfirst and the byline were all the same
          distance apart and nothing said which of them belonged together. A
          masthead is not a list. It is a way out, then the thing you came for,
          then the facts about it, and the spacing is what says so: `xl` between
          the groups and `md` inside them, so the title and its standfirst read
          as one object and the metadata reads as another. */}
      <helix-flex align="start" class="insightHead" direction="column" gap="xl">
        {/* The way out, above everything. A reader who opened this from the
            gallery wants it before they want the filing labels.

            **A control, not a crumb.** A trail's separators point forward, into
            a hierarchy, and this step points out of one, so the single crumb it
            was built from spent the component on a shape it does not have. The
            heights say the same thing: a crumb link measures 28 and every
            control measures 40, so the moment anything sits beside this (a
            share, a subscribe) the row steps around it.

            The recipe carries all of it. `[data-button]` is `inline-flex`,
            centred, with a gap for the icon and a hover wash, so the chevron is
            just the first child and nothing here needs a rule for any of it.
            `Button` itself takes no `href`, which is the whole reason the
            recipe exists: this is the router's own anchor wearing the control's
            clothes. */}
        <Link className="insightTrail" data-button="ghost" href="/insights">
          <helix-icon name="caret-left"></helix-icon>
          All insights
        </Link>

        {/* The title first, and the filing after the standfirst.
            
            The chips led before, which put two filter labels between a reader
            and the sentence they opened the page for. They are how a piece is
            *found*, and a reader on the page has already finished finding it,
            so they belong with the other facts about the piece rather than
            ahead of it. */}
        <helix-flex align="start" direction="column" gap="md">
          <helix-text as="h1" class="insightTitle">
            {insight.title}
          </helix-text>

          <helix-text as="p" class="insightLede" tone="muted">
            {insight.summary}
          </helix-text>
        </helix-flex>

        {/* One metadata line, and every fact on it is a tag.
            
            It was text with hairlines between it and two chips on the end,
            which made one row out of two vocabularies: the same kind of fact,
            the byline and the filing, drawn as two different kinds of object.
            As tags they are one set, and the dividers go with the change,
            because a chip already has an edge and a rule between two of them is
            a third boundary in a row that only has two.
            
            `outlined` for the facts about this post, which is the appearance
            `Tag` documents for exactly this case: a dense set of them filled
            would turn a row into a mosaic. The subject keeps its wash, so the
            one tag that leads somewhere else is the one that looks like it
            does, and the kind stays neutral beside it. */}
        <helix-flex align="center" class="insightByline" gap="xs" wrap>
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
