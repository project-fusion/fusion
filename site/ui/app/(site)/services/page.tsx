import { findSitePage, sitePageSources } from '@fusion-io/insights'
import { SERVICES } from '@/content/services/services'
import { pageMetadata } from '@/utils/metadata/metadata'
import { EMAIL, MAILTO } from '@/utils/site/site'
import { renderMdx } from '../../../utils/mdx/mdx'
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
 * The constraint is stated here as terms rather than as a principle. Quoted at
 * a buyer mid-page it asked them to care about a governance rule at the moment
 * they were working out what they were committing to; said as what they keep
 * and what they are not signing up for, it is the thing they wanted to know.
 * The rule itself lives on `/trust`.
 *
 * Copy lives in `services.ts`, derived from `the internal plan` and
 * `the internal plan`, so the site and the plan cannot drift on what is
 * actually sold. `the internal plan` is the reconciliation where the
 * two disagree, and is also why the figure sits under the summary rather than
 * beside the name.
 *
 * A server component with no client boundary of its own. Elements upgrade from
 * the single registration in the root layout.
 */
const page = findSitePage('/services')

export default async function Page() {
  const source = page ? sitePageSources[page.slug] : undefined
  return (
    <>
      <section data-band>
        <helix-flex data-shell direction="column" gap="lg">
          <helix-text tone="subtle" variant="label">
            {page?.kicker}
          </helix-text>
          <helix-text as="h1" data-measure data-section-title>
            {page?.title}
          </helix-text>
          <helix-text as="p" data-measure tone="muted">
            {page?.lede}
          </helix-text>
        </helix-flex>
      </section>

      <section data-band data-reveal>
        {/* **The three offers side by side, not stacked.**
            Stacked, each card ran the width of the shell over content that did
            not: measured at 1440, an 1136px card holding a 611px summary and
            four short bullets, so half of every card was empty whichever way its
            interior was arranged. Two columns inside the card put a one-sentence
            takeaway against four bullets and a price, 60px of content against
            500. One column left the whole right half blank.

            The card was never the wrong shape; it was the wrong width. Three
            tracks give each one about 390px, which is what this content wants,
            and it is what the page is for: this docstring says an offer whose
            cost appears only after a conversation cannot be compared, and
            comparison wants them adjacent rather than a scroll apart. The floor
            drops them to two and then one where there is no room, and the grid
            equalises their heights so the prices line up. */}
        <helix-grid data-shell gap="xl" min="22rem">
          {SERVICES.map((service) => (
            <helix-card class="serviceCard" key={service.name} separation="outlined">
              {/* **No icon.** Three line glyphs carried nothing the names did
                  not: a magnifier over "AI capability audit", a cube over "Design
                  system sprint", a pair of figures over "Conversational build".
                  A metaphor a reader decodes before the words beside it is a cost
                  with no return, and the landing band dropped them first. The
                  wrapping flex went with it, having existed only to sit a glyph
                  beside a heading. */}
              <helix-flex align="center" gap="md" justify="between" slot="header" wrap>
                <helix-text as="h2" variant="title">
                  {service.name}
                </helix-text>
              </helix-flex>

              {/* **One column, and what you keep is the card's bottom line.**
                  This was two columns beside each other, and it did not work in
                  either arrangement it was tried in. `What you keep` is one
                  sentence and `What is in it` is four bullets under a summary
                  and a price, so a column apiece is 500px of content against 60,
                  and the right side of every card is a void whichever end the
                  sentence is pinned to. Measured on the audit card: 1136px wide,
                  a 611px summary, and 210px of nothing beside it.

                  A footer is the honest shape. It spans the card, so nothing is
                  empty, and it puts the takeaway where a reader arrives at it
                  last, which is where the thing they are deciding on belongs:
                  the bullets say what the work is and this says what they are
                  left holding. It is also the one line here that is true after
                  the engagement ends. */}
              <helix-flex direction="column" gap="lg">
                <helix-text as="p" data-measure tone="muted">
                  {service.summary}
                </helix-text>

                {/* The number comes after the sentence that says what this is,
                    and it used to come before it.
                    
                    `the internal plan` is precise about the cost: a
                    reader anchored on a component library in a design tool is
                    comparing the sprint against a different kind of purchase and
                    will not reach the second sentence. What is being sold is
                    shipped software in their repository, and the price only
                    reads correctly once that has landed. So the summary is
                    first and the figure is under it, still in full and still
                    the largest thing in this row. */}
                <helix-flex align="baseline" gap="sm" wrap>
                  <helix-text variant="title">{service.price}</helix-text>
                  <helix-text tone="subtle" variant="caption">
                    {service.duration}
                  </helix-text>
                </helix-flex>

                <helix-flex direction="column" gap="sm">
                  <helix-text tone="subtle" variant="label">
                    What is in it
                  </helix-text>
                  {/* `unordered`, because these are a set and the order
                        does not carry information: a bare `helix-list` is the
                        `default` kind, which is a run of rows with no marker
                        and is what a list of files or settings wants. `label`
                        because the host takes `role="list"` and a list
                        announced with no name in a page of three identical
                        cards tells a reader nothing about which one it is. */}
                  <helix-list kind="unordered" label={`What ${service.name} includes`}>
                    {service.includes.map((item) => (
                      <helix-list-item key={item}>{item}</helix-list-item>
                    ))}
                  </helix-list>
                </helix-flex>
              </helix-flex>

              <helix-flex class={styles.serviceKeep} direction="column" gap="sm" slot="footer">
                <helix-text tone="subtle" variant="label">
                  What you keep
                </helix-text>
                <helix-text as="p" data-measure tone="muted">
                  {service.outcome}
                </helix-text>
              </helix-flex>
            </helix-card>
          ))}
        </helix-grid>
      </section>

      {/* The prose, from `@fusion-io/insights`.
          
          Two sections that used to be JSX with their sentences inside it. The
          buttons stay here: a call to action is chrome around a document rather
          than a paragraph in one, and neither belongs in a `.md`. */}
      <section data-band data-reveal>
        <helix-flex data-shell direction="column" gap="lg">
          {/* The document shell's block rhythm, not just its theming.
              `[data-prose]` resets the UA margins and themes what is inside it,
              and deliberately says nothing about how far apart the blocks sit,
              because that is a fact about the kind of page rather than about
              prose. Without it a heading sat directly on its own paragraph
              while whole bands of space separated the sections around it, which
              is the rhythm inverted: too much between, none within. */}
          <div className={documents.documentBody} data-measure data-prose>
            {source ? await renderMdx(source) : null}
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
      </section>
    </>
  )
}
