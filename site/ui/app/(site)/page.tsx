import Link from 'next/link'
import { formatDate, INSIGHTS } from '../../lib/insights'
import { PRODUCTS } from '../products'
import { SERVICES } from '../services'
import { stageAppearance, VERTICALS } from '../verticals'

/**
 * The Fusion landing page.
 *
 * Copy comes from the strategy docs rather than being written fresh, so the
 * site and the plan cannot drift: the thesis is `docs/00-thesis.md` and the
 * constraint is the one in `CLAUDE.md`.
 *
 * One idea per band, each given a screen's worth of room. The page is a
 * sequence of single statements rather than a wall of sections, so what carries
 * the hierarchy is type and emptiness rather than rules and boxes.
 *
 * A server component with no client boundary of its own. Elements upgrade from
 * the single registration in the root layout.
 */

const questions = [
  {
    answer:
      'Nothing you depend on stops working. You hold your own keys, your own data, and your own hardware. We may operate a control plane, never a chokepoint. If a product cannot pass that test, it is not one of ours.',
    question: 'What happens if Fusion shuts down tomorrow?',
  },
  {
    answer:
      'Rust for the backend and the substrate cores, TypeScript for everything on the front. Interfaces ship as web components, so the framework above them is a choice rather than a commitment.',
    question: 'What is the stack?',
  },
  {
    answer:
      'Two, and neither is a product. Helix is the design system and Cortex is the memory and provenance layer. Everything else is built on top of them.',
    question: 'How many substrates are there?',
  },
  {
    answer:
      'Cheap intelligence and cheap energy are arriving at the same time. That pairing is what moves sovereignty from a principle you agree with to a thing you can run. Personal first, then organizational, then national.',
    question: 'Why now?',
  },
]

