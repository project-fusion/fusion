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
import Link from 'next/link'
import { formatDate, INSIGHTS } from '../../lib/insights'
import { PRODUCTS } from '../products'
import { SERVICES } from '../services'
import { stageAppearance } from '../verticals'
import { InsightCard } from './insight-card'
import styles from './landing.module.css'
import { Showcase } from './showcase'

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

export default function Home() {
  return (
    <div className={styles.reel}>
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
        class={styles.reelAura}
        gain={0.85}
        scale={1.7}
        shape="flow"
        speed={1}
        terminus={0.5625}
      ></helix-aura>
      <div className={styles.reelScrim} />

      <section className={styles.hero}>
        <helix-flex align="center" class={`shell ${styles.heroShell}`} direction="column" gap="lg">
          {/* A tag rather than a line of label text. The name is a thing, not a
              sentence about one, and a tag is what this library uses for a
              thing with a name. The line beside it says what we are made of,
              which is the one fact the title does not carry. */}
          <helix-flex align="center" data-density="sm" gap="sm" wrap>
            <helix-tag>Fusion Development Group</helix-tag>
          </helix-flex>
          <helix-text as="h1" class="heroTitle">
            The interface layer, already built
          </helix-text>
          {/* **Half the words it had, because a hero is read standing up.** The
              title carried nine words and the lede three sentences, one of
              which named both substrates and their jobs before a reader had
              asked what either was. The names are one click away in the band
              below and on the bar above; what the hero owes is the shape of the
              offer, which is: these exist, and there are two ways to use them.

              **The title is the reader's problem and the lede is the answer.**
              Both lines were about us before: a discipline we practise, then
              the two audiences we serve. Neither told a reader what they get.
              The interface layer is the expensive part of any serious product,
              which is a fact about their work rather than about ours.

              **Helix only, and Cortex is not named here.** The hero is a
              reader's first sentence about us, and it should name the thing
              they can have. Helix is nearly shippable and the line below this
              installs it; Cortex is a long way from a release, and a front door
              naming both spends half its only sentence on something nobody can
              use yet. That is the argument the stage labels make everywhere
              else on the site, applied to the place where getting it wrong
              costs most. Cortex belongs where it can be described honestly,
              with a stage on it, rather than in a line that reads as an offer.

              **The sovereignty argument is not here, deliberately.** It is a
              claim about where this goes rather than about what exists, and a
              front door that leads with it asks a reader to buy a future before
              being shown a present. `/thesis` is where it belongs and where it
              still is. */}
          <helix-text as="p" class="heroLede measure" tone="muted">
            Take Helix and go, or hire us to build with it.
          </helix-text>
          <helix-flex align="center" data-density="lg" gap="sm" justify="center" wrap>
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

          {/* The shortest true path into the thing the page is about.
              
              Two buttons ask a reader to go somewhere and read; this asks them
              to type one line and have the library. It is the only element in
              the hero that is not a claim, which is why it is last and quiet:
              a reader who is convinced does not need the buttons, and a reader
              who is not will not start with a package name.

              `CopyButton` rather than a code block with a button beside it,
              because the whole line is the payload and the copy is the only
              interaction it has. */}
          <helix-flex align="center" class={styles.heroInstall} gap="2xs">
            <code>bun add @helix-io/web</code>
            <helix-copy-button
              copied-label="Copied"
              label="Copy the install command"
              value="bun add @helix-io/web"
            ></helix-copy-button>
          </helix-flex>
        </helix-flex>
      </section>

      <section className={`band reveal`}>
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-flex direction="column" gap="sm">
            {/* **No kicker and no title.** Two named cards and a services block
                below them are already legible as a choice; a heading above
                saying some version of "here are the things" is a row of chrome
                that names what the reader can see. The label and the h2 that
                stood here answered the same question the section answers, in
                the same words, one line earlier. */}
            {/* **What they are, not what they promise.** This paragraph led
                with the sovereignty constraint, that nothing here needs us to
                keep running. True, and a claim about the future rather than a
                description of the present, which is the line this page now
                holds: what exists here, what is coming on `/thesis`. What a
                reader wants at this point is what the two things *are* and how
                they arrive, which is also the half that is checkable today.

                The licence stays out of it for the reason it was taken out
                before: whether a package is MIT matters to about one reader in
                fifty and to none of them first. */}
            <helix-text as="p" class="measure" tone="muted">
              Two substrates, both in production. They install from npm and ship as custom elements,
              so the framework above them stays your choice.
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
      <section className={`band reveal`}>
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-flex direction="column" gap="sm">
            <helix-text appearance="label" tone="subtle">
              Services
            </helix-text>
            <helix-text as="h2" class="sectionTitle measure">
              The part you can buy today
            </helix-text>
            <helix-text as="p" class="measure" tone="muted">
              It starts with a two week audit, and every price is published: an offer you cannot
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
      <section className={`band reveal ${styles.showcaseBand}`}>
        {/* **No rule between them, and more room instead.** A line is one way
            to say two things are separate and whitespace is the other, and
            whitespace does not have to be looked past. The splitter that was
            here made where the line falls a judgement a reader could take, and
            it was still a line down the middle of a section whose two halves
            already read as two halves.
    
            The gap does the work at `3xl`, the widest the scale goes, which is wider than anything else on
            the page joins with, because the two sides are not a pair of columns
            in a layout: they are an argument and the thing it is about. */}
        <div className={`shell ${styles.showcaseSplit}`}>
          <helix-flex class={styles.showcaseProse} direction="column" gap="sm">
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

      <section className={`band reveal`}>
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-flex direction="column" gap="sm">
            <helix-text appearance="label" tone="subtle">
              Why us
            </helix-text>
            {/* **"You are hiring the people who built the tools" was the hero's
                fork said a second time**, and by this point a reader has met it
                twice already. What only this section can say is what the
                engagement is actually like, which is what its four cards
                answer: the system exists, that makes it faster, you keep it,
                and we say what is not done. */}
            <helix-text as="h2" class="sectionTitle measure">
              How the work goes
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

      <section className={`band reveal`}>
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
              <InsightCard insight={insight} key={insight.slug} />
            ))}
          </helix-carousel>
        </helix-flex>
      </section>

      {/* The story, last and short. It is why the work compounds rather than
          why anyone should buy it, and a reader who wants it can follow it. */}
      <section className={`band closing reveal`}>
        <helix-flex align="center" class="shell" direction="column" gap="lg">
          <helix-text as="h2" class="sectionTitle">
            Take on the work
          </helix-text>
          <helix-text as="p" class="measure" tone="muted">
            Tell us what you need built. We will say plainly whether we are the right people for it.
          </helix-text>
          {/* `/contact` rather than the mail client. The address is still the
              action and is on that page; what a `mailto:` cannot carry is what
              to put in the message and what happens after it, which is the part
              a reader is actually uncertain about. */}
          <a
            data-button="solid"
            data-button-fill="standard"
            data-button-tone="primary"
            data-density="lg"
            href="/contact"
          >
            Start a conversation
          </a>
        </helix-flex>
      </section>
    </div>
  )
}
