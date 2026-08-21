import Link from 'next/link'
import { formatDate, INSIGHTS } from '../../lib/insights'
import { PRODUCTS } from '../products'
import { SERVICES } from '../services'
import { stageAppearance } from '../verticals'
import { Showcase } from './showcase'

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
      {/* Starting at the top of the page and running past the hero.

          **`terminus`, tuned so the angle reads about 23 degrees on a large
          screen.** 23 is the derived number: against a field 1280 by 1600 it
          lands the axis at 979, the midpoint between the navigation's right edge
          and the actions.

          It is not set as `tilt`, and `tilt` would not take if it were: the
          component resolves `terminus` first and only falls back to an angle
          when there is no exit point to honour. The two are asking different
          questions. An angle says where the braid leaves the top edge for one
          shape of box only, and this reel is two screens tall, so its aspect
          moves with the window rather than with the width alone.

          So the exit point is what is declared and 23 is what it draws where it
          matters. Measured across the widths a desktop actually is, at a reel
          twice the viewport's height: 26.0 degrees at 1280, 23.1 at 1512, and
          28.5 from 1920 up, where the reel stops growing with the width. The
          previous 0.76 drew 28.0, 31.3 and 34.0 at those same three.
          
          It used to be inside the hero, so it stopped dead at the end of the
          first band. It scrolls with the page rather than being pinned to the
          window: a field that never moves is a wallpaper. No `interactive`, so
          it never asks for the hit test and every control keeps its presses. It
          stops itself in a background tab, and where WebGL is refused it draws
          nothing and the page is the type it always was. */}
      <helix-aura
        class="reelAura"
        gain={0.55}
        scale={1.7}
        speed={0.45}
        terminus={0.61}
      ></helix-aura>
      <div className="reelScrim" />

      <section className="hero">
        <helix-flex class="shell heroShell" direction="column" gap="lg">
          {/* A tag rather than a line of label text. The name is a thing, not a
              sentence about one, and a tag is what this library uses for a
              thing with a name. The line beside it says what we are made of,
              which is the one fact the title does not carry. */}
          <helix-flex align="center" data-density="sm" gap="sm" wrap>
            <helix-tag>Fusion Development Group</helix-tag>
          </helix-flex>
          <helix-text as="h1" class="heroTitle">
            Interface and intelligence engineering
          </helix-text>
          {/* **Not a sentence about us.** "We build the software, and we built
              the tools underneath it" is two clauses of who we are, offered to
              a reader who has not yet been given a reason to care who we are.
              What they can do with the page is the thing worth saying first,
              and it happens to be the shortest way to say that this is two
              audiences: one takes the tools and never talks to us, the other
              hires the people who wrote them.
    
              One sentence. Three was a paragraph before anybody had decided to
              read one, and the licence, the engagement and the pricing policy
              each have a page that says it better. */}
          <helix-text as="p" class="heroLede measure" tone="muted">
            Take the tools, or hire the people who built them.
          </helix-text>
          <helix-flex data-density="lg" gap="sm" wrap>
            <Link
              data-button="solid"
              data-button-fill="standard"
              data-button-tone="primary"
              href="/services"
            >
              See what we do
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
              What we offer
            </helix-text>
            <helix-text as="h2" class="sectionTitle measure">
              Take the substrates. Hire the work.
            </helix-text>
            {/* **The licence is not the argument, and it used to lead.** Whether
                a package is MIT matters to about one reader in fifty and to
                none of them first: it is a fact for the install page, where
                somebody has already decided to try it. What every reader wants
                to know is whether the thing keeps working without us, which is
                the sovereignty constraint and is the sentence worth the space.
    
                Written for the reader who is not buying anything. `docs/18`
                records why this band sits above the selling. */}
            <helix-text as="p" class="measure" tone="muted">
              Take them and go. They install from npm and ship as custom elements, so the framework
              above them stays your choice, and nothing here needs us to keep running.
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
                    {/* No licence line. It is a fact for whoever is about to
                        install, and the install page is one click away; on a
                        landing card it takes the same weight as the button
                        beside it and answers a question almost nobody asked
                        yet. `license` stays on the product type, where the
                        pages that do want it can read it. */}
                    <helix-flex align="center" data-density="sm" gap="sm" wrap>
                      <a data-button="subtle" href={product.href}>
                        Open the components
                      </a>
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
      {/* Services sits with the substrates, not after the argument for us.
          What we currently offer is three things, and a reader deciding whether
          to care should meet all three together: two they can take and one they
          can hire. `Why us` is a reason to prefer the third and belongs after
          it, not between them. */}
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

      {/* *The verticals band is gone.* It explained the stage vocabulary and
          then listed five rows to apply it to, which is a glossary followed by
          its own index: two of the five are Declared, so the row a reader was
          most likely to press was the one with the least behind it. The labels
          themselves stay wherever a stage is actually claimed, and the thesis
          page is where the argument for them belongs. */}
      {/* **The showcase is the components, not a picture of them.**
    
          A design system on a landing page is usually a screenshot, which
          proves nothing: the one claim worth making here is that these are real
          custom elements that upgrade in your browser on the page you are
          already on. So they are rendered, live, with nothing between the
          reader and the thing. Everything below is the library drawing itself.
    
          Kept to controls that need no state to make sense. A form with real
          validation on a landing page is a demo somebody has to finish; a row
          of components at rest is what the library looks like. */}
      {/* **The one band after the hero that takes a whole screen, and it earns
          it by being a different kind of thing.** The rest are prose with a
          figure under them and are as tall as what is in them. This is a
          window: an argument on the left and the library running on the right,
          held apart by a rule, and a window wants a frame rather than a height
          that ends wherever the last card did.
    
          The stage is sunken, which is the one surface token that reads as
          *behind* the page rather than on it, so the cards sit in a recess and
          the whole panel reads as a thing being looked into. What overflows is
          masked rather than cut: a hard edge says the layout ran out, a fade
          says there is more, which there is. */}
      <section className="band reveal showcaseBand">
        {/* **No rule between them, and more room instead.** A line is one way
            to say two things are separate and whitespace is the other, and
            whitespace does not have to be looked past. The splitter that was
            here made where the line falls a judgement a reader could take, and
            it was still a line down the middle of a section whose two halves
            already read as two halves.
    
            The gap does the work at `3xl`, the widest the scale goes, which is wider than anything else on
            the page joins with, because the two sides are not a pair of columns
            in a layout: they are an argument and the thing it is about. */}
        <div className="shell showcaseSplit">
          <helix-flex class="showcaseProse" direction="column" gap="sm">
            <helix-text appearance="label" tone="subtle">
              Helix
            </helix-text>
            <helix-text as="h2" class="sectionTitle">
              Drawn by the thing it documents
            </helix-text>
            <helix-text as="p" tone="muted">
              Every control beside this is a custom element from the library, rendered here rather
              than pictured. The palette under them is derived from one brand colour, which is why
              nothing had to be chosen twice.
            </helix-text>
            <helix-flex data-density="lg">
              <Link data-button href="/helix">
                Open the component index
              </Link>
            </helix-flex>
          </helix-flex>

          <Showcase />
        </div>
      </section>

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

          {/* **A carousel, and this is the section that earns one.**
              The registry is already newest-first, so this is an order rather
              than a ranking, and a carousel is what shows a set of peers whose
              order carries no weight past the first. It used to be a grid of
              the newest three with a link out for the rest, which meant the
              page held eight arguments and showed three of them.

              Not the hero, where a reader who arrived for one sentence should
              not be handed a thing that moves. Not the showcase, which is
              already a panel that cycles and would then be a carousel inside
              a carousel. Not Services or Questions, whose items are a set to
              be read whole rather than one at a time.

              No `autoplay`. Everything here is prose a reader chooses to
              start, and copy that slides away mid-sentence is the reason
              carousels have the reputation they do. `loop` because the set is
              small and reaching the end of eight is not a wall worth hitting.

              Four across, so the row reads as a shelf of arguments rather than
              one card with space either side of it. The card narrows to about a
              quarter of the shell, which is why its summary is clamped: a
              three-line teaser under a title is a card, and an unclamped
              paragraph at that width is a column. */}
          <helix-carousel class="insightReel" label="Insights" loop per-view={4}>
            {INSIGHTS.map((insight) => (
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
          </helix-carousel>
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
