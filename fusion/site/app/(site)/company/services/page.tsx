import { findSitePage, sitePageSources } from '@fusion.dev/insights'
import { Band, band } from '@/components/band/band'
import documents from '@/components/document-page/document-page.module.css'
import { PageHero } from '@/components/page-hero/page-hero'
import { ThemeScope } from '@/components/theme-context/theme-context'
import { SERVICES } from '@/content/services/services'
import { renderDocument } from '@/utils/mdx/mdx'
import { pageMetadata } from '@/utils/metadata/metadata'
import { EMAIL, MAILTO } from '@/utils/site/site'
import styles from './page.module.css'

export const metadata = pageMetadata({
  description:
    'Three offers: an AI capability audit, a design system sprint, and conversational build.',
  path: '/company/services',
  title: 'Services',
})

/**
 * Services.
 *
 * **No figures on the page, which is a reversal and is worth saying so.** This
 * read "the only page on the site with a price on it", on the argument that an
 * offer whose cost appears only after a conversation cannot be compared. That
 * argument is still true about *offers*; what changed is the judgment about
 * whether this page is where the number belongs, and that is a commercial call
 * rather than a design one.
 *
 * The ranges are still in `services.ts`, where the costing that produces
 * them is argued. Nothing renders them today.
 *
 * The constraint appears here as terms rather than as a principle. Quoted at a
 * buyer mid-page it asks them to care about a governance rule while they are
 * working out what they are committing to; said as what they keep and what they
 * are not signing up for, it is the thing they wanted to know. The rule itself
 * lives on `/trust`.
 *
 * Copy lives in `services.ts` rather than here, so this page and the offer
 * cannot drift on what is actually sold.
 *
 * **It is built out of the landing page's parts, which was the point of the
 * rebuild.** A lit band for the head, one glass panel per idea, and the same
 * `--site-band` rhythm with the same reveal, so a reader arriving from the
 * landing page is on the same site rather than on a plainer one that shares a
 * masthead. What it is not is the landing page's *structure*: there is no reel
 * and no scroll-snap, because this is a page somebody reads to decide something
 * rather than a sequence they are walked through.
 *
 * A server component with no client boundary of its own. Elements upgrade from
 * the single registration in the root layout.
 */
const page = findSitePage('/company/services')

