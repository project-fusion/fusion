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
 * Copy lives in `services.ts` and is derived from `the internal plan`, so
 * the site and the plan cannot drift on what is actually sold.
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
            they usually happen, with what they cost.
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
                {/* The number, at the top, in the same row as the name. Put at
                    the bottom it reads as a footnote to the description, which
                    is exactly the shape that makes a reader hunt for it. */}
                <helix-flex align="center" data-density="sm" gap="sm" wrap>
                  <helix-tag>{service.duration}</helix-tag>
                  <helix-text appearance="body-strong">{service.price}</helix-text>
                </helix-flex>
              </helix-flex>

              <helix-flex direction="column" gap="lg">
                <helix-text as="p" class="measure" tone="muted">
                  {service.summary}
                </helix-text>

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
