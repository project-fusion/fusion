import type { PageCopy } from '@/content/copy/copy'
import type { MapFeature, MapLayer, MapPillar } from '@/content/maps/maps'

/**
 * The parts of Helix Graph, from the element you write to the renderer, each
 * at its real stage. The renderer is listed as Sigma.js's, cosmos.gl's, or
 * three.js's, since Helix does not draw the graph.
 */
export const GRAPH_STACK: readonly MapLayer[] = [
  {
    body: 'The box around the drawing: a searchable list of notes, zoom and pan buttons, and keyboard controls.',
    role: 'Interface',
    stage: 'Building',
    title: 'The frame',
  },
  {
    body: 'Draws your notes and links with the renderer, colored by your theme. Redraws only what changed.',
    role: 'Integration',
    stage: 'Building',
    title: 'The connector',
  },
  {
    body: 'Places notes in a 3D model, an SVG, an image, or a solid.',
    role: 'Layout',
    stage: 'Building',
    title: 'Shapes',
  },
  {
    body: 'Draws the graph. Use Sigma.js, cosmos.gl, three.js, or your own driver.',
    owner: 'Sigma.js, cosmos.gl, or three.js',
    role: 'Rendering',
    title: 'The renderer',
  },
]

/** What Helix adds to a graph, in three parts. */
export const GRAPH_PILLARS: readonly MapPillar[] = [
  {
    claim: 'Colored by your theme.',
    facts: [
      'A color for each group.',
      'Light and dark from one theme.',
      'Labels in your typeface.',
      'Tones for meaning, such as danger.',
    ],
    name: 'Your brand',
  },
  {
    claim: 'Every note in a searchable list.',
    facts: [
      'Search notes by name.',
      'Select in the list or the drawing.',
      'See the selected note’s links first.',
      'Zoom and pan with buttons or keys.',
    ],
    name: 'The frame',
  },
  {
    claim: 'Sigma.js, cosmos.gl, or three.js.',
    facts: [
      'Sigma.js for thousands of notes.',
      'cosmos.gl for tens of thousands.',
      'three.js for 3D and models.',
      'Any other with a small driver.',
    ],
    name: 'Your renderer',
  },
]

/** What a graph can show, each with what you write for it. */
export const GRAPH_FEATURES: readonly MapFeature[] = [
  {
    body: 'Circles, squares, diamonds, or rings. Filled, outlined, or glass. A tone colors a note by meaning.',
    elements: ['shape', 'emphasis', 'material', 'tone'],
    title: 'Note styles',
  },
  {
    body: 'A comet along a link for each message, request, or payment.',
    elements: ['frame.signal(from, to)'],
    title: 'Signals',
  },
  {
    body: 'New notes grow in beside their neighbors. The rest hold still.',
    elements: ['frame.nodes', 'frame.links'],
    title: 'Live updates',
  },
  {
    body: 'Show only the notes near the selected one.',
    elements: ['<helix-graph depth="2">'],
    title: 'A local graph',
  },
]

/** The shapes a graph can take, each with the function that makes it. */
export const GRAPH_SHAPES: readonly MapFeature[] = [
  {
    body: 'Notes on any glTF model. Send each group to a named part.',
    elements: ['shapeFromModel(url)'],
    title: '3D models',
  },
  {
    body: 'Notes inside a logo, an outline, or a map. Send each group to a named shape.',
    elements: ['shapeFromSvg(svg)', 'shapeFromImage(image)'],
    title: 'SVGs and images',
  },
  {
    body: 'Puff an outline into a solid, or wrap a map around a globe.',
    elements: ['inflate(field, { depth })', 'onSphere(field)'],
    title: 'Flat shapes in 3D',
  },
  {
    body: 'Spheres, rings, and rounded boxes.',
    elements: ['sphere()', 'torus()', 'cuboid()'],
    title: 'Solids',
  },
]

/** The one command that installs a graph drawn by Sigma.js, shown on the page with a link to the reference. */
export const GRAPH_INSTALL =
  'bun add @fusion.dev/helix @fusion.dev/helix-graph sigma graphology graphology-layout-forceatlas2'

/**
 * The Graph page's words, which the page renders and its document serves.
 */
export const GRAPH: PageCopy = {
  blocks: [
    {
      body: [
        'Knowledge graphs, service maps, and live networks in 2D or 3D, styled with your theme.',
      ],
      kicker: 'Helix Graph',
      title: 'Interactive graphs in your brand’s colors',
    },
    {
      items: GRAPH_PILLARS.map((pillar) => ({
        body: `${pillar.claim} ${pillar.facts.join(' ')}`,
        name: pillar.name,
      })),
      kicker: 'Why Helix',
      title: 'What Helix adds',
    },
    {
      body: ['New notes arrive and messages travel the links, drawn by Sigma.js.'],
      kicker: 'Live data',
      title: 'Updates as your data changes',
    },
    {
      body: ['Set each on a note or on the frame.'],
      items: GRAPH_FEATURES.map((feature) => ({ body: feature.body, name: feature.title })),
      kicker: 'Features',
      title: 'Styles, signals, and live updates',
    },
    {
      body: ['Three thousand services on a knot, drawn by three.js. Drag to turn it.'],
      kicker: '3D',
      title: 'Graphs on 3D models',
    },
    {
      body: ['Notes take the shape from the first frame, with no layout to wait for.'],
      items: GRAPH_SHAPES.map((shape) => ({ body: shape.body, name: shape.title })),
      kicker: 'Shapes',
      title: 'Models, outlines, and solids',
    },
    {
      body: ['Laid out and drawn on the GPU by cosmos.gl.'],
      kicker: 'Scale',
      title: 'Twenty thousand notes',
    },
    {
      body: [
        'Install Helix, the connector, and a renderer. The Graphs guide covers the rest.',
        `\`${GRAPH_INSTALL}\``,
      ],
      kicker: 'Get started',
      title: 'Add a graph to your site',
    },
    {
      body: ['Four parts, from the element you write to the renderer.'],
      items: GRAPH_STACK.map((layer) => ({
        body: `${layer.stage ?? layer.owner}. ${layer.body}`,
        name: layer.title,
      })),
      kicker: 'Under the hood',
      title: 'How it is built',
    },
  ],
  lede: 'Interactive graphs styled with your theme, in 2D, in 3D, and on 3D models. Drawn by Sigma.js, cosmos.gl, or three.js.',
  source: 'rendered by the page, which reads this module',
  title: 'Graph',
}

/** What a graph on the page says when its renderer could not load. */
export const GRAPH_FAILED = 'The graph could not load. Reload the page to try again.'
