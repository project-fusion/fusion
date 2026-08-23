/**
 * A cinematic reading of the thesis, built the way the reference is built.
 *
 * Terafab puts a produced picture in the hero and lets type sit on it. Fusion
 * cannot fill that treatment with shipped-product footage, and will not borrow
 * a factory it does not run. The plates are original: water, the sun, and the
 * same light at three distances. The water and the sun move. The ladder is the
 * thesis rather than a device borrowed to look like one. The counted row holds
 * only things that are true.
 */
import { stageAppearance, VERTICALS } from '../../../verticals'
import { CinematicMode } from './cinematic-mode'
import { ScaleLadder } from './ladder'
import { OceanWorld } from './ocean-world'
import '../../../preview.css'

export const metadata = { title: 'Candidate: scale' }

/** Only quantities that are true today. */
const COUNTED = [
  { figure: '78', note: 'Component families, with API and examples' },
  { figure: '1', note: 'Brand color the whole palette derives from' },
  { figure: '3', note: 'Offers, every price stated' },
  { figure: '0', note: 'Products shipped. Two are being built' },
]

export default function Page() {
  return (
    <CinematicMode>
      <div className="scCinematic" data-color-mode="dark">
        <section className="scHero">
          <div aria-hidden="true" className="scHeroWorld">
            {/* biome-ignore lint/performance/noImgElement: fallback if the live world fails */}
            <img
              alt=""
              className="scHeroStill"
              decoding="async"
              fetchPriority="high"
              src="/media/scale/ocean-sun.jpg"
            />
            <OceanWorld shot="sea" />
            <div className="scHeroScrim" />
          </div>
          <helix-flex class={`scHeroCopy`} data-shell direction="column" gap="lg">
            <helix-text class="scKicker" variant="label">
              Fusion Development Group
            </helix-text>
            <h1 className="scHeroName">Fusion</h1>
            <p className="scHeroClaim">Sovereignty at every scale.</p>
            <helix-flex data-density="lg" gap="sm" wrap>
              <a data-button="solid" data-button-tone="primary" href="/preview/scale/film">
                Watch
              </a>
              <a data-button href="/services">
                See what is buyable
              </a>
            </helix-flex>
          </helix-flex>
        </section>

        <ScaleLadder />

        <section className="scScene">
          <div aria-hidden="true" className="scSceneWorld">
            {/* biome-ignore lint/performance/noImgElement: fallback if the live world fails */}
            <img alt="" className="scScenePlate" decoding="async" src="/media/scale/sun.jpg" />
            <OceanWorld shot="sun" />
            <div className="scSceneScrim" />
          </div>
          <helix-flex class={`scSceneCopy`} data-shell direction="column" gap="lg">
            <helix-text class="scKicker" variant="label">
              The floor
            </helix-text>
            <helix-text as="h2" class="scSceneTitle">
              Energy is the missing floor.
            </helix-text>
            <p className="scSceneLede">
              Every layer above this presumed power. Fusion is the terminal form of sovereign
              energy: fuel from seawater, no import, no cartel, no grid dependency. The name is the
              destination.
            </p>
          </helix-flex>
        </section>

        <section className="scScene">
          <div aria-hidden="true" className="scSceneWorld">
            {/* biome-ignore lint/performance/noImgElement: fallback if the live world fails */}
            <img alt="" className="scScenePlate" decoding="async" src="/media/scale/seawater.jpg" />
            <OceanWorld shot="under" />
            <div className="scSceneScrim" />
          </div>
          <helix-flex class={`scSceneCopy`} data-shell direction="column" gap="lg">
            <helix-text class="scKicker" variant="label">
              The name
            </helix-text>
            <helix-text as="h2" class="scSceneTitle">
              Fuel from seawater.
            </helix-text>
            <p className="scSceneLede">
              Intelligence got cheap. Energy is next. The pairing is what moves sovereignty from a
              principle you agree with to a stack you can run, and the same argument runs from one
              person to one country.
            </p>
          </helix-flex>
        </section>

        <section className="scBand">
          <helix-flex data-shell direction="column" gap="xl">
            <helix-text class="scKicker" variant="label">
              The constraint
            </helix-text>
            <helix-text as="h2" class={`scSceneTitle`} data-measure>
              No product may create a dependency its user cannot exit.
            </helix-text>
            <p className="scSceneLede">
              The user holds their own keys, data, and hardware. Fusion may operate a control plane,
              never a chokepoint. If Fusion shut down tomorrow, the thing would still be yours.
            </p>
          </helix-flex>
        </section>

        <section className="scBand">
          <helix-flex data-shell direction="column" gap="xl">
            <helix-text class="scKicker" variant="label">
              Counted honestly
            </helix-text>
            <helix-grid gap="xl" min="14rem">
              {COUNTED.map((entry) => (
                <helix-flex direction="column" gap="xs" key={entry.note}>
                  <helix-text class="scFigure">{entry.figure}</helix-text>
                  <helix-text tone="muted" variant="caption">
                    {entry.note}
                  </helix-text>
                </helix-flex>
              ))}
            </helix-grid>
          </helix-flex>
        </section>

        <section className="scBand">
          <helix-flex data-shell direction="column" gap="xl">
            <helix-text as="h2" class={`scSceneTitle`} data-measure>
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
                    <helix-text variant="title">{vertical.name}</helix-text>
                    <helix-tag tone={stageAppearance(vertical.stage)}>{vertical.stage}</helix-tag>
                  </helix-flex>
                  <helix-text tone="muted">{vertical.summary}</helix-text>
                </helix-flex>
              ))}
            </helix-flex>
          </helix-flex>
        </section>
      </div>
    </CinematicMode>
  )
}
