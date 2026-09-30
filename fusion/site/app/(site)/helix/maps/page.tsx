import { highlight } from '@fusion.dev/helix-sandbox/highlight'
import Link from 'next/link'
import { Band, band } from '@/components/band/band'
import { Claim } from '@/components/claim/claim'
import { Eyebrow } from '@/components/eyebrow/eyebrow'
import { Lede } from '@/components/lede/lede'
import { SectionTitle } from '@/components/section-title/section-title'
import { GOOGLE_FACES } from '@/content/faces/faces.generated'
import {
  ELEVATION,
  MAP_BASICS,
  MAP_FEATURES,
  MAP_INSTALL,
  MAP_LAYERS,
  MAP_PILLARS,
  MAP_STACK,
  MAPS,
  type MapFeature,
  RADAR,
} from '@/content/maps/maps'
import { POINTS_VIEW } from '@/content/maps/points'
import { stageAppearance } from '@/content/verticals/verticals'
import { snapshotOf } from '@/utils/map-snapshot/map-snapshot'
import { pageMetadata } from '@/utils/metadata/metadata'
import { type Params, queryFrom, settingsFrom } from '@/utils/theme-defaults/theme-defaults'
import { serverTheme } from '@/utils/theme-engine/theme-engine.server'
import styles from './maps.module.css'
import { MapsHero } from './maps-hero'
import { MapsPoints } from './maps-points'
import { MapsRadar } from './maps-radar'
import { MapsTerrain } from './maps-terrain'
import { mapIntent, propertiesOf } from './maps-theme'

/** A line of highlighted markup that opens and closes its own spans, which a line can be set apart from its neighbors. */
const whole = (line: string): boolean =>
  (line.match(/<span/g)?.length ?? 0) === (line.match(/<\/span>/g)?.length ?? 0)

/**
 * Highlighted markup set to wrap as code is read.
 *
 * - **Each word is kept whole**, so a line does not break at a hyphen, and a
 *   path's words are joined by a break after each slash, which is where a long
 *   URL wraps. A tag's own `</` and `/>` are left whole.
 * - **Each line hangs from its indent**, so a wrapped line continues two
 *   characters in from the line it belongs to.
 *
 * Only elements are added, and the text is unchanged, so the copy button
 * copies the code as written. Markup whose spans run across lines is returned
 * as it came, to scroll as the block otherwise does.
 */
const wrapped = (html: string): string => {
  const lines = html.split('\n')
  if (!lines.every(whole)) {
    return html
  }
  const words = (text: string): string =>
    text.replace(/[^\s]+/g, (word) =>
      word
        .split(/(?<=(?<!&lt;)\/(?!\/|&gt;))/)
        .map((part) => `<span class="${styles.mapsWord}">${part}</span>`)
        .join('<wbr>'),
    )
  return lines
    .map((line, index) => {
      const indent = /^ */.exec(line)?.[0].length ?? 0
      const set = line.replace(
        /(^|>)([^<]*)/g,
        (_, open: string, text: string) => open + words(text),
      )
      const end = index < lines.length - 1 ? '\n' : ''
      return `<span class="${styles.mapsLine}" style="--indent: ${indent + 2}">${set}${end}</span>`
    })
    .join('')
}

/**
 * A snippet as the reference pages show one, highlighted by this build from
 * its own source. `wrap` wraps its long lines, where a line that scrolled
 * would hide the end of a URL.
 */
function Code({
  code,
  label,
  language,
  wrap = false,
}: {
  code: string
  label: string
  language: 'html' | 'js' | 'sh'
  wrap?: boolean
}) {
  const html = highlight(code, language)
  return (
    <helix-code-block class={wrap ? styles.mapsWrapped : undefined} label={label}>
      <span
        // biome-ignore lint/security/noDangerouslySetInnerHtml: markup this build produced from its own source
        dangerouslySetInnerHTML={{ __html: wrap ? wrapped(html) : html }}
      />
    </helix-code-block>
  )
}

/** The points layer as a page writes it, which the demo beside it is. */
const POINTS_MARKUP = `<helix-map label="Food and drink in Austin">
  <div id="map"></div>
  <helix-map-points
    label="Food and drink"
    src="/maps/austin-food-and-drink.geojson"
    cluster
  ></helix-map-points>
</helix-map>`

/** The ground layers as a page writes them, which the Yosemite demo beside it is, less its imagery. */
const TERRAIN_MARKUP = `<helix-map
  controls="zoom compass tilt layers fullscreen"
>
  <div id="map"></div>
  <helix-map-landcover></helix-map-landcover>
  <helix-map-terrain
    src="${ELEVATION.src}"
    raised
  ></helix-map-terrain>
  <helix-map-contours
    src="${ELEVATION.src}"
    unit="feet"
  ></helix-map-contours>
</helix-map>`

