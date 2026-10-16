import { edgePrimitives } from './edge-program.js'
import { nodePrimitives } from './node-program.js'

/** What a reducer adds to a note's or a link's display data, by its key and its attributes. */
export type Reduce = (key: string, attributes: Record<string, unknown>) => Record<string, unknown>

/** The reducers a driver puts in place, which the renderer's own call through to. */
export interface Reducers {
  edge?: Reduce | undefined
  node?: Reduce | undefined
}

/**
 * Each renderer's reducers, by the node primitives it was made with. **Sigma 4
 * takes its programs and reducers only when it is made**, and hands its
 * primitives back from `getPrimitives()`, so the object made here is how the
 * driver finds the reducers of the renderer it is given.
 */
const made = new WeakMap<object, Reducers>()

/** The reducers of a renderer made with `sigmaOptions()`, or nothing for one made without. */
export const reducersOf = (sigma: { getPrimitives(): { nodes?: object | undefined } }) => {
  const nodes = sigma.getPrimitives().nodes
  return nodes ? made.get(nodes) : undefined
}

/** What `sigmaOptions` takes. */
export interface SigmaOptionsOverrides {
  /** Sigma's settings, over the ones Helix sets. */
  settings?: Record<string, unknown> | undefined
}

/**
 * The options to make a Sigma renderer with for `sigmaDriver`: Helix's
 * programs for the notes and the links, and the reducers the driver draws
 * them through.
 *
 * ```js
 * const sigma = new Sigma(new Graph(), box, sigmaOptions())
 * connectGraph(frame, sigmaDriver(sigma, { layout }))
 * ```
 *
 * **Sigma draws no names**: the driver names notes over the drawing, as it
 * names groups, so a name keeps clear of the frame's controls and of the
 * names beside it. `settings` are Sigma's own, over the ones set here.
 */
export const sigmaOptions = (overrides: SigmaOptionsOverrides = {}) => {
  const nodes = nodePrimitives()
  const reducers: Reducers = {}
  made.set(nodes, reducers)
  return {
    edgeReducer: (edge: string, _data: unknown, attributes: Record<string, unknown>) =>
      reducers.edge?.(edge, attributes) ?? {},
    nodeReducer: (node: string, _data: unknown, attributes: Record<string, unknown>) =>
      reducers.node?.(node, attributes) ?? {},
    primitives: { edges: edgePrimitives(), nodes },
    settings: {
      /* The view turns only where the frame turns it: Sigma 4 turns it under
         the mouse by default, which Sigma 3 did not. */
      enableCameraMouseRotation: false,
      /* **A note's size in pixels on screen**, as Sigma 3 drew it and
         `pixelsOf` reckons it. Sigma 4 measures sizes in the graph's own
         units by default, which drew every note twice as large. */
      itemSizesReference: 'screen',
      /* Fine lines, which a graph of thousands needs, and no finer than
         Sigma 3 drew them: it measured a link's width from its middle to
         one edge, and Sigma 4 from edge to edge. */
      minEdgeThickness: 1.6,
      renderEdgeLabels: false,
      renderLabels: false,
      ...overrides.settings,
    },
    /* Where each note is and how large, from its attributes. The rest of its
       look is the reducer's, which reads the frame's looks. */
    styles: {
      edges: { depth: 'edges', path: 'straight', size: { attribute: 'size' } },
      nodes: {
        depth: 'nodes',
        label: { attribute: 'label' },
        labelVisibility: 'hidden',
        size: { attribute: 'size' },
        x: { attribute: 'x' },
        y: { attribute: 'y' },
      },
    },
  } as const
}
