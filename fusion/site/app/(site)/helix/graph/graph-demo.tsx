'use client'

import type { HelixGraph } from '@fusion.dev/helix'
import type { GraphConnection } from '@fusion.dev/helix-graph'
import { useEffect, useRef, useState } from 'react'
import {
  type DemoGraph,
  knowledge,
  MIND_LOBES,
  mind,
  seeded,
  services,
  team,
} from '@/content/graph/demos'
import { GRAPH_FAILED } from '@/content/graph/graph'
import styles from './graph.module.css'

/** Which of the page's graphs to draw. */
export type DemoKind = 'knowledge' | 'mind' | 'services' | 'team'

/** The model a kind is drawn on, where it is drawn on one. */
const MODELS: Partial<Record<DemoKind, string>> = {
  mind: '/media/models/brain.glb',
  services: '/media/models/torus-knot.glb',
}

/** The frame each kind draws in: its name, and how much of a screen it takes. */
const FRAMES: Record<DemoKind, { label: string }> = {
  knowledge: { label: 'Company knowledge base, 20,000 notes' },
  mind: { label: 'A mind, 8,000 notes on a model of a brain' },
  services: { label: 'Services, 3,000 on a knot' },
  team: { label: 'A team’s notes' },
}

/**
 * Connects a frame to its renderer and starts its traffic, and says how to
 * stop both. Each renderer is imported here, when its graph is near the
 * screen, so the page loads none it does not draw.
 */
const start = async (
  kind: DemoKind,
  frame: HelixGraph,
  box: HTMLDivElement,
  paused: () => boolean,
): Promise<() => void> => {
  /* **The model asked for first**, so it downloads while the renderer's code
     does: asked for once three.js had loaded, it waited on all of it. */
  const model = MODELS[kind]
  const bytes = model
    ? fetch(model).then((answer) => {
        if (!answer.ok) {
          throw new Error(`The model ${model} could not be fetched: ${answer.status}`)
        }
        return answer.arrayBuffer()
      })
    : undefined
  const { connectGraph } = await import('@fusion.dev/helix-graph')
  const graph: DemoGraph =
    kind === 'mind'
      ? mind()
      : kind === 'services'
        ? services()
        : kind === 'knowledge'
          ? knowledge()
          : team()
  frame.nodes = graph.nodes
  frame.links = graph.links
  const { pick, random } = seeded(kind.length)
  /* Messages along the links, as often as each graph's story says. */
  const every = kind === 'team' ? 500 : kind === 'mind' ? 66 : 100
  const send = (): void => {
    const link = pick(frame.links)
    if (!link || paused()) {
      return
    }
    if (kind === 'mind') {
      frame.signal(link.source, link.target)
    } else if (kind === 'team') {
      frame.signal(link.source, link.target, { tone: random() < 0.1 ? 'danger' : 'primary' })
    } else {
      frame.signal(link.source, link.target, random() < 0.05 ? { tone: 'danger' } : {})
    }
  }
  const stops: (() => void)[] = []
  let connection: GraphConnection
  if (kind === 'team') {
    const [
      { default: Graph },
      { default: Sigma },
      { sigmaDriver },
      { default: FA2Layout },
      { default: forceAtlas2 },
    ] = await Promise.all([
      import('graphology'),
      import('sigma'),
      import('@fusion.dev/helix-graph/sigma'),
      import('graphology-layout-forceatlas2/worker'),
      import('graphology-layout-forceatlas2'),
    ])
    const sigma = new Sigma(new Graph(), box, { allowInvalidContainer: true })
    connection = connectGraph(
      frame,
      sigmaDriver(sigma, {
        layout: (drawn) => new FA2Layout(drawn, { settings: forceAtlas2.inferSettings(drawn) }),
        material: 'glass',
      }),
    )
    stops.push(() => sigma.kill())
    /* A call note every few seconds, twelve in all, linked to its subject. */
    const calls = (graph as ReturnType<typeof team>).calls(12)
    let arrived = 0
    const arriving = setInterval(() => {
      const call = calls[arrived]
      arrived += 1
      if (!call || arrived > calls.length) {
        clearInterval(arriving)
        return
      }
      frame.nodes = [...frame.nodes, call.node]
      frame.links = [...frame.links, call.link]
    }, 3000)
    stops.push(() => clearInterval(arriving))
  } else if (kind === 'knowledge') {
    const [{ Graph }, { cosmosDriver }, { luma }, { webgl2Adapter }] = await Promise.all([
      import('@cosmos.gl/graph'),
      import('@fusion.dev/helix-graph/cosmos'),
      import('@luma.gl/core'),
      import('@luma.gl/webgl'),
    ])
    /* The GPU device made here and handed over once its canvas is measured,
       so cosmos.gl starts outside a resize callback, as the graph package's README
       shows. */
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'width:100%;height:100%'
    box.append(canvas)
    const device = luma
      .createDevice({
        adapters: [webgl2Adapter],
        createCanvasContext: { autoResize: true, canvas, useDevicePixels: true },
        type: 'webgl',
        webgl: { antialias: false },
      })
      .then(async (made) => {
        await made.canvasContext?.initialized
        await new Promise((done) => requestAnimationFrame(done))
        return made
      })
    const drawn = new Graph(
      box,
      {
        attribution: '',
        enableSimulation: true,
        renderHoveredPointRing: true,
        scalePointsOnZoom: false,
      },
      device,
    )
    connection = connectGraph(frame, cosmosDriver(drawn, box))
    stops.push(() => {
      drawn.destroy()
      void device.then((made) => made.destroy())
    })
  } else {
    const [{ threeDriver }, { shapeFromModel }] = await Promise.all([
      import('@fusion.dev/helix-graph/three'),
      import('@fusion.dev/helix-graph/model'),
    ])
    const field = await shapeFromModel((await bytes) as ArrayBuffer)
    connection = connectGraph(frame, threeDriver(box), {
      stencil: {
        ...field,
        place: 'surface',
        ...(kind === 'mind' ? { regions: MIND_LOBES } : {}),
      },
    })
  }
  const sending = setInterval(send, every)
  return () => {
    clearInterval(sending)
    connection.disconnect()
    for (const stop of stops) {
      stop()
    }
  }
}

