/**
 * The company's argument, at length.
 *
 * **This is the page the landing page was standing in for.** The home page
 * carried the mechanism, the ladder and the constraint in three bands, which
 * made it long and still gave none of them room. They belong here, where an
 * argument can take the space it needs and a reader who wants the short version
 * never has to meet it.
 *
 * Derived from `docs/00-thesis.md` rather than written fresh, and cut where the
 * document names things this repository does not have: it lists verticals and a
 * product that are not in `verticals.ts`, and a page that claims them would be
 * describing a different company.
 */
import { LADDER, STACK, THESIS } from '../../thesis'
import { stageAppearance, VERTICALS } from '../../verticals'

export const metadata = {
  description:
    'Sovereignty is the goal, abundance is the mechanism, and the same stack runs from one person to one country.',
  title: 'Thesis',
}

export default function Page() {
  return (
    <>
      <section data-band>
        <helix-flex data-shell direction="column" gap="lg">
          <helix-text tone="subtle" variant="label">
            Thesis
          </helix-text>
          <helix-text as="h1" data-measure data-section-title>
            {THESIS.title}
          </helix-text>
          <helix-text as="p" data-measure tone="muted">
            {THESIS.lede}
          </helix-text>
        </helix-flex>
      </section>

      <section data-band data-reveal>
        <helix-flex data-shell direction="column" gap="xl">
          <helix-flex direction="column" gap="sm">
            <helix-text tone="subtle" variant="label">
              {THESIS.blocks[0]?.kicker}
            </helix-text>
            <helix-text as="h2" data-measure data-section-title>
              {THESIS.blocks[0]?.title}
            </helix-text>
            <helix-text as="p" data-measure tone="muted">
              {THESIS.blocks[0]?.body?.[0]}
            </helix-text>
          </helix-flex>

          <helix-flex direction="column">
            {STACK.map((row) => {
              const vertical = VERTICALS.find((entry) => entry.href === row.vertical)
              return (
                <helix-flex align="center" data-row gap="md" justify="between" key={row.layer} wrap>
                  <helix-flex direction="column" gap="2xs">
                    <helix-flex align="center" data-density="sm" gap="sm" wrap>
                      <helix-text as="h3" data-row-name>
                        {row.layer}
                      </helix-text>
                      {vertical ? (
                        <helix-tag tone={stageAppearance(vertical.stage)}>
                          {vertical.stage}
                        </helix-tag>
                      ) : null}
                    </helix-flex>
                    <helix-text tone="muted">Sovereign over {row.over}</helix-text>
                  </helix-flex>
                  {vertical ? (
                    <a data-link="quiet" href={vertical.href}>
                      {vertical.name}
                    </a>
                  ) : null}
                </helix-flex>
              )
            })}
          </helix-flex>

          <helix-text as="p" data-measure tone="muted">
            Energy is the missing floor, and every layer above it presumes power. It is also why the
            company is called Fusion: fuel from seawater, no import, no cartel, no grid dependency.
            The name states the destination rather than the position.
          </helix-text>
        </helix-flex>
      </section>

      <section data-band data-reveal>
        <helix-flex data-shell direction="column" gap="xl">
          <helix-flex direction="column" gap="sm">
            <helix-text tone="subtle" variant="label">
              {THESIS.blocks[1]?.kicker}
            </helix-text>
            <helix-text as="h2" data-measure data-section-title>
              {THESIS.blocks[1]?.title}
            </helix-text>
          </helix-flex>

          <helix-grid gap="xl" min="18rem">
            {LADDER.map((rung) => (
              <helix-flex data-substrate direction="column" gap="sm" key={rung.scale}>
                <helix-text tone="subtle" variant="label">
                  {rung.means}
                </helix-text>
                <helix-text as="h3" data-substrate-name>
                  {rung.scale}
                </helix-text>
                <helix-text as="p" tone="muted">
                  {rung.body}
                </helix-text>
              </helix-flex>
            ))}
          </helix-grid>

          <helix-text as="p" data-measure tone="muted">
            This is the growth path and the go-to-market sequence at once. It is not seven unrelated
            markets: it is one stack and one architectural commitment, sold to a larger subject each
            time.
          </helix-text>
        </helix-flex>
      </section>

      <section data-band data-reveal>
        <helix-flex class={`statement`} data-shell direction="column" gap="lg">
          <helix-text tone="subtle" variant="label">
            {THESIS.blocks[2]?.kicker}
          </helix-text>
          <helix-text as="p" data-statement>
            No Fusion product may create a dependency its user cannot exit.
          </helix-text>
          <helix-text as="p" data-measure tone="muted">
            The user holds their own keys, data and hardware. Fusion may operate a control plane,
            never a chokepoint. Every product must be able to keep working if Fusion disappears.
          </helix-text>
        </helix-flex>
      </section>

      <section data-band data-reveal>
        <helix-flex data-shell direction="column" gap="xl">
          <helix-text as="h2" data-measure data-section-title>
            {THESIS.blocks[2]?.title}
          </helix-text>
          <helix-grid gap="xl" min="18rem">
            {(THESIS.blocks[2]?.items ?? []).map((reason) => (
              <helix-flex data-substrate direction="column" gap="sm" key={reason.name}>
                <helix-text as="h3" data-substrate-name>
                  {reason.name}
                </helix-text>
                <helix-text as="p" tone="muted">
                  {reason.body}
                </helix-text>
              </helix-flex>
            ))}
          </helix-grid>
          <helix-text as="p" data-measure tone="muted">
            The cost is real and worth stating plainly: it forecloses the highest margin patterns in
            software, which are lock-in, the data moat and usage rent. What is left is services now,
            a hosted control plane sold as convenience later, and hardware margin eventually, which
            is the one model fully native to sovereignty because you sell it and they own it.
          </helix-text>
          <a data-link href="/trust">
            What has to be true before any of it ships
          </a>
        </helix-flex>
      </section>
    </>
  )
}
