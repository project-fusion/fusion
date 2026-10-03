import Link from 'next/link'
import { Band, band } from '@/components/band/band'
import { Claim } from '@/components/claim/claim'
import { Eyebrow } from '@/components/eyebrow/eyebrow'
import { Lede } from '@/components/lede/lede'
import { SectionTitle } from '@/components/section-title/section-title'
import { Snippet } from '@/components/snippet/snippet'
import {
  GRAPH,
  GRAPH_FEATURES,
  GRAPH_INSTALL,
  GRAPH_PILLARS,
  GRAPH_SHAPES,
  GRAPH_STACK,
} from '@/content/graph/graph'
import type { MapFeature } from '@/content/maps/maps'
import { stageAppearance } from '@/content/verticals/verticals'
import { pageMetadata } from '@/utils/metadata/metadata'
import styles from './graph.module.css'
import { GraphDemo } from './graph-demo'
import { GraphHero } from './graph-hero'

/** Live data as a page writes it, which the demo beside it is. */
const LIVE_CODE = `const frame = document.querySelector('helix-graph')
frame.nodes = notes
frame.links = links

const sigma = new Sigma(new Graph(), box)
connectGraph(frame, sigmaDriver(sigma, { layout }))

// A note arrives, and is drawn beside its neighbors.
frame.nodes = [...frame.nodes, call]
frame.links = [...frame.links, { source: call.id, target: 'Pricing' }]

// A message passes from one note to another.
frame.signal(call.id, 'Pricing')`

/** A graph on a model as a page writes it, which the knot beside it is. */
const SHAPE_CODE = `import { shapeFromModel } from '@fusion.dev/helix-graph/model'
import { threeDriver } from '@fusion.dev/helix-graph/three'

const knot = await shapeFromModel('/models/knot.glb')
connectGraph(frame, threeDriver(box), {
  stencil: { ...knot, place: 'surface' },
})`

/** A large graph as a page writes it, which the demo beside it is. */
const LARGE_CODE = `import { Graph } from '@cosmos.gl/graph'
import { cosmosDriver } from '@fusion.dev/helix-graph/cosmos'

const graph = new Graph(box, { enableSimulation: true })
connectGraph(frame, cosmosDriver(graph, box))`

/**
 * A band's cells, two by two on a wide card: each thing's name, what it does,
 * and what you write for it, set as code.
 */
function Features({ features }: { features: readonly MapFeature[] }) {
  return (
    <div className={styles.graphFeatures}>
      {features.map((feature) => (
        <helix-flex class={styles.graphFeature} direction="column" gap="sm" key={feature.title}>
          <Claim>{feature.title}</Claim>
          <helix-text emphasis="muted">{feature.body}</helix-text>
          <helix-flex gap="xs" wrap>
            {feature.elements.map((element) => (
              <code className={styles.graphElement} key={element}>
                {element}
              </code>
            ))}
          </helix-flex>
        </helix-flex>
      ))}
    </div>
  )
}

/** A live graph beside the code that makes it, under its band's words. */
function Showcase({
  code,
  copy,
  kind,
  noPanel = false,
}: {
  code: string
  copy: (typeof GRAPH.blocks)[number] | undefined
  kind: 'knowledge' | 'services' | 'team'
  /** Whether the frame leaves its list behind its button, so the drawing takes the width. */
  noPanel?: boolean
}) {
  return (
    <Band shell="plain" wide>
      <div className={band.bandSplit}>
        <helix-flex class={band.bandSection} direction="column" gap="md">
          <Eyebrow>{copy?.kicker}</Eyebrow>
          <SectionTitle>{copy?.title}</SectionTitle>
          <Lede>{copy?.body?.[0]}</Lede>
          <Snippet code={code} label="The code" language="js" wrap />
        </helix-flex>
        {/* The graph, and under it what to try, as each map on Maps has. */}
        <div className={`${band.bandSection} ${styles.graphShowcase}`}>
          <GraphDemo className={styles.graphDemo} kind={kind} noPanel={noPanel} />
          <helix-text emphasis="subtle" variant="caption">
            {copy?.body?.[1]}
          </helix-text>
        </div>
      </div>
    </Band>
  )
}

