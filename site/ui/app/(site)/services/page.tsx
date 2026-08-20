import { SERVICES } from '../../services'

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
 * offer whose cost appears only after a conversation cannot be compared, and a
 * company whose constraint forbids lock-in has a hard time explaining why its
 * pricing is the one thing a reader may not leave with.
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
      <section className="band">
        <helix-flex class="shell" direction="column" gap="lg">
          <helix-text appearance="label" tone="subtle">
            Services
          </helix-text>
          <helix-text as="h1" class="sectionTitle measure">
            The part of this you can buy today
          </helix-text>
          <helix-text as="p" class="measure" tone="muted">
            Everything else on this site is being built. This is the work we take on now: interface
            and intelligence work the substrates make faster to do well. Three offers, in the order
            they usually happen. Most start with the audit, which is two weeks at a fixed price, and
            the rest is scoped from what it finds.
          </helix-text>
        </helix-flex>
      </section>

      <section className="band reveal">
        <helix-flex class="shell" direction="column" gap="xl">
          {SERVICES.map((service) => (
            <helix-card appearance="outlined" class="serviceCard" key={service.name}>
              <helix-flex align="center" gap="md" justify="between" slot="header" wrap>
                <helix-flex align="center" gap="sm">
                  <helix-icon name={service.icon}></helix-icon>
                  <helix-text appearance="title" as="h2">
                    {service.name}
                  </helix-text>
                </helix-flex>
              </helix-flex>

              <helix-flex direction="column" gap="lg">
                <helix-text as="p" class="measure" tone="muted">
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
                  <helix-text appearance="title">{service.price}</helix-text>
                  <helix-text appearance="caption" tone="subtle">
                    {service.duration}
                  </helix-text>
                </helix-flex>

                <helix-flex class="serviceBody" gap="2xl" wrap>
                  <helix-flex class="serviceColumn" direction="column" gap="sm">
                    <helix-text appearance="label" tone="subtle">
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

                  <helix-flex class="serviceColumn" direction="column" gap="sm">
                    <helix-text appearance="label" tone="subtle">
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

      {/* The exit test, applied to the services rather than to a product.
          It is the same constraint and it is easy to assume it only governs
          software, so it is said here where the money is. */}
      <section className="band reveal">
        <helix-flex class="shell statement" direction="column" gap="lg">
          <helix-text appearance="label" tone="subtle">
            The Sovereignty Constraint, applied here
          </helix-text>
          <helix-text as="p" class="statementText">
            Everything we build for you is yours, and runs without us.
          </helix-text>
          <helix-text as="p" class="measure" tone="muted">
            Your repository, your license, your infrastructure. Handover is a condition of the work
            rather than a phase at the end of it. If an engagement would leave you unable to
            continue without us on retainer, it is not one we will take.
          </helix-text>
        </helix-flex>
      </section>

      <section className="band closing reveal">
        <helix-flex align="center" class="shell" direction="column" gap="lg">
          <helix-text as="h2" class="sectionTitle">
            Start with the audit
          </helix-text>
          <helix-text as="p" class="measure" tone="muted">
            Two weeks and a fixed price, and the honest answer at the end of it may be that you do
            not need the larger engagement. Say plainly what you are trying to do and we will tell
            you whether we are the right people.
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
