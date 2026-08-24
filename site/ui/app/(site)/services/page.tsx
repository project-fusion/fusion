import { findSitePage, sitePageSources } from '@fusion-io/site-content'
import { renderMdx } from '../../../lib/mdx'
import { SERVICES } from '../../services'
import documents from '../document-page.module.css'
import styles from './services.module.css'

export const metadata = {
  description:
    'Three offers: an AI capability audit, a design system sprint, and conversational build. Prices stated.',
  title: 'Services',
}

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
        <helix-flex data-shell direction="column" gap="xl">
          {SERVICES.map((service) => (
            <helix-card class="serviceCard" key={service.name} separation="outlined">
              <helix-flex align="center" gap="md" justify="between" slot="header" wrap>
                <helix-flex align="center" gap="sm">
                  <helix-icon name={service.icon}></helix-icon>
                  <helix-text as="h2" variant="title">
                    {service.name}
                  </helix-text>
                </helix-flex>
              </helix-flex>

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

                <helix-flex class={styles.serviceBody} gap="2xl" wrap>
                  <helix-flex class={styles.serviceColumn} direction="column" gap="sm">
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

                  <helix-flex class={styles.serviceColumn} direction="column" gap="sm">
                    <helix-text tone="subtle" variant="label">
                      What you keep
                    </helix-text>
                    <helix-text as="p" tone="muted">
                      {service.outcome}
                    </helix-text>
                  </helix-flex>
                </helix-flex>
              </helix-flex>
            </helix-card>
          ))}
        </helix-flex>
      </section>

      {/* The prose, from `@fusion-io/site-content`.
          
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
            <a data-button="solid" data-button-tone="primary" href="mailto:hello@fusion.dev">
              hello@fusion.dev
            </a>
          </helix-flex>
        </helix-flex>
      </section>
    </>
  )
}
