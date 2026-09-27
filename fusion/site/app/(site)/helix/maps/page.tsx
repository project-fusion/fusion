import { highlight } from '@fusion.dev/helix-sandbox/highlight'
import Link from 'next/link'
import { Band, band } from '@/components/band/band'
import { Claim } from '@/components/claim/claim'
import { Eyebrow } from '@/components/eyebrow/eyebrow'
import { Lede } from '@/components/lede/lede'
import { SectionTitle } from '@/components/section-title/section-title'
import { GOOGLE_FACES } from '@/content/faces/faces.generated'
import { MAP_FEATURES, MAP_INSTALL, MAP_PILLARS, MAP_STACK, MAPS } from '@/content/maps/maps'
import { stageAppearance } from '@/content/verticals/verticals'
import { pageMetadata } from '@/utils/metadata/metadata'
import { type Params, queryFrom, settingsFrom } from '@/utils/theme-defaults/theme-defaults'
import { serverTheme } from '@/utils/theme-engine/theme-engine.server'
import styles from './maps.module.css'
import { MapsHero } from './maps-hero'
import { MapsPoints } from './maps-points'
import { mapIntent, propertiesOf } from './maps-theme'

/** A snippet as the reference pages show one, highlighted by this build from its own source. */
function Code({
  code,
  label,
  language,
}: {
  code: string
  label: string
  language: 'html' | 'js' | 'sh'
}) {
  return (
    <helix-code-block label={label}>
      <span
        // biome-ignore lint/security/noDangerouslySetInnerHtml: markup this build produced from its own source
        dangerouslySetInnerHTML={{ __html: highlight(code, language) }}
      />
    </helix-code-block>
  )
}

/** The points layer as a page writes it, which the demo beside it is. */
const POINTS_MARKUP = `<helix-map label="Food and drink in Austin">
  <div id="map"></div>
  <helix-map-points
    label="Food and drink"
    src="/austin-food-and-drink.geojson"
    cluster
  ></helix-map-points>
</helix-map>`

export const metadata = pageMetadata({
  description: MAPS.lede,
  path: '/helix/maps',
  title: MAPS.title,
})

/**
 * Maps, a part of Helix at a real address under it.
 *
 * **A page rather than a component's example**, because what is being shown
 * is more than a component: a frame, a connector, a style, the layers inside
 * it, and tiles later. `/helix/components/map` stays the frame's reference.
 *
 * **Sold, then shown, then handed over.** Under the live map: what a map gets
 * from Helix, the one thing a marker cannot do shown running, what a map can
 * hold, how to start one of your own, and last how it is built, the
 * stack each of those rests on. The bands and their field are the landing
 * page's, so Maps reads as a part of the same site rather than a tool page.
 */
