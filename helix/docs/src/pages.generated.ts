/**
 * Every page this package documents, derived from the frontmatter of each MDX
 * file by `bun run docs`. Do not edit: `bun run check:docs` fails when this
 * file and the content disagree, and the content is the source.
 */
import type { DocPage } from './registry.js'

export const docPages: DocPage[] = [
  {
    description: 'Families, parts and groups, and which to reach for.',
    section: 'Essentials',
    slug: 'composition',
    title: 'Composition',
  },
  {
    description: 'What Helix is, and the five tiers it ships as.',
    order: 1,
    section: 'Getting started',
    slug: 'introduction',
    title: 'Introduction',
  },
  {
    description: 'Why a component renders its own anchor, and how to keep a router.',
    section: 'Essentials',
    slug: 'routing',
    title: 'Routing and navigation',
  },
  {
    description: 'What renders without a DOM, and what has to wait for one.',
    section: 'Essentials',
    slug: 'server-rendering',
    title: 'Server rendering',
  },
  {
    description: 'Why no control has a size, and what to write instead.',
    section: 'Theming',
    slug: 'size-and-density',
    title: 'Size and density',
  },
  {
    description: 'Deriving an accessible token set from intent inputs.',
    section: 'Theming',
    slug: 'theming',
    title: 'Deriving a theme',
  },
  {
    description: 'Why the headless and styled tiers are separate packages.',
    order: 2,
    section: 'Getting started',
    slug: 'tiers',
    title: 'Tiers',
  },
  {
    description: 'The two layers, the surface ladder, and what is enforced.',
    pinned: true,
    section: 'Theming',
    slug: 'tokens',
    title: 'Tokens',
  },
  {
    description: 'Binding events, registering elements, and the traps in both.',
    pinned: true,
    section: 'Essentials',
    slug: 'using-the-elements',
    title: 'Using the elements',
  },
]
