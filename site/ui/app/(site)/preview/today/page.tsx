/**
 * What we do, why us, what it costs, and where it goes.
 *
 * **The page used to argue before it offered.** The hero sold a principle, and
 * three of six bands were the mechanism, the ladder and the exit test: a reader
 * looking for a design system met four screens of thesis before they met a
 * reason to hire anyone. Those bands are `/thesis` and `/trust` now, and what
 * is left is the case.
 *
 * The constraint has not gone anywhere, it has changed job. As a headline it
 * asked a buyer to care about a governance rule; as a line in `Why us` it is
 * what it always was to them, which is that they are not acquiring a
 * dependency. The philosophy is the last band and it is a link.
 */
import { SERVICES } from '../../../services'
import { stageAppearance } from '../../../verticals'
import '../../../preview.css'
import '../../../today.css'

export const metadata = { title: 'Candidate: today' }

/** The reasons to choose this over an agency that starts from a blank file. */
const WHY = [
  {
    body: 'A token layer, two tiers, generated framework wrappers, a sandbox and the checks that keep it honest. We are not learning this on your project.',
    name: 'The system already exists',
  },
  {
    body: 'Four weeks, two days a week, because the hard part is behind us. An agency starting from nothing quotes three months for the same deliverable.',
    name: 'It is faster because of that',
  },
  {
    body: 'Your repository, your license. Handover is a condition of the work, not a phase at the end, and no engagement should leave you needing us on a retainer.',
    name: 'You keep all of it',
  },
  {
    body: 'Active ships with users, Building is real work with nothing shipped, Declared is a direction. Nothing here is described as further along than it is.',
    name: 'We tell you what is not done',
  },
]

/** What exists today, and what does not. */
const STACK = [
  {
    action: { href: '/helix', label: 'Open Helix' },
    body: 'Every component with its API, a live example, and a sandbox to try it in. One open tier.',
    lede: 'Use it',
    name: 'Helix',
    stage: 'Building' as const,
  },
  {
    action: { href: '/services', label: 'See the offers' },
    body: `An audit at ${SERVICES[0]?.price} to find what is worth building, then a sprint or a build.`,
    lede: 'Buy it',
    name: 'The work',
    stage: 'Active' as const,
  },
  {
    action: { href: '/cortex', label: 'Read the shape' },
    body: 'What a system knows, where it learned it, and how far to trust it. Written down. Not shipped.',
    lede: 'Not yet',
    name: 'Cortex',
    stage: 'Building' as const,
  },
]