export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const [, pillars, points, features, started, stack] = MAPS.blocks
  /* **A theme the builder sent, derived here so it is in the first paint.**
     The link carries the builder's own query, read by the builder's own
     `settingsFrom`, so every value is validated the same way and falls back
     on its own. Written back out by `queryFrom`, which keeps only departures
     from what ships: a link that carried nothing a theme is made of, or only
     values it refused, is a page with no sent theme rather than one showing
     the shipped defaults as though somebody had chosen them. */
  const settings = settingsFrom(await searchParams, GOOGLE_FACES)
  const query = queryFrom(settings)
  const sent = query ? { query, settings } : undefined
  const painted = sent
    ? propertiesOf(
        (await serverTheme()).derive(
          mapIntent(settings, settings.scheme === 'site' ? 'light' : settings.scheme),
        ),
      )
    : undefined
  return (
    <>
      <MapsHero painted={painted} sent={sent} />
      {/* **One field behind every band**, the landing page's, so the glass
          the cards are made of has something to show through it. */}
      <div className={styles.mapsField}>
        <helix-aura
          class={styles.mapsAura}
          data-layer
          gain={1.05}
          scale={3}
          speed={0.5}
          terminus={0.5625}
          variant="flow"
        ></helix-aura>

        <Band reveal>
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <Eyebrow>{pillars?.kicker}</Eyebrow>
            <SectionTitle>{pillars?.title}</SectionTitle>
          </helix-flex>
          <div className={band.bandRow}>
            {MAP_PILLARS.map((pillar) => (
              <helix-flex class={band.bandCell} direction="column" gap="md" key={pillar.name}>
                <Eyebrow>{pillar.name}</Eyebrow>
                <Claim>{pillar.claim}</Claim>
                <ul className={styles.mapsFacts}>
                  {pillar.facts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              </helix-flex>
            ))}
          </div>
        </Band>

        {/* **The one thing a marker cannot do, running.** Thousands of places
            are a layer the renderer draws, and the demo is the real layer on
            the real data beside the markup it takes. */}
        <Band reveal shell="plain" wide>
          <div className={band.bandSplit}>
            <helix-flex class={band.bandSection} direction="column" gap="md">
              <Eyebrow>{points?.kicker}</Eyebrow>
              <SectionTitle>{points?.title}</SectionTitle>
              <Lede>{points?.body?.[0]}</Lede>
              <Code code={POINTS_MARKUP} label="The markup" language="html" />
            </helix-flex>
            <div className={band.bandSection}>
              <MapsPoints />
            </div>
          </div>
        </Band>

        <Band reveal>
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <Eyebrow>{features?.kicker}</Eyebrow>
            <SectionTitle>{features?.title}</SectionTitle>
            <Lede>{features?.body?.[0]}</Lede>
          </helix-flex>
          <div className={styles.mapsFeatures}>
            {MAP_FEATURES.map((feature) => (
              <helix-flex
                class={styles.mapsFeature}
                direction="column"
                gap="sm"
                key={feature.title}
              >
                <Claim>{feature.title}</Claim>
                <helix-text emphasis="muted">{feature.body}</helix-text>
                <helix-flex gap="xs" wrap>
                  {feature.elements.map((element) => (
                    <code className={styles.mapsElement} key={element}>
                      {element}
                    </code>
                  ))}
                </helix-flex>
              </helix-flex>
            ))}
          </div>
        </Band>
      </div>
      {/* **A second field for the second half**, the way the landing page
          lights its closing bands: one canvas the length of five bands faded
          to flat black by the fourth. */}
      <div className={styles.mapsField}>
        <helix-aura
          class={styles.mapsAura}
          data-layer
          gain={1.05}
          scale={2.5}
          speed={0.5}
          terminus={0.5625}
          variant="flow"
        ></helix-aura>

        {/* The install command, and the guide for everything after it. The
            guide is the one place the setup code lives, so the page and the
            docs cannot drift apart. */}
        <Band id="get-started" reveal>
          <helix-flex
            class={`${band.bandSection} ${styles.mapsStarted}`}
            direction="column"
            gap="md"
          >
            <Eyebrow>{started?.kicker}</Eyebrow>
            <SectionTitle>{started?.title}</SectionTitle>
            <Lede>{started?.body?.[0]}</Lede>
            <div className={styles.mapsInstall}>
              <Code code={MAP_INSTALL} label="Install" language="sh" />
            </div>
            <helix-flex class="siteActions" data-density="lg">
              <Link data-button="solid" data-button-tone="primary" href="/helix/docs/maps">
                Read the Maps guide
              </Link>
            </helix-flex>
          </helix-flex>
        </Band>

        <Band reveal>
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <Eyebrow>{stack?.kicker}</Eyebrow>
            <SectionTitle>{stack?.title}</SectionTitle>
            <Lede>{stack?.body?.[0]}</Lede>
          </helix-flex>
          {/* **The layers as rows, top to bottom**, ruled as the features
              above are rather than boxed apart, since they are one stack:
              what the layer is and its name, what it does, and where it
              stands, or whose it is where it is not ours. */}
          <ol className={styles.mapsStack}>
            {MAP_STACK.map((layer) => (
              <li
                className={styles.mapsLayer}
                data-owned={layer.owner ? 'false' : 'true'}
                key={layer.title}
              >
                <helix-flex direction="column" gap="xs">
                  <Eyebrow>{layer.role}</Eyebrow>
                  <Claim>{layer.title}</Claim>
                </helix-flex>
                <helix-text emphasis="muted">{layer.body}</helix-text>
                <helix-tag
                  class={styles.mapsLayerStage}
                  tone={layer.stage ? stageAppearance(layer.stage) : 'neutral'}
                >
                  {layer.stage ?? layer.owner}
                </helix-tag>
              </li>
            ))}
          </ol>
        </Band>
      </div>
    </>
  )
}
