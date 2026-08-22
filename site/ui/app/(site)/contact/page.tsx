export const metadata = {
  description:
    'How to reach Fusion Development Group, what to put in the first message, and what happens after you send it.',
  title: 'Contact',
}

/**
 * What a first message should carry, and why each one is asked for.
 *
 * Four, and none of them is a form field. A form would collect these into a
 * shape we prefer and a reader cannot see, which is the wrong trade for a first
 * message: what is actually wanted is the shape of the problem, and a paragraph
 * says that better than four inputs. Written down so nobody has to guess what
 * makes a reply useful rather than a request for more information.
 */
const INCLUDE = [
  {
    body: 'What it does, who uses it, and what is in front of them today. A repository or a staging link says this faster than a description of it.',
    name: 'The thing you are building',
  },
  {
    body: 'The interface, the intelligence layer, or both. If you do not know which, say what is going wrong and we will tell you which it is.',
    name: 'Which part you need',
  },
  {
    body: 'A date it has to work by, or the absence of one. Both are answers, and the second is more common than anybody admits in a first email.',
    name: 'When it matters',
  },
  {
    body: 'A range is enough. It decides whether an audit, an engagement or neither is the honest answer, and saying it early saves the two weeks it takes to find out.',
    name: 'What you can spend',
  },
]

/**
 * The reply, described before it arrives.
 *
 * **A page rather than a form, and this list is why.** `mailto:` already sends
 * a message; what a mailbox cannot do is say what happens next, which is the
 * part a reader is actually uncertain about. A form would add a dependency, a
 * spam surface and a backend to solve a problem the address already solves, and
 * would still not answer the question this list answers.
 */
const NEXT = [
  {
    body: 'From a person who read it, not an autoresponder. If it will be longer than that, the reply says so and gives a date.',
    name: 'Two working days',
  },
  {
    body: 'We say no when the work is outside what we do well, and we say who to ask instead when we know. A slow no is worse than a fast one.',
    name: 'A plain yes or no',
  },
  {
    body: 'Two weeks, priced in full before it starts, ending in a written finding you keep whether or not anything follows it.',
    name: 'If yes, an audit first',
  },
]

export default function Page() {
  return (
    <>
      <section className="band">
        <helix-flex class="shell" direction="column" gap="lg">
          <helix-text appearance="label" tone="subtle">
            Contact
          </helix-text>
          <helix-text as="h1" class="sectionTitle measure">
            Tell us what you need built
          </helix-text>
          <helix-text as="p" class="measure" tone="muted">
            One address, read by the people who would do the work. What follows is what to put in
            the first message and what happens after you send it, so neither is a thing you have to
            guess at.
          </helix-text>
          <helix-flex align="center" data-density="lg" gap="md" wrap>
            <a
              data-button="solid"
              data-button-fill="standard"
              data-button-tone="primary"
              href="mailto:hello@fusion.dev"
            >
              hello@fusion.dev
            </a>
            {/* The address in text as well as in the button, because a reader
                on a machine with no mail client configured gets nothing from a
                `mailto:` and has nothing to copy. */}
            <helix-text appearance="caption" tone="subtle">
              Or copy it: hello@fusion.dev
            </helix-text>
          </helix-flex>
        </helix-flex>
      </section>

      <section className="band reveal">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-text as="h2" class="sectionTitle measure">
            What to include
          </helix-text>
          <helix-grid gap="xl" min="18rem">
            {INCLUDE.map((item) => (
              <helix-flex class="substrate" direction="column" gap="sm" key={item.name}>
                <helix-text as="h3" class="substrateName">
                  {item.name}
                </helix-text>
                <helix-text as="p" tone="muted">
                  {item.body}
                </helix-text>
              </helix-flex>
            ))}
          </helix-grid>
        </helix-flex>
      </section>

      <section className="band reveal">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-text as="h2" class="sectionTitle measure">
            What happens next
          </helix-text>
          <helix-flex direction="column">
            {NEXT.map((item, index) => (
              <helix-flex align="start" class="verticalRow" gap="lg" key={item.name} wrap>
                <helix-text appearance="label" tone="subtle">
                  {String(index + 1).padStart(2, '0')}
                </helix-text>
                <helix-flex direction="column" gap="sm">
                  <helix-text as="h3" class="substrateName">
                    {item.name}
                  </helix-text>
                  <helix-text as="p" class="measure" tone="muted">
                    {item.body}
                  </helix-text>
                </helix-flex>
              </helix-flex>
            ))}
          </helix-flex>
        </helix-flex>
      </section>
    </>
  )
}