export default async function Page() {
  const source = page ? sitePageSources[page.slug] : undefined
  /* One string per `##`, with the heading kept at the head of its own half. A
     document with one section yields one panel and the row collapses to it. */
  /* Rendered before the markup rather than inside it: `map` takes a plain
     callback, so an `await` in the middle of the JSX is a syntax error rather
     than a slow render. */
  const sections = await Promise.all(
    (source ?? '')
      .split(/\n(?=## )/)
      .map((one) => one.trim())
      /* Only the sections. The split also yields whatever precedes the first
         heading, which for these documents is the frontmatter block, and that
         came through as an empty third panel sitting beside the two real ones. */
      .filter((one) => one.startsWith('## '))
      .map(async (one) => ({ body: await renderDocument(one), key: one.slice(0, 40) })),
  )
  return (
    /* **One field behind the whole page, not one inside the head.**
     *
     * The panels below are `[data-material="glass"]`, and glass admits what is
     * behind it. With the light confined to the hero there was nothing under
     * them but the page's own black, so every panel was paying for a
     * `backdrop-filter` that blurred a flat color: the effect was in the
     * computed styles and invisible on the screen, which is the same finding
     * the closing card on the landing page records about a blur with an opaque
     * ground in front of it.
     *
     * Absolute against this box rather than fixed against the window, for the
     * reason `.reelAura` gives: fixed pins the light to the viewport and the
     * content slides over a field that never moves, which is a wallpaper rather
     * than a page.
     *
     * **No `z-index` on the layer, and one would be wrong.** This box is
     * positioned and so are the sections in it, and positioned boxes with no
     * layer of their own paint in tree order, so the markup already says the
     * order. A negative layer would escape to the nearest ancestor that forms a
     * stacking context and paint behind *its* background, which is opaque, and
     * the field would disappear. */
    /* **Inside `ThemeScope`, which is the ancestor the landing page has and this
       one did not.** That wrapper paints an opaque `--helix-color-background`
       and declares the scope's `color-scheme`, so everything under it resolves
       its `light-dark()` against a stated scheme and composites against a stated
       ground. Without it the panels' glass and the field behind them were being
       resolved and composited against whatever the document happened to be, and
       the two pages did not match however closely their own declarations did. */
    <ThemeScope>
      <div className={styles.servicesField}>
        <helix-aura
          class={styles.servicesAura}
          data-layer
          gain={1.05}
          scale={3}
          speed={0.5}
          terminus={0.5625}
          variant="flow"
        ></helix-aura>

        {/* The head on the same lit field the galleries use. The page opened on
          flat black with the title floating in it and a screen of nothing
          between the standfirst and the first offer: the space was there
          because the section had padding, not because anything filled it. */}
        <PageHero className={styles.servicesHero} shell="plain">
          <helix-flex class={styles.servicesHeroInner} data-shell direction="column" gap="lg">
            <helix-text tone="subtle" variant="label">
              {page?.kicker}
            </helix-text>
            <helix-text as="h1" data-measure data-section-title>
              {page?.title}
            </helix-text>
            {/* The subheading, and it says what the work is rather than what
                the rest of the site is not. It read "everything else on this
                site is being built", which asks a buyer to hold the company's
                build status in their head before they have been told what is on
                offer, and answers a question nobody arriving here has. */}
            <helix-text as="p" class={styles.servicesHeroLede} data-measure>
              Interface and intelligence work, shipped into your repository.
            </helix-text>
          </helix-flex>
        </PageHero>

        {/* **The three offers as one panel, not three cards.**
          Three cards on glass are three edges, and a reader counts the boxes
          before they read the names. One panel with rules between the offers
          says the same thing the landing bands say: these are three parts of one
          answer rather than three unrelated claims that happen to be adjacent.
          It is also what lets them be compared, which is what a page with prices
          on it is for: the rules line the prices up on one grid instead of
          leaving three cards to agree by luck. */}
        <Band reveal>
          {/* **A head on the card, which is what makes it the same object as
                the landing's.** That one opens with a label, a heading and a
                standfirst over its ruled row; this opened straight onto three
                columns, so the same material and the same rules still read as a
                table rather than as a panel making a point.

                The standfirst is the page's own, moved down from the band above
                rather than written for here: a hero carrying a kicker, a display
                title and a four-line paragraph was asking a reader to take all
                three before anything was shown, and the paragraph is what the
                offers under it are the answer to. Nothing new is said. */}
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <helix-text tone="subtle" variant="label">
              What we take on
            </helix-text>
            <helix-text as="h2" data-section-title>
              Three offers, in the order they usually happen
            </helix-text>
            <helix-text as="p" data-measure tone="muted">
              {page?.lede}
            </helix-text>
          </helix-flex>

          <div className={styles.offerRow}>
            {SERVICES.map((service) => (
              <div className={styles.offer} key={service.name}>
                {/* **The name, and no summary under it.**

                      Three summaries were the densest block of prose on the
                      page, and every one of them was answered more usefully by
                      the four bullets a few lines below it: the summary said
                      what the engagement is like and the bullets say what
                      arrives. A reader comparing three offers is reading the
                      bullets.

                      **No icon either.** Three line glyphs carried nothing the
                      names did not: a magnifier over "AI capability audit", a
                      cube over "Design system sprint", a pair of figures over
                      "Conversational build". A metaphor a reader decodes before
                      the words beside it is a cost with no return. */}
                <helix-text as="h3" variant="title">
                  {service.name}
                </helix-text>

                {/* **How long, in the unit the buyer thinks in.**
                      It reads as the third of four labeled facts rather than as
                      a footnote to a figure, which is what it was while it sat
                      under a price in caption type. What somebody is committing
                      to is a fortnight or two months of their team's attention,
                      and on a page with no number on it that is the commitment
                      being described. */}
                <helix-flex direction="column" gap="2xs">
                  <helix-text tone="subtle" variant="label">
                    How long it runs
                  </helix-text>
                  <helix-text as="p">{service.duration}</helix-text>
                </helix-flex>

                <helix-flex direction="column" gap="sm">
                  <helix-text tone="subtle" variant="label">
                    What is in it
                  </helix-text>
                  {/* `unordered`, because these are a set and the order does
                        not carry information. `label` because the host takes
                        `role="list"` and a list announced with no name in a row
                        of three tells a reader nothing about which one it is. */}
                  <helix-list kind="unordered" label={`What ${service.name} includes`}>
                    {service.includes.map((item) => (
                      <helix-list-item key={item}>{item}</helix-list-item>
                    ))}
                  </helix-list>
                </helix-flex>

                {/* What you keep, last, because it is the one line here that
                      is still true after the engagement ends and so is what a
                      reader should leave with. The shared row is what lands the
                      three labels on one line. */}
                <helix-flex direction="column" gap="2xs">
                  <helix-text tone="subtle" variant="label">
                    What you keep
                  </helix-text>
                  <helix-text as="p" tone="muted" variant="caption">
                    {service.outcome}
                  </helix-text>
                </helix-flex>
              </div>
            ))}
          </div>
        </Band>

        {/* **The closing prose as two panels in a row, one per argument.**

          The document has exactly two sections and they do different jobs: one
          says what you are not signing up for, the other says how to start. On
          one panel they read as a single wall of text with a rule through it,
          and the second, which is the one with the way in, arrives after the
          reader has already decided whether to keep going.

          Split at the source rather than at the render: `renderDocument` takes a
          string, so the two halves are two strings and each panel holds a whole
          document. Splitting the rendered tree would mean reaching into React
          output to find a heading, which is the kind of thing that works until
          somebody adds a third section. */}
        <Band card={false} reveal>
          <div className={styles.closingRow}>
            {sections.map((section, index) => (
              <div className={band.bandCard} data-material="glass" data-substrate key={section.key}>
                <helix-flex class={band.bandSection} direction="column" gap="lg">
                  <div className={documents.documentBody} data-prose>
                    {section.body}
                  </div>
                  {/* The way in belongs with the half that describes it, which is
                      the second. On the first it would be an answer to a question
                      that panel has not asked yet. */}
                  {index === sections.length - 1 && (
                    <helix-flex data-density="lg" gap="sm" wrap>
                      <a data-button href="/company/trust">
                        The trust bar
                      </a>
                      <a data-button="solid" data-button-tone="primary" href={MAILTO}>
                        {EMAIL}
                      </a>
                    </helix-flex>
                  )}
                </helix-flex>
              </div>
            ))}
          </div>
        </Band>
      </div>
    </ThemeScope>
  )
}
