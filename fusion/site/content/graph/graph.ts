import type { PageCopy } from '@/content/copy/copy'
import type { MapFeature, MapLayer, MapPillar } from '@/content/maps/maps'

/**
 * The parts of Helix Graph, from the element you write to the renderer, each
 * at its real stage. The renderer is listed as Sigma.js's, cosmos.gl's, or
 * three.js's, since Helix does not draw the graph.
 */
export const GRAPH_STACK: readonly MapLayer[] = [
  {
    body: 'The box around the drawing, with a searchable list of every note, zoom and pan buttons, and keyboard controls. The note you choose in the list is the note shown in the drawing.',
    role: 'Interface',
    stage: 'Building',
    title: 'The frame',
  },
  {
    body: 'Connects the frame to the renderer. It draws the notes and links you give the frame, colors them from your theme, and draws only what changed when you give it new ones.',
    role: 'Integration',
    stage: 'Building',
    title: 'The connector',
  },
  {
    body: 'Places the notes in a shape: a 3D model, an SVG, an image, or a solid such as a sphere. Each group of notes can go to a named part of the shape.',
    role: 'Layout',
    stage: 'Building',
    title: 'Shapes',
  },
  {
    body: 'Draws the graph. Use Sigma.js, cosmos.gl, three.js, or a driver you write for another renderer.',
    owner: 'Sigma.js, cosmos.gl, or three.js',
    role: 'Rendering',
    title: 'The renderer',
  },
]

/** What Helix adds to a graph, in three parts. */
export const GRAPH_PILLARS: readonly MapPillar[] = [
  {
    claim: 'Colored with your theme.',
    facts: [
      'Each group of notes takes a color from your theme.',
      'Light and dark graphs from the same theme.',
      'Names in your theme’s typeface.',
      'Notes take a tone, such as danger, for what they mean.',
    ],
    name: 'Your brand',
  },
  {
    claim: 'A list of every note beside the drawing.',
    facts: [
      'Search the notes by name.',
      'Choose a note in the list or in the drawing, and both show it.',
      'The chosen note’s links are listed first.',
      'Zoom and pan with the buttons or the keyboard.',
    ],
    name: 'The frame',
  },
  {
    claim: 'Drawn by Sigma.js, cosmos.gl, or three.js.',
    facts: [
      'Sigma.js for graphs of thousands of notes.',
      'cosmos.gl for graphs of tens of thousands, laid out on the GPU.',
      'three.js for graphs in 3D, and on the surface of a model.',
      'Connect another renderer by writing a small driver.',
    ],
    name: 'Your renderer',
  },
]

/** What a graph can show, each with what you write for it. */
export const GRAPH_FEATURES: readonly MapFeature[] = [
  {
    body: 'Each note can be a circle, a square, a diamond, or a ring, filled or outlined, and drawn as glass. A tone such as danger colors it for what it means.',
    elements: ['shape', 'emphasis', 'material', 'tone'],
    title: 'How a note looks',
  },
  {
    body: 'A comet travels along the link from one note to another, for a message, a request, or a payment. Send as many as your data has.',
    elements: ['frame.signal(from, to)'],
    title: 'Signals',
  },
  {
    body: 'Give the frame new notes and links as your data changes. New notes grow in beside their neighbors, and the rest stay where they are.',
    elements: ['frame.nodes', 'frame.links'],
    title: 'Live data',
  },
  {
    body: 'Show only the notes within a few links of the chosen one, for a graph too large to read at once.',
    elements: ['<helix-graph depth="2">'],
    title: 'A local graph',
  },
]

/** The shapes a graph can take, each with the function that makes it. */
export const GRAPH_SHAPES: readonly MapFeature[] = [
  {
    body: 'Notes on the surface of a glTF model, such as a brain or a product. Each mesh in the model is a part you can send a group of notes to.',
    elements: ['shapeFromModel(url)'],
    title: '3D models',
  },
  {
    body: 'Notes inside an outline, such as a logo or a country. Each shape in the SVG with an id is a part you can send a group of notes to.',
    elements: ['shapeFromSvg(svg)', 'shapeFromImage(image)'],
    title: 'SVGs and images',
  },
  {
    body: 'A flat outline puffed into a solid, or wrapped around a globe as a world map is.',
    elements: ['inflate(field, { depth })', 'onSphere(field)'],
    title: 'Flat shapes in 3D',
  },
  {
    body: 'Spheres, rings, and rounded boxes, measured exactly from their formulas.',
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
        'Draw knowledge graphs, service maps, and live networks with Sigma.js, cosmos.gl, or three.js, styled with your theme.',
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
      title: 'What Helix adds to a graph',
    },
    {
      body: [
        'A team’s notes, drawn by Sigma.js. A new call note arrives every few seconds, and messages pass along the links twice a second.',
      ],
      kicker: 'Live data',
      title: 'A graph that changes as your data does',
    },
    {
      body: ['Each is a field on a note or a call on the frame.'],
      items: GRAPH_FEATURES.map((feature) => ({ body: feature.body, name: feature.title })),
      kicker: 'What you can show',
      title: 'Note styles, signals, and live data',
    },
    {
      body: [
        'Three thousand services on the surface of a knot, each team a stretch of it, drawn by three.js. Drag to turn it, and requests pass between the services ten times a second.',
      ],
      kicker: 'Shapes',
      title: 'Notes on the surface of a 3D model',
    },
    {
      body: [
        'Give the connector a shape, and it places the notes in it from the first frame, with no layout to wait for.',
      ],
      items: GRAPH_SHAPES.map((shape) => ({ body: shape.body, name: shape.title })),
      kicker: 'Any shape',
      title: 'Models, outlines, and solids',
    },
    {
      body: [
        'Twenty thousand notes in twelve subjects, laid out and drawn on the GPU by cosmos.gl, with messages passing between them ten times a second.',
      ],
      kicker: 'Large graphs',
      title: 'Twenty thousand notes on one graph',
    },
    {
      body: [
        'Install Helix, the graph connector, and the renderer. The Graph reference shows how to connect the frame and choose a renderer.',
        `\`${GRAPH_INSTALL}\``,
      ],
      kicker: 'Get started',
      title: 'Add a graph to your site',
    },
    {
      body: ['The parts of Helix Graph, from the element you write to the renderer that draws it.'],
      items: GRAPH_STACK.map((layer) => ({
        body: `${layer.stage ?? layer.owner}. ${layer.body}`,
        name: layer.title,
      })),
      kicker: 'Under the hood',
      title: 'How it is built',
    },
  ],
  lede: 'Interactive graphs styled with your theme. Draw knowledge graphs, service maps, and live networks with Sigma.js, cosmos.gl, or three.js, in 2D, in 3D, and in the shape of a model.',
  source: 'rendered by the page, which reads this module',
  title: 'Graph',
}

/** What a graph on the page says when its renderer could not load. */
export const GRAPH_FAILED = 'The graph could not load. Reload the page to try again.'
