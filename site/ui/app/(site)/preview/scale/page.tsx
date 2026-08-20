import { stageAppearance, VERTICALS } from '../../../verticals'
import '../../../preview.css'

export const metadata = { title: 'Candidate: scale' }

/**
 * A cinematic reading, drawn from the reference and cut where it cannot be told
 * honestly.
 *
 * **What the reference does that we can do.** It gives a scale ladder the whole
 * page: three rungs, one band each, the same claim restated larger. Fusion has
 * exactly that ladder already, and it is the thesis rather than a device
 * borrowed to look like one. It also states an enormous ambition in enormous
 * type, and ambition stated as ambition is honest at any size.
 *
 * **What it does that we cannot.** Its scale section rests on eight million
 * vehicles delivered and ninety percent of global mass to orbit. That is a
 * track record, and it is what earns the treatment. Fusion has no shipped
 * product, no closed engagement and no clients, so the same layout filled with
 * our numbers would be a company performing a scale it does not have, which is
 * the exact failure the stage labels exist to prevent. The counted row here
 * holds only things that are true and it is deliberately small.
 *
 * **And there is no footage.** The reference is carried by film of factories
 * and of orbit. Buying stock would put a picture of someone else's work where
 * ours should be, so the atmosphere is generated from the site's own lattice
 * and one brand-coloured glow.
 */

/** The ladder, which is the thesis and not a borrowed device. */
const RUNGS = [
  {
    body: 'Your own keys, your own data, your own hardware. The model runs where you put it and the memory it accumulates is a file you hold. Nothing about your working life is recoverable by a company that changes its pricing.',
    rung: 'Rung one',
    title: 'Personal',
  },
  {
    body: 'The same properties with more people and an audit trail. A company that cannot be held hostage by a vendor roadmap, because the substrate is one it runs and the data is one it holds.',
    rung: 'Rung two',
    title: 'Organizational',
  },
  {
    body: 'The same properties again, with the stakes that follow from a country running its capability on infrastructure it does not control. This rung is a written thesis and not a product, and we say so.',
    rung: 'Rung three',
    title: 'National',
  },
]

/** Only quantities that are true today. */
const COUNTED = [
  { figure: '78', note: 'Component families, with API and examples' },
  { figure: '1', note: 'Brand color the whole palette derives from' },
  { figure: '3', note: 'Offers, every price stated' },
  { figure: '0', note: 'Products shipped. Two are being built' },
]

export default function Page() {
  return (
    /* One stage, so the sky behind it is continuous. Every band used to paint
       its own glow, which put a seam at every section boundary. */
    <div className="scStage">
      {/* Painted, not laid out, which is why these are plain elements: there is
          no Helix component for a surface that draws light, and `Flex` would be
          claiming this is a layout. */}
      <div aria-hidden="true" className="scSky">
        <div className="scField" />
        <div className="scSun" />
      </div>

      <section className="scBand">
        <helix-flex class="scInner shell" direction="column" gap="xl">
          <helix-text appearance="label" class="scRung">
            Fusion Development Group
          </helix-text>
          <helix-text as="h1" class="scTitle">
            Sovereignty
            <br />
            at every scale.
          </helix-text>
          <helix-text as="p" class="scLede">
            Cheap intelligence and cheap energy arrived together. That pairing is what moves
            sovereignty from a principle you agree with to a stack you can run, and the same
            argument runs from one person to one country.
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

      {RUNGS.map((rung) => (
        <section className="scBand" key={rung.title}>
          <helix-flex class="scInner shell" direction="column" gap="lg">
            <helix-text appearance="label" class="scRung">
              {rung.rung}
            </helix-text>
            <helix-text as="h2" class="scTitle">
              {rung.title}
            </helix-text>
            <helix-text as="p" class="scLede">
              {rung.body}
            </helix-text>
          </helix-flex>
        </section>
      ))}

      {/* The counted row, held to what is true. Four small numbers where the
          reference has eight million vehicles, and one of them is a zero. */}
      <section className="band">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-text appearance="label" class="dvMono" tone="subtle">
            Counted honestly
          </helix-text>
          <helix-grid gap="xl" min="14rem">
            {COUNTED.map((entry) => (
              <helix-flex direction="column" gap="xs" key={entry.note}>
                <helix-text class="scFigure">{entry.figure}</helix-text>
                <helix-text appearance="caption" tone="muted">
                  {entry.note}
                </helix-text>
              </helix-flex>
            ))}
          </helix-grid>
        </helix-flex>
      </section>

      <section className="band">
        <helix-flex class="shell" direction="column" gap="xl">
          <helix-text as="h2" class="sectionTitle measure">
            The map, including the empty parts
          </helix-text>
          <helix-flex direction="column" gap="none">
            {VERTICALS.map((vertical) => (
              <helix-flex
                align="center"
                class="tdRow"
                gap="md"
                justify="between"
                key={vertical.href}
                wrap
              >
                <helix-flex align="center" data-density="sm" gap="sm" wrap>
                  <helix-text appearance="title">{vertical.name}</helix-text>
                  <helix-tag tone={stageAppearance(vertical.stage)}>{vertical.stage}</helix-tag>
                </helix-flex>
                <helix-text tone="muted">{vertical.summary}</helix-text>
              </helix-flex>
            ))}
          </helix-flex>
        </helix-flex>
      </section>
    </div>
  )
}