/** The radar layer as a page writes it, which the radar demo beside it is. */
const RADAR_MARKUP = `<helix-map
  label="Weather radar over the United States"
>
  <div id="map"></div>
  <helix-map-raster
    label="Weather radar"
    attribution="${RADAR.attribution}"
    max-zoom="${RADAR.maxZoom}"
    frames="
${RADAR.frames.map((one) => `      ${one}`).join('\n')}
    "
  ></helix-map-raster>
</helix-map>`

/**
 * A band's cells, two by two on a wide card: each thing's name, what it does,
 * and what you write for it, set as code.
 */
function Features({ features }: { features: readonly MapFeature[] }) {
  return (
    <div className={styles.mapsFeatures}>
      {features.map((feature) => (
        <helix-flex class={styles.mapsFeature} direction="column" gap="sm" key={feature.title}>
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
  )
}

/**
 * **The cameras the hero's map opens at**, measured: MapLibre frames the walk
 * clear of the pitch and the bar, which the server cannot lay out, so the
 * snapshot is drawn at what that framing comes to on a wide screen, 1440 by
 * 900, and on a phone, 390 wide. A screen between draws a little off from
 * the map it fades into, which the fade carries.
 */
const HERO_VIEWS = {
  narrow: {
    center: { lat: 30.27802, lng: -97.75071 },
    height: 483,
    pitch: 45,
    width: 390,
    zoom: 12.377,
  },
  wide: {
    center: { lat: 30.27297, lng: -97.77172 },
    height: 727,
    pitch: 45,
    width: 1440,
    zoom: 13.313,
  },
}

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
 * hold, the ground under it shown running, the layers you add, the weather
 * shown running, what every map draws, how to start one of your own, and last
 * how it is built, the
 * stack each of those rests on. The bands and their field are the landing
 * page's, so Maps reads as a part of the same site rather than a tool page.
 */
export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const [, pillars, points, features, terrain, layers, radar, basics, started, stack] = MAPS.blocks
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
  const [wide, narrow, pointsSnapshot] = await Promise.all([
    snapshotOf(HERO_VIEWS.wide),
    snapshotOf(HERO_VIEWS.narrow),
    snapshotOf(POINTS_VIEW),
  ])
  return (
    <>
      <MapsHero
        painted={painted}
        sent={sent}
        snapshots={wide && narrow ? { narrow, wide } : undefined}
      />
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

        <Band>
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
        <Band shell="plain" wide>
          <div className={band.bandSplit}>
            <helix-flex class={band.bandSection} direction="column" gap="md">
              <Eyebrow>{points?.kicker}</Eyebrow>
              <SectionTitle>{points?.title}</SectionTitle>
              <Lede>{points?.body?.[0]}</Lede>
              <Code code={POINTS_MARKUP} label="The markup" language="html" />
            </helix-flex>
            <div className={band.bandSection}>
              <MapsPoints snapshot={pointsSnapshot || undefined} />
            </div>
          </div>
        </Band>

        <Band>
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <Eyebrow>{features?.kicker}</Eyebrow>
            <SectionTitle>{features?.title}</SectionTitle>
            <Lede>{features?.body?.[0]}</Lede>
          </helix-flex>
          <Features features={MAP_FEATURES} />
        </Band>

        {/* **The ground, running**: the layers under the places, raised and
            tilted on a valley whose walls show them, beside the markup. */}
        <Band shell="plain" wide>
          <div className={band.bandSplit}>
            <helix-flex class={band.bandSection} direction="column" gap="md">
              <Eyebrow>{terrain?.kicker}</Eyebrow>
              <SectionTitle>{terrain?.title}</SectionTitle>
              <Lede>{terrain?.body?.[0]}</Lede>
              <Code code={TERRAIN_MARKUP} label="The markup" language="html" wrap />
            </helix-flex>
            <div className={band.bandSection}>
              <MapsTerrain />
            </div>
          </div>
        </Band>

        <Band>
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <Eyebrow>{layers?.kicker}</Eyebrow>
            <SectionTitle>{layers?.title}</SectionTitle>
            <Lede>{layers?.body?.[0]}</Lede>
          </helix-flex>
          <Features features={MAP_LAYERS} />
        </Band>

        {/* **The weather, running**: the radar the last layer card names, on
            the live frames, and the button that plays it. */}
        <Band shell="plain" wide>
          <div className={band.bandSplit}>
            <helix-flex class={band.bandSection} direction="column" gap="md">
              <Eyebrow>{radar?.kicker}</Eyebrow>
              <SectionTitle>{radar?.title}</SectionTitle>
              <Lede>{radar?.body?.[0]}</Lede>
              <Code code={RADAR_MARKUP} label="The markup" language="html" wrap />
              <helix-text emphasis="subtle" variant="caption">
                {radar?.body?.[1]}
              </helix-text>
            </helix-flex>
            <div className={band.bandSection}>
              <MapsRadar />
            </div>
          </div>
        </Band>

        <Band>
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <Eyebrow>{basics?.kicker}</Eyebrow>
            <SectionTitle>{basics?.title}</SectionTitle>
            <Lede>{basics?.body?.[0]}</Lede>
          </helix-flex>
          <Features features={MAP_BASICS} />
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
        <Band id="get-started">
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

        <Band>
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
