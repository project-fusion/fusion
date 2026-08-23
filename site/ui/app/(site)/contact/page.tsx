import { CONTACT, INCLUDE, NEXT } from '../../contact'

export const metadata = {
  description:
    'How to reach Fusion Development Group, what to put in the first message, and what happens after you send it.',
  title: 'Contact',
}

export default function Page() {
  return (
    <>
      <section data-band>
        <helix-flex data-shell direction="column" gap="lg">
          <helix-text tone="subtle" variant="label">
            Contact
          </helix-text>
          <helix-text as="h1" data-measure data-section-title>
            {CONTACT.title}
          </helix-text>
          <helix-text as="p" data-measure tone="muted">
            One address, read by the people who would do the work. What follows is what to put in
            the first message and what happens after you send it, so neither is a thing you have to
            guess at.
          </helix-text>
          {/* **One control with two actions on the same address.**
              This was a button and a line of text repeating what the button
              said, which existed because a `mailto:` gives a reader with no mail
              client nothing to copy. That is a real gap and a second copy of the
              address is the wrong way to close it: the address appeared twice,
              and the sentence had to explain itself.

              A group is the shape, because both halves act on one thing.
              `ButtonGroup` flattens the inner corners of whatever it holds, so
              an anchor and a copy button read as one object rather than two
              controls that happen to touch. */}
          <helix-flex data-density="lg">
            <helix-button-group label="Reach us">
              <a data-button="solid" data-button-tone="primary" href="mailto:hello@fusion.dev">
                hello@fusion.dev
              </a>
              <helix-copy-button
                copied-label="Address copied"
                emphasis="solid"
                label="Copy the address"
                tone="primary"
                value="hello@fusion.dev"
              ></helix-copy-button>
            </helix-button-group>
          </helix-flex>
        </helix-flex>
      </section>

      <section data-band data-reveal>
        <helix-flex data-shell direction="column" gap="xl">
          <helix-text as="h2" data-measure data-section-title>
            {CONTACT.blocks[0]?.title}
          </helix-text>
          <helix-grid gap="xl" min="18rem">
            {INCLUDE.map((item) => (
              <helix-flex data-substrate direction="column" gap="sm" key={item.name}>
                <helix-text as="h3" data-substrate-name>
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

      <section data-band data-reveal>
        <helix-flex data-shell direction="column" gap="xl">
          <helix-text as="h2" data-measure data-section-title>
            {CONTACT.blocks[1]?.title}
          </helix-text>
          <helix-flex direction="column">
            {NEXT.map((item, index) => (
              <helix-flex align="start" data-row gap="lg" key={item.name} wrap>
                <helix-text tone="subtle" variant="label">
                  {String(index + 1).padStart(2, '0')}
                </helix-text>
                <helix-flex direction="column" gap="sm">
                  <helix-text as="h3" data-substrate-name>
                    {item.name}
                  </helix-text>
                  <helix-text as="p" data-measure tone="muted">
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
