/**
 * Direction A. One value, and everything follows from it.
 *
 * **The seed is the constraint, not the hex.** Helix's claim about colour is
 * that a palette derived from one seed is consistent because there was nothing
 * else to choose. The same shape holds a level up: every product Fusion has
 * comes out of one sentence, and the ones that cannot come out of it are not
 * built. So the page is laid out as a derivation and the ramp is the argument,
 * not an ornament on it.
 *
 * Composed from Helix and almost nothing else: the ramp is a `Grid`, the seed
 * is a `Card`, every row is a `Flex` and every word is a `Text`. What the
 * stylesheet adds is the display type and the computed wash, which is the one
 * thing no component can know.
 */
import '../../../preview.css'

export const metadata = { title: 'Direction A: Derivation' }

/** What actually derives from the constraint, in the order it derives. */
const DERIVED = [
  { depth: 22, name: 'The constraint', note: 'One sentence, and it is a law.', step: '00' },
  { depth: 18, name: 'Your keys', note: 'Held by you. Never escrowed.', step: '01' },
  { depth: 14, name: 'Your data', note: 'On hardware you chose.', step: '02' },
  { depth: 11, name: 'Helix', note: 'The interface layer. One open tier.', step: '03' },
  { depth: 8, name: 'Cortex', note: 'Memory and provenance, local first.', step: '04' },
  {
    depth: 5,
    name: 'The ladder',
    note: 'Personal, then organizational, then national.',
    step: '05',
  },
]

export default function Page() {
  return (
    <>
      <section className="dvHero">
        <helix-flex data-shell direction="column" gap="xl">
          <helix-flex align="center" data-density="sm" gap="sm">
            <helix-tag tone="primary">Fusion Development Group</helix-tag>
            <helix-text appearance="label" class="dvMono" tone="subtle">
              Seed 00
            </helix-text>
          </helix-flex>

          <helix-text as="h1" class="dvTitle">
            One constraint.
            <br />
            <em>Everything</em> follows.
          </helix-text>

          <helix-text as="p" data-measure tone="muted">
            Cheap intelligence and cheap energy arrived together, and that is what turns sovereignty
            from a principle you agree with into a stack you can run. We build it from the bottom,
            because a sovereign thing on a rented substrate is a nicely worded dependency.
          </helix-text>

          <helix-flex data-density="lg" gap="sm" wrap>
            <a data-button="solid" data-button-tone="primary" href="/services">
              See what is buyable
            </a>
            <a data-button href="/helix">
              Open Helix
            </a>
          </helix-flex>
        </helix-flex>
      </section>

      <section data-band>
        <helix-flex data-shell direction="column" gap="xl">
          <helix-flex direction="column" gap="sm">
            <helix-text appearance="label" class="dvMono" tone="subtle">
              The derivation
            </helix-text>
            <helix-text as="h2" data-measure data-section-title>
              Nothing here was chosen twice
            </helix-text>
          </helix-flex>

          {/* `gap="none"`, because the hairlines between cells are what make
              this one object being stepped through rather than eight tiles. */}
          <helix-grid class="dvRamp" gap="none" min="11rem">
            {DERIVED.map((entry) => (
              <helix-flex
                class="dvStep"
                direction="column"
                gap="sm"
                key={entry.step}
                style={{ '--dv-depth': entry.depth }}
              >
                <helix-text class="dvMono" tone="subtle">
                  {entry.step}
                </helix-text>
                <helix-flex class="dvStepName" direction="column" gap="2xs">
                  <helix-text appearance="title">{entry.name}</helix-text>
                  <helix-text appearance="caption" class="dvStepNote" tone="muted">
                    {entry.note}
                  </helix-text>
                </helix-flex>
              </helix-flex>
            ))}
          </helix-grid>
        </helix-flex>
      </section>

      <section data-band>
        <helix-flex data-shell direction="column" gap="lg">
          <helix-card separation="outlined">
            <helix-flex direction="column" gap="lg">
              <helix-text appearance="label" class="dvMono" slot="header" tone="subtle">
                Seed 00 · The Sovereignty Constraint
              </helix-text>
              <helix-text as="p" class="dvSeedText">
                No Fusion product may create a dependency its user cannot exit.
              </helix-text>
              <helix-text as="p" data-measure tone="muted">
                You hold your own keys, data, and hardware. We may operate a control plane, never a
                chokepoint. Every row above is what that sentence produces, and anything it cannot
                produce is not something we build.
              </helix-text>
            </helix-flex>
          </helix-card>
        </helix-flex>
      </section>
    </>
  )
}
