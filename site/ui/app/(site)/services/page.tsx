import { SERVICES } from '../../services'
import { SERVICES_COPY } from '../../services-copy'
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
export default function Page() {
  return (
    <>
      <section data-band>
        <helix-flex data-shell direction="column" gap="lg">
          <helix-text tone="subtle" variant="label">
            Services
          </helix-text>
          <helix-text as="h1" data-measure data-section-title>
            {SERVICES_COPY.title}
          </helix-text>
          <helix-text as="p" data-measure tone="muted">
            Everything else on this site is being built. This is the work we take on now: interface
            and intelligence work the substrates make faster to do well. Three offers, in the order
            they usually happen. Most start with the audit, which is two weeks at a fixed price, and
            the rest is scoped from what it finds.
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

      {/* How an engagement runs, where the constraint used to be stated.
          
          It was the Sovereignty Constraint quoted at a buyer mid-page, which
          asks them to care about a governance rule at the moment they are
          working out what they are committing to. The same commitment said as
          terms is the thing they actually wanted to know. The rule itself is on
          `/trust`, one link away. */}
      <section data-band data-reveal>
        <helix-flex data-shell direction="column" gap="lg">
          <helix-text tone="subtle" variant="label">
            How it runs
          </helix-text>
          <helix-text as="h2" data-measure data-section-title>
            {SERVICES_COPY.blocks[1]?.title}
          </helix-text>
          <helix-text as="p" data-measure tone="muted">
            Your repository, your license, your infrastructure. Handover is a condition of the work
            rather than a phase at the end of it, and the architecture decisions are written down
            with their trade-offs rather than just made. If an engagement would leave you unable to
            continue without us on a retainer, it is not one we will take.
          </helix-text>
          <helix-flex data-density="lg">
            <a data-button href="/trust">
              The trust bar
            </a>
          </helix-flex>
        </helix-flex>
      </section>

      <section data-band data-closing data-reveal>
        <helix-flex align="center" data-shell direction="column" gap="lg">
          <helix-text as="h2" data-section-title>
            {SERVICES_COPY.blocks[2]?.title}
          </helix-text>
          <helix-text as="p" data-measure tone="muted">
            Two weeks and a fixed price, and the honest answer at the end of it may be that you do
            not need the larger engagement. Say plainly what you are trying to do and we will tell
            you whether we are the right people.
          </helix-text>
          <a
            data-button="solid"
            data-button-tone="primary"
            data-button-width="standard"
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