export default function Home() {
  return (
    <>
      <section className="hero">
        <helix-flex class="shell" direction="column" gap="lg">
          <helix-text appearance="label" tone="subtle">
            Fusion Development Group
          </helix-text>
          <helix-text as="h1" class="heroTitle">
            Sovereignty at every scale
          </helix-text>
          <helix-text as="p" class="heroLede measure" tone="muted">
            Cheap intelligence and cheap energy are collapsing in cost at the same moment. What was
            affordable only to an institution becomes affordable to a person. We build the stack
            that makes that practical.
          </helix-text>
          <helix-flex data-density="lg" gap="sm" wrap>
            <Link data-button="solid" data-button-tone="primary" href="/helix">
              See what is shipping
            </Link>
            <a data-button href="mailto:hello@fusion.dev">
              Start a conversation
            </a>
          </helix-flex>
        </helix-flex>
      </section>

      <section className="band reveal">
        <helix-flex class="shell" direction="column" gap="lg">
          <helix-text appearance="label" tone="subtle">
            Why now
          </helix-text>
          <helix-text as="h2" class="sectionTitle measure">
            Abundance is the mechanism
          </helix-text>
          <helix-text as="p" class="measure" tone="muted">
            The two things that forced a person to depend on an institution were the cost of
            thinking at scale and the cost of power. Both are falling, and the same argument runs
            all the way up: a household, a company, and a country each become sovereign through the
            same stack at a different scale.
          </helix-text>
        </helix-flex>
      </section>

      <section className="band reveal">
        <helix-flex class="shell statement" direction="column" gap="lg">
          <helix-text appearance="label" tone="subtle">
            The Sovereignty Constraint
          </helix-text>
          <helix-text as="p" class="statementText">
            No Fusion product may create a dependency its user cannot exit.
          </helix-text>
          <helix-text as="p" tone="muted">
            The user holds their own keys, data, and hardware. Fusion may operate a control plane,
            never a chokepoint.
          </helix-text>
        </helix-flex>
      </section>

      <section className="band reveal">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-flex direction="column" gap="sm">
            <helix-text appearance="label" tone="subtle">
              Two substrates
            </helix-text>
            <helix-text as="h2" class="sectionTitle measure">
              Everything else is built on these
            </helix-text>
          </helix-flex>

          <helix-grid gap="xl" min="22rem">
            {PRODUCTS.map((product) => (
              <helix-flex class="substrate" direction="column" gap="sm" key={product.name}>
                <helix-flex align="center" data-density="sm" gap="sm">
                  <helix-text appearance="label" tone="subtle">
                    {product.role}
                  </helix-text>
                  <helix-tag tone={stageAppearance(product.stage)}>{product.stage}</helix-tag>
                </helix-flex>
                <helix-text as="h3" class="substrateName">
                  {product.name}
                </helix-text>
                <helix-text as="p" tone="muted">
                  {product.body}
                </helix-text>
                <a data-link href={product.href}>
                  Read more
                </a>
              </helix-flex>
            ))}
          </helix-grid>
        </helix-flex>
      </section>

      <section className="band reveal">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-flex direction="column" gap="sm">
            <helix-text appearance="label" tone="subtle">
              Verticals
            </helix-text>
            <helix-text as="h2" class="sectionTitle measure">
              Stage labels are honest
            </helix-text>
            <helix-text as="p" class="measure" tone="muted">
              Active ships with users. Building is real work with nothing shipped. Declared is
              committed direction with no work started. A roadmap that shows only the parts going
              well is a brochure.
            </helix-text>
          </helix-flex>

          <helix-flex direction="column">
            {VERTICALS.map((vertical) => (
              <helix-flex
                align="center"
                class="verticalRow"
                gap="md"
                justify="between"
                key={vertical.href}
                wrap
              >
                <helix-flex direction="column" gap="2xs">
                  <helix-flex align="center" data-density="sm" gap="sm">
                    <helix-text as="h3" class="verticalName">
                      {vertical.name}
                    </helix-text>
                    <helix-tag tone={stageAppearance(vertical.stage)}>{vertical.stage}</helix-tag>
                  </helix-flex>
                  <helix-text tone="muted">{vertical.summary}</helix-text>
                </helix-flex>
                <a data-link="quiet" href={vertical.href}>
                  Open
                </a>
              </helix-flex>
            ))}
          </helix-flex>
        </helix-flex>
      </section>

      {/* Services sits directly after the map, which is a prominence decision
          rather than an ordering accident. Everything above this band is being
          built; this is the only part of it anyone can buy today, and it should
          not be harder to find than the things that cannot yet be bought. */}
      <section className="band reveal">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-flex direction="column" gap="sm">
            <helix-text appearance="label" tone="subtle">
              Services
            </helix-text>
            <helix-text as="h2" class="sectionTitle measure">
              The part you can buy today
            </helix-text>
            <helix-text as="p" class="measure" tone="muted">
              Interface and intelligence work the substrates make faster to do well. It starts with
              a two week audit, and every price is stated in full, because an offer you cannot
              compare is not an offer.
            </helix-text>
          </helix-flex>

          <helix-grid gap="xl" min="18rem">
            {SERVICES.map((service) => (
              <helix-flex class="substrate" direction="column" gap="sm" key={service.name}>
                <helix-icon name={service.icon}></helix-icon>
                <helix-text as="h3" class="substrateName">
                  {service.name}
                </helix-text>
                {/* No number here, and the prices page is one line below.
                    
                    Three offers in a row with three five-figure sums beside
                    them is a price list, and a landing band is not one: a
                    reader meets the cost before they have been told what any of
                    it is, which is the anchoring problem `docs/17` names for the
                    sprint in particular. The figures are stated in full on
                    `/services`, where the sentence explaining each one arrives
                    first. */}
                <helix-text as="p" tone="muted">
                  {service.summary}
                </helix-text>
              </helix-flex>
            ))}
          </helix-grid>

          <Link data-link href="/services">
            See what each one includes, and what it costs
          </Link>
        </helix-flex>
      </section>

      <section className="band reveal">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-text as="h2" class="sectionTitle measure">
            Questions
          </helix-text>
          {/* Framed, because this one sits directly on the page. */}
          <helix-accordion appearance="outlined">
            {questions.map((entry) => (
              <helix-accordion-item key={entry.question}>
                <helix-text appearance="body-strong" slot="summary">
                  {entry.question}
                </helix-text>
                <helix-text class="measure" tone="muted">
                  {entry.answer}
                </helix-text>
              </helix-accordion-item>
            ))}
          </helix-accordion>
        </helix-flex>
      </section>

      <section className="band reveal">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-flex align="center" gap="md" justify="between" wrap>
            <helix-flex direction="column" gap="sm">
              <helix-text appearance="label" tone="subtle">
                Insights
              </helix-text>
              <helix-text as="h2" class="sectionTitle measure">
                The arguments, written down
              </helix-text>
            </helix-flex>
            <Link data-link href="/insights">
              Read all
            </Link>
          </helix-flex>

          {/* Three, and the registry is already newest-first, so this is a
              slice rather than a sort: the landing page should not hold a
              second opinion about what recent means. */}
          <helix-grid gap="xl" min="18rem">
            {INSIGHTS.slice(0, 3).map((insight) => (
              <Link
                aria-label={insight.title}
                className="insightCard"
                data-card
                href={`/insights/${insight.slug}`}
                key={insight.slug}
              >
                <helix-card appearance="outlined">
                  <helix-tag slot="header">{insight.topic}</helix-tag>
                  <helix-flex direction="column" gap="xs">
                    <helix-text appearance="title" as="h3">
                      {insight.title}
                    </helix-text>
                    <helix-text appearance="caption" tone="muted">
                      {insight.summary}
                    </helix-text>
                  </helix-flex>
                  <helix-text appearance="caption" slot="footer" tone="subtle">
                    <time dateTime={insight.date}>{formatDate(insight.date)}</time>
                  </helix-text>
                </helix-card>
              </Link>
            ))}
          </helix-grid>
        </helix-flex>
      </section>

      <section className="band closing reveal">
        <helix-flex align="center" class="shell" direction="column" gap="lg">
          <helix-text as="h2" class="sectionTitle">
            Take on the work
          </helix-text>
          <helix-text as="p" class="measure" tone="muted">
            We take on interface and intelligence work the substrates make faster to do well. If
            that is what you need, say so plainly and we will tell you whether we are the right
            people for it.
          </helix-text>
          <a
            data-button="solid"
            data-button-tone="primary"
            data-density="lg"
            href="mailto:hello@fusion.dev"
          >
            hello@fusion.dev
          </a>
        </helix-flex>
      </section>
    </>
  )
}