export default function Page() {
  return (
    <>
      <section className="specHero">
        <helix-flex data-shell direction="column" gap="xl">
          <helix-text appearance="label" class="specHeroLabel">
            Fusion Development Group
          </helix-text>

          {/* The title names the thing and argues nothing, which is the shape
              `/helix` already uses and the one that works: a claim in a headline
              has to be accepted before anything else is read, and a name only
              has to be understood. Six attempts at a clever line all leaned on
              owning the tools or on process, and both are about us rather than
              about what a reader gets. The lede does the arguing. */}
          <helix-text as="h1" class="specHeroTitle">
            Interface and intelligence engineering
          </helix-text>

          <helix-text as="p" class="specLede">
            We build the software, and we built the tools underneath it. Most engagements start with
            a two week audit of what is worth building, and every price is stated before you ask.
          </helix-text>

          <div className="specDoors">
            <a className="specDoor" href="/services">
              <helix-text class="specDoorFor">If you need the work done</helix-text>
              <helix-text appearance="title">Start with an audit</helix-text>
              <helix-text appearance="caption" tone="muted">
                Two weeks, $12,000 to $18,000, and the honest answer may be that you do not need the
                rest. Every price is stated.
              </helix-text>
            </a>
            <a className="specDoor" href="/helix">
              <helix-text class="specDoorFor">If you build interfaces</helix-text>
              <helix-text appearance="title">Open Helix</helix-text>
              <helix-text appearance="caption" tone="muted">
                Components, tokens and a sandbox. Your framework stays your choice.
              </helix-text>
            </a>
          </div>
        </helix-flex>
      </section>

      <section data-shell>
        <div className="spec">
          <helix-text class="specLabel">Why us</helix-text>
          <helix-flex direction="column" gap="xl">
            <helix-text as="h2" class="specTitle">
              You are hiring the people who built the tools
            </helix-text>
            <helix-grid gap="2xl" min="18rem">
              {WHY.map((item) => (
                <helix-flex direction="column" gap="sm" key={item.name}>
                  <helix-text appearance="title" as="h3">
                    {item.name}
                  </helix-text>
                  <helix-text as="p" tone="muted">
                    {item.body}
                  </helix-text>
                </helix-flex>
              ))}
            </helix-grid>
          </helix-flex>
        </div>
      </section>

      <section data-shell>
        <div className="spec">
          <helix-text class="specLabel">The state of it</helix-text>
          <helix-flex direction="column" gap="xl">
            <helix-text as="h2" class="specTitle">
              What is real, and what is not
            </helix-text>
            <helix-flex direction="column" gap="none">
              {STACK.map((row) => (
                <helix-flex align="start" class="tdRow" gap="xl" key={row.name} wrap>
                  <helix-flex align="start" class="tdLede" direction="column" gap="2xs">
                    <helix-text appearance="label" tone="subtle">
                      {row.lede}
                    </helix-text>
                    <helix-tag tone={stageAppearance(row.stage)}>{row.stage}</helix-tag>
                  </helix-flex>
                  <helix-flex class="tdBody" direction="column" gap="sm">
                    <helix-text as="h3" class="tdName">
                      {row.name}
                    </helix-text>
                    <helix-text as="p" tone="muted">
                      {row.body}
                    </helix-text>
                    <a data-link href={row.action.href}>
                      {row.action.label}
                    </a>
                  </helix-flex>
                </helix-flex>
              ))}
            </helix-flex>
          </helix-flex>
        </div>
      </section>

      {/* The story, last and short. It is the reason the work compounds rather
          than the reason to buy it, and a reader who wants it can follow it. */}
      <section data-shell>
        <div className="spec">
          <helix-text class="specLabel">Where this goes</helix-text>
          <helix-flex direction="column" gap="xl">
            <helix-text as="h2" class="specTitle">
              Software now. The rest of the stack after.
            </helix-text>
            <helix-flex data-measure direction="column" gap="md">
              <helix-text as="p" tone="muted">
                Helix is the interface layer and Cortex is memory and provenance. Each engagement
                that feeds one of them makes the next one faster, which is why we take the work we
                take. Energy and hardware are further out and we say so.
              </helix-text>
              <helix-text as="p" tone="muted">
                Behind all of it is one rule: nothing we build should create a dependency you cannot
                leave. It is a commitment about architecture rather than a slogan, and it is written
                down where you can check it.
              </helix-text>
            </helix-flex>
            <helix-flex data-density="sm" gap="lg" wrap>
              <a data-link href="/thesis">
                Read the thesis
              </a>
              <a data-link href="/trust">
                What has to be true before anything ships
              </a>
            </helix-flex>
          </helix-flex>
        </div>
      </section>

      <section data-band data-closing>
        <helix-flex align="center" data-shell direction="column" gap="lg">
          <helix-text as="h2" class="tdAsk">
            Start with the audit.
          </helix-text>
          <helix-text as="p" data-measure tone="muted">
            Two weeks, fixed price, and the honest answer may be that you do not need the rest.
          </helix-text>
          <helix-flex data-density="lg" gap="sm" wrap>
            <a
              data-button="solid"
              data-button-fill="standard"
              data-button-tone="primary"
              href="/services"
            >
              See what it costs
            </a>
            <a data-button data-button-fill="standard" href="mailto:hello@fusion.dev">
              hello@fusion.dev
            </a>
          </helix-flex>
        </helix-flex>
      </section>
    </>
  )
}
