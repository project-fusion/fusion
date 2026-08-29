import { findSitePage, sitePageSources } from '@fusion.dev/insights'
import { HeroField } from '@/components/hero-field/hero-field'
import { SERVICES } from '@/content/services/services'
import { pageMetadata } from '@/utils/metadata/metadata'
import { EMAIL, MAILTO } from '@/utils/site/site'
import { renderDocument } from '../../../utils/mdx/mdx'
import browser from '../browser.module.css'
import documents from '../document-page.module.css'
import styles from './services.module.css'

export const metadata = pageMetadata({
  description:
    'Three offers: an AI capability audit, a design system sprint, and conversational build. Prices stated.',
  path: '/services',
  title: 'Services',
})

/**
 * Services.
 *
 * **The only page on the site with a price on it**, which is why it is written
 * plainly and why every number is stated rather than gated behind a call. An
 * offer whose cost appears only after a conversation cannot be compared.
 *
 * The constraint appears here as terms rather than as a principle. Quoted at a
 * buyer mid-page it asks them to care about a governance rule while they are
 * working out what they are committing to; said as what they keep and what they
 * are not signing up for, it is the thing they wanted to know. The rule itself
 * lives on `/trust`.
 *
 * Copy lives in `services.ts` rather than here, so this page and the offer
 * cannot drift on what is actually sold or for how much. That file is also
 * where the figure's placement is argued, which is why it sits under the
 * summary rather than beside the name.
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
const page = findSitePage('/services')

export default async function Page() {
  const source = page ? sitePageSources[page.slug] : undefined
  return (
    <>
      {/* The head on the same lit field the galleries use. The page opened on
          flat black with the title floating in it and a screen of nothing
          between the standfirst and the first offer: the space was there
          because the section had padding, not because anything filled it. */}
      <section className={`${browser.pageHero} ${styles.servicesHero}`}>
        <helix-aura
          class={styles.servicesAura}
          gain={1.15}
          scale={0.45}
          speed={0.5}
          variant="rays"
        ></helix-aura>
        <HeroField />
        <helix-flex class={styles.servicesHeroInner} data-shell direction="column" gap="lg">
          <helix-text tone="subtle" variant="label">
            {page?.kicker}
          </helix-text>
          <helix-text as="h1" data-measure data-section-title>
            {page?.title}
          </helix-text>
          <helix-text as="p" data-measure>
            {page?.lede}
          </helix-text>
        </helix-flex>
      </section>

      {/* **The three offers as one panel, not three cards.**
          Three cards on glass are three edges, and a reader counts the boxes
          before they read the names. One panel with rules between the offers
          says the same thing the landing bands say: these are three parts of one
          answer rather than three unrelated claims that happen to be adjacent.
          It is also what lets them be compared, which is what a page with prices
          on it is for: the rules line the prices up on one grid instead of
          leaving three cards to agree by luck. */}
      <section className={styles.fieldBand} data-band data-reveal>
        <helix-flex data-shell direction="column">
          <div className={styles.bandCard} data-material="glass" data-substrate>
            <div className={styles.offerRow}>
              {SERVICES.map((service) => (
                <div className={styles.offer} key={service.name}>
                  <helix-flex direction="column" gap="sm">
                    {/* **No icon.** Three line glyphs carried nothing the names
                        did not: a magnifier over "AI capability audit", a cube
                        over "Design system sprint", a pair of figures over
                        "Conversational build". A metaphor a reader decodes
                        before the words beside it is a cost with no return. */}
                    <helix-text as="h2" variant="title">
                      {service.name}
                    </helix-text>
                    <helix-text as="p" tone="muted">
                      {service.summary}
                    </helix-text>
                  </helix-flex>

                  {/* The number comes after the sentence that says what this is.
                      Above it, a reader anchored on a component library in a
                      design tool compares the sprint against a different kind of purchase and does not reach the second sentence. What is
                      being sold is shipped software in their repository, and the
                      price only reads correctly once that has landed. */}
                  <helix-flex class={styles.offerPrice} direction="column" gap="2xs">
                    <helix-text variant="title">{service.price}</helix-text>
                    <helix-text tone="subtle" variant="caption">
                      {service.duration}
                    </helix-text>
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
                  <helix-flex class={styles.offerKeep} direction="column" gap="2xs">
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
          </div>
        </helix-flex>
      </section>

      {/* The prose, from `@fusion.dev/insights`, on its own panel. The buttons
          stay here: a call to action is chrome around a document rather than a
          paragraph in one, and neither belongs in a `.md`. */}
      <section className={styles.fieldBand} data-band data-reveal>
        <helix-flex data-shell direction="column">
          <div className={styles.bandCard} data-material="glass" data-substrate>
            <helix-flex class={styles.bandSection} direction="column" gap="lg">
              {/* The document shell's block rhythm, not just its theming.
                  `[data-prose]` resets the UA margins and themes what is inside
                  it, and deliberately says nothing about how far apart the
                  blocks sit, because that is a fact about the kind of page
                  rather than about prose. */}
              <div className={documents.documentBody} data-measure data-prose>
                {source ? await renderDocument(source) : null}
              </div>
              <helix-flex data-density="lg" gap="sm" wrap>
                <a data-button href="/trust">
                  The trust bar
                </a>
                <a data-button="solid" data-button-tone="primary" href={MAILTO}>
                  {EMAIL}
                </a>
              </helix-flex>
            </helix-flex>
          </div>
        </helix-flex>
      </section>
    </>
  )
}