/**
 * One of the page's live graphs: a Graph frame, connected to its renderer
 * once it is near the screen and disconnected when the page leaves.
 */
export function GraphDemo({
  canvasClassName,
  className,
  kind,
  legend = false,
  noPanel = false,
  paused = false,
  poster,
}: {
  /** A class for the box the renderer draws in, as the hero gives it to keep its drawing clear of the words. */
  canvasClassName?: string
  className?: string
  kind: DemoKind
  /** Whether the frame names the groups over the drawing, each a button that shows or hides its notes. */
  legend?: boolean
  /** Whether the frame leaves its search and list out, behind a button among its controls. */
  noPanel?: boolean
  /**
   * Pictures of the graph as it is first drawn, one for each mode, shown in
   * its place until it is drawn, so the box is never empty while its renderer
   * and its model load.
   */
  poster?: { dark: string; light: string } | undefined
  /** Whether its messages are held, which a control on the page decides; read as each is sent, so pausing does not remake the graph. */
  paused?: boolean
}) {
  const frame = useRef<HelixGraph>(null)
  const box = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  /* Whether the graph has been drawn, after which the pictures fade out. */
  const [drawn, setDrawn] = useState(false)
  const holding = useRef(paused)
  holding.current = paused

  useEffect(() => {
    const host = frame.current
    const drawing = box.current
    if (!host || !drawing) {
      return
    }
    let live = true
    let stop = (): void => undefined
    const ready = (): void => setDrawn(true)
    host.addEventListener('helix-graph-ready', ready)
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return
        }
        near.disconnect()
        customElements
          .whenDefined('helix-graph')
          .then(() => start(kind, host, drawing, () => holding.current))
          .then((stopping) => {
            if (live) {
              stop = stopping
            } else {
              stopping()
            }
          })
          .catch((error: unknown) => {
            console.error(error)
            if (live) {
              setFailed(true)
            }
          })
      },
      { rootMargin: '400px' },
    )
    near.observe(drawing)
    return () => {
      live = false
      host.removeEventListener('helix-graph-ready', ready)
      near.disconnect()
      stop()
    }
  }, [kind])

  return (
    <helix-graph
      class={className}
      /* A plain wheel scrolls the page past the graph, and a pinch or a
         wheel with Control or Command zooms it, as on a page this long the
         graph is passed on the way to the rest. */
      gestures="cooperative"
      label={FRAMES[kind].label}
      legend={legend}
      no-panel={noPanel}
      ref={frame}
    >
      <div className={`${styles.graphCanvas} ${canvasClassName ?? ''}`} ref={box}>
        {/* **The graph as it is first drawn**, under the renderer's canvas,
            until the graph is drawn over it, and then faded out. Said to no
            one: the frame's list names every note. **A background, not an
            image**: a hidden image still downloads, and a hidden background
            does not, so a reader fetches the picture for their mode alone. */}
        {poster
          ? (['light', 'dark'] as const).map((mode) => (
              <div
                aria-hidden="true"
                className={`${styles.graphPoster} ${mode === 'dark' ? styles.graphPosterDark : styles.graphPosterLight}`}
                data-drawn={drawn ? '' : undefined}
                data-graph-poster=""
                key={mode}
                style={{ backgroundImage: `url("${poster[mode]}")` }}
              />
            ))
          : null}
      </div>
      {failed ? (
        <helix-text slot="footer" variant="caption">
          {GRAPH_FAILED}
        </helix-text>
      ) : null}
    </helix-graph>
  )
}
