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

/** Why choose this over an agency starting from a blank file. */
const REASONS = [
  {
    body: 'A token layer, two tiers, generated framework wrappers, a sandbox and the checks that keep it honest. We are not learning this on your project.',
    name: 'The system already exists',
  },
  {
    body: 'Four weeks, two days a week, because the hard part is behind us. Starting from nothing, the same deliverable is quoted in months.',
    name: 'It is faster because of that',
  },
  {
    body: 'Your repository, your license. Handover is a condition of the work rather than a phase at the end, and no engagement should leave you needing us on a retainer.',
    name: 'You keep all of it',
  },
  {
    body: 'Active ships with users. Building is real work with nothing shipped. Declared is a direction. Nothing here is described as further along than it is.',
    name: 'We tell you what is not done',
  },
]

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
    <div className="reel">
      <section className="hero">
        {/* Behind the claim, and behind it in every sense: no `interactive`, so
            it never asks for the hit test and the two buttons below keep every
            press. It stops itself off screen and in a background tab, and where
            WebGL is refused it draws nothing and the hero is the type it always
            was. */}
        <helix-aura class="heroAura" gain={0.55} scale={1.35} speed={0.45} tilt={42}></helix-aura>
        <div className="heroScrim" />
        <helix-flex class="shell heroShell" direction="column" gap="lg">
          <helix-text appearance="label" tone="subtle">
            Fusion Development Group
          </helix-text>
          <helix-text as="h1" class="heroTitle">
            Interface and intelligence engineering
          </helix-text>
          <helix-text as="p" class="heroLede measure" tone="muted">
            We build the software, and we built the tools underneath it. Helix is MIT and yours to
            take without talking to us. If you would rather we did the work, it starts with a two
            week audit and every price is stated before you ask.
          </helix-text>
          <helix-flex data-density="lg" gap="sm" wrap>
            <Link
              data-button="solid"
              data-button-fill="standard"
              data-button-tone="primary"
              href="/services"
            >
              See what it costs
            </Link>
            <Link data-button data-button-fill="standard" href="/helix">
              Open Helix
            </Link>
          </helix-flex>
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
            {/* Written for the reader who is not buying anything.
                
                `docs/18` records why this band moved above the selling: an
                engineer evaluating a design system had to scroll past three
                bands of offer to learn there was one, and what they found was a
                paragraph. What they want is whether they may use it, how they
                get it, and what happens to them if we stop. Three sentences,
                and none of them mention an engagement. */}
            <helix-text as="p" class="measure" tone="muted">
              Take them and go. Helix is MIT, it installs from npm, and it ships as custom elements
              so the framework above it stays your choice. Nothing here needs us to keep running,
              which is the whole point of building it this way.
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

                {/* The command, where there is one, and the honest sentence
                    where there is not. A `Building` product with an install
                    line would be the stage label saying one thing and the page
                    another. */}
                {product.install ? (
                  <helix-flex direction="column" gap="sm">
                    <helix-code-block label={`Install ${product.name}`}>
                      {product.install}
                    </helix-code-block>
                    <helix-flex align="center" data-density="sm" gap="sm" wrap>
                      <a data-button="subtle" href={product.href}>
                        Open the components
                      </a>
                      <helix-text appearance="caption" tone="subtle">
                        {product.license} licensed
                      </helix-text>
                    </helix-flex>
                  </helix-flex>
                ) : (
                  <helix-flex direction="column" gap="sm">
                    <helix-text appearance="caption" tone="subtle">
                      Nothing to install yet. The shape is written down and the crates are in the
                      open.
                    </helix-text>
                    <helix-flex data-density="sm">
                      <a data-button="subtle" href={product.href}>
                        Read the shape
                      </a>
                    </helix-flex>
                  </helix-flex>
                )}
              </helix-flex>
            ))}
          </helix-grid>
        </helix-flex>
      </section>

      {/* Why us, where the mechanism and the constraint used to be.
          
          Both were arguments a reader had to accept before they reached
          anything they could buy, and both have pages of their own now. What a
          first visit needs here is the reason to choose this over an agency
          starting from a blank file. */}
      <section className="band reveal">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-flex direction="column" gap="sm">
            <helix-text appearance="label" tone="subtle">
              Why us
            </helix-text>
            <helix-text as="h2" class="sectionTitle measure">
              You are hiring the people who built the tools
            </helix-text>
          </helix-flex>

          <helix-grid gap="xl" min="18rem">
            {REASONS.map((reason) => (
              <helix-flex class="substrate" direction="column" gap="sm" key={reason.name}>
                <helix-text as="h3" class="substrateName">
                  {reason.name}
                </helix-text>
                <helix-text as="p" tone="muted">
                  {reason.body}
                </helix-text>
              </helix-flex>
            ))}
          </helix-grid>
        </helix-flex>
      </section>

      {/* Services sits directly under `Why us`, which is a prominence decision
          rather than an ordering accident. It used to sit sixth, under three
          bands of argument: the only part of this anyone can buy was harder to
          reach than the parts that cannot be bought yet. */}
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

          <helix-flex data-density="lg">
            <Link data-button href="/services">
              See what each one costs
            </Link>
          </helix-flex>
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
                <helix-flex data-density="sm">
                  <a data-button href={vertical.href}>
                    Open
                  </a>
                </helix-flex>
              </helix-flex>
            ))}
          </helix-flex>
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
            <Link data-button href="/insights">
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

      {/* The story, last and short. It is why the work compounds rather than
          why anyone should buy it, and a reader who wants it can follow it. */}
      <section className="band reveal">
        <helix-flex class="shell" direction="column" gap="lg">
          <helix-text appearance="label" tone="subtle">
            Where this goes
          </helix-text>
          <helix-text as="h2" class="sectionTitle measure">
            Software now. The rest of the stack after.
          </helix-text>
          <helix-text as="p" class="measure" tone="muted">
            Each engagement that feeds Helix or Cortex makes the next one faster, which is why we
            take the work we take. Energy and hardware are further out and we say so. Behind all of
            it is one rule: nothing we build should create a dependency you cannot leave.
          </helix-text>
          <helix-flex data-density="lg" gap="sm" wrap>
            <Link data-button href="/thesis">
              Read the thesis
            </Link>
            <Link data-button href="/trust">
              The trust bar
            </Link>
          </helix-flex>
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
            data-button-fill="standard"
            data-button-tone="primary"
            data-density="lg"
            href="mailto:hello@fusion.dev"
          >
            hello@fusion.dev
          </a>
        </helix-flex>
      </section>
    </div>
  )
}