export const metadata = pageMetadata({
  description: GRAPH.lede,
  path: '/helix/graph',
  title: GRAPH.title,
})

/**
 * Graph, a part of Helix at an address under it, as Maps is.
 *
 * **A page beside the component's reference**, because what is shown is more
 * than a component: a frame, a connector, three renderers, and shapes.
 * `/helix/components/graph` stays the frame's reference.
 *
 * **Sold, then shown, then handed over**, in Maps' order: a mind on a model
 * of a brain at the top, then what a graph gets from Helix, a live graph,
 * what a graph can show, a graph on a model, the shapes, a large graph, how
 * to start one, and how it is built.
 */
export default function Page() {
  const [, pillars, live, features, shape, shapes, large, started, stack] = GRAPH.blocks
  return (
    <>
      <GraphHero />

      {/* **One field behind every band**, the landing page's, as on Maps. */}
      <div className={styles.graphField}>
        <helix-aura
          class={styles.graphAura}
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
            {GRAPH_PILLARS.map((pillar) => (
              <helix-flex class={band.bandCell} direction="column" gap="md" key={pillar.name}>
                <Eyebrow>{pillar.name}</Eyebrow>
                <Claim>{pillar.claim}</Claim>
                <ul className={styles.graphFacts}>
                  {pillar.facts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              </helix-flex>
            ))}
          </div>
        </Band>

        <Showcase code={LIVE_CODE} copy={live} kind="team" />

        <Band>
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <Eyebrow>{features?.kicker}</Eyebrow>
            <SectionTitle>{features?.title}</SectionTitle>
            <Lede>{features?.body?.[0]}</Lede>
          </helix-flex>
          <Features features={GRAPH_FEATURES} />
        </Band>

        <Showcase code={SHAPE_CODE} copy={shape} kind="services" noPanel />

        <Band>
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <Eyebrow>{shapes?.kicker}</Eyebrow>
            <SectionTitle>{shapes?.title}</SectionTitle>
            <Lede>{shapes?.body?.[0]}</Lede>
          </helix-flex>
          <Features features={GRAPH_SHAPES} />
        </Band>

        <Showcase code={LARGE_CODE} copy={large} kind="knowledge" noPanel />
      </div>

      {/* **A second field for the second half**, as Maps lights its closing bands. */}
      <div className={styles.graphField}>
        <helix-aura
          class={styles.graphAura}
          data-layer
          gain={1.05}
          scale={2.5}
          speed={0.5}
          terminus={0.5625}
          variant="flow"
        ></helix-aura>

        <Band id="get-started">
          <helix-flex
            class={`${band.bandSection} ${styles.graphStarted}`}
            direction="column"
            gap="md"
          >
            <Eyebrow>{started?.kicker}</Eyebrow>
            <SectionTitle>{started?.title}</SectionTitle>
            <Lede>{started?.body?.[0]}</Lede>
            <div className={styles.graphInstall}>
              <Snippet code={GRAPH_INSTALL} label="Install" language="sh" />
            </div>
            <helix-flex class="siteActions" data-density="lg">
              <Link data-button="solid" data-button-tone="primary" href="/helix/docs/graphs">
                Read the Graphs guide
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
          <ol className={styles.graphStack}>
            {GRAPH_STACK.map((layer) => (
              <li
                className={styles.graphLayer}
                data-owned={layer.owner ? 'false' : 'true'}
                key={layer.title}
              >
                <helix-flex direction="column" gap="xs">
                  <Eyebrow>{layer.role}</Eyebrow>
                  <Claim>{layer.title}</Claim>
                </helix-flex>
                <helix-text emphasis="muted">{layer.body}</helix-text>
                <helix-tag
                  class={styles.graphLayerStage}
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
