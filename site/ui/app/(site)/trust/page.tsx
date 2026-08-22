/**
 * The bar, published as a finite list.
 *
 * **The point is that it is finite.** `the internal plan` names the risk
 * this page exists to answer: a trust bar that is never defined can never be
 * met, and perpetual pre-launch is what happens to a company that keeps raising
 * one. Written down and counted, it converts an internal gate that can be moved
 * forever into a public commitment that can actually be reached.
 *
 * The second half is the part most companies leave out and the reason this page
 * is worth having at all: none of it has been exercised yet, because nothing
 * has shipped. Saying so is the same discipline the stage labels are.
 */
export const metadata = {
  description:
    'The finite checklist every Fusion product clears before it ships, and an honest account of what has been tested so far.',
  title: 'Trust',
}

/** What has to be true before anything carries the name. */
const BAR = [
  {
    body: 'A written answer to the question every proposal is tested against: what happens to you if Fusion shuts down tomorrow. Published with the product rather than available on request.',
    name: 'The exit test, answered in writing',
  },
  {
    body: 'What is stored, where it lives, how long it is kept and what causes it to be deleted. Stated before a product collects anything, not in a policy revised afterwards.',
    name: 'Data handling stated before collection',
  },
  {
    body: 'Yours, generated where you are, never escrowed. A product that can read your data without your key is a product that can be compelled to.',
    name: 'Keys held by you',
  },
  {
    body: 'You can stop it and keep everything. Not an account closure that starts a countdown, and not an export that produces a file nothing else can read.',
    name: 'A stop that leaves you whole',
  },
  {
    body: "Anything touching credentials, money or another person's records is reviewed by someone who does not work here before it ships. Named in the release, not asserted.",
    name: 'Outside review where the stakes are real',
  },
  {
    body: 'Active means it ships with users. Building means real work with nothing shipped. Declared means committed direction with no work started. No product is described as further along than it is.',
    name: 'The stage label is the true one',
  },
]

export default function Page() {
  return (
    <>
      <section className="band">
        <helix-flex class="shell" direction="column" gap="lg">
          <helix-text appearance="label" tone="subtle">
            Trust
          </helix-text>
          <helix-text as="h1" class="sectionTitle measure">
            What has to be true before anything ships
          </helix-text>
          <helix-text as="p" class="measure" tone="muted">
            Six things. The number matters more than the contents: a bar that is never written down
            can be raised forever, and a company that keeps raising one never launches. Counted and
            published, it becomes something that can actually be met, and something you can hold us
            to.
          </helix-text>
        </helix-flex>
      </section>

      <section className="band reveal">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-flex direction="column">
            {BAR.map((item, index) => (
              <helix-flex align="start" class="verticalRow" gap="lg" key={item.name} wrap>
                {/* Numbered, because the count is the commitment. A list that
                    can grow quietly is the thing this page exists to prevent. */}
                <helix-text appearance="label" tone="subtle">
                  {String(index + 1).padStart(2, '0')}
                </helix-text>
                <helix-flex direction="column" gap="2xs">
                  <helix-text as="h2" class="verticalName">
                    {item.name}
                  </helix-text>
                  <helix-text class="measure" tone="muted">
                    {item.body}
                  </helix-text>
                </helix-flex>
              </helix-flex>
            ))}
          </helix-flex>
        </helix-flex>
      </section>

      {/* The half that makes the rest credible. */}
      <section className="band reveal">
        <helix-flex class="shell statement" direction="column" gap="lg">
          <helix-text appearance="label" tone="subtle">
            Where this stands
          </helix-text>
          <helix-text as="p" class="statementText">
            None of it has been tested, because nothing has shipped.
          </helix-text>
          <helix-text as="p" class="measure" tone="muted">
            Helix is Building and Cortex is Building, which means there is no product yet that has
            had to clear this list. Publishing the bar before there is anything to hold against it
            is the point: written first, it is a commitment. Written afterwards, it is a description
            of whatever we happened to do.
          </helix-text>
        </helix-flex>
      </section>

      <section className="band closing reveal">
        <helix-flex align="center" class="shell" direction="column" gap="lg">
          <helix-text as="h2" class="sectionTitle">
            Hold us to it
          </helix-text>
          <helix-text as="p" class="measure" tone="muted">
            If something we ship does not clear one of these, that is worth telling us about, and
            the list is short enough that the check is a real one.
          </helix-text>
          <helix-flex data-density="lg" gap="sm" wrap>
            <a
              data-button="solid"
              data-button-fill="standard"
              data-button-tone="primary"
              href="mailto:hello@fusion.dev"
            >
              hello@fusion.dev
            </a>
            <a data-button data-button-fill="standard" href="/thesis">
              Read the thesis
            </a>
          </helix-flex>
        </helix-flex>
      </section>
    </>
  )
}
