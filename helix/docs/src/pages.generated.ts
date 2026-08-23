/**
 * Every page this package documents, derived from the frontmatter of each MDX
 * file by `bun run docs`. Do not edit: `bun run check:docs` fails when this
 * file and the content disagree, and the content is the source.
 */
import type { DocPage } from './registry.js'

export const docPages: DocPage[] = [
  {
    description: 'What the library guarantees, what it cannot, and where the line is.',
    section: 'Foundations',
    slug: 'accessibility',
    title: 'Accessibility',
  },
  {
    description: 'The schema Angular needs before it will compile an unknown tag.',
    parent: 'installation',
    section: 'Getting started',
    slug: 'angular',
    title: 'Angular',
  },
  {
    description: 'The platform features this is built on, and what is actually tested.',
    order: 4,
    section: 'Getting started',
    slug: 'browser-support',
    title: 'Browser support',
  },
  {
    description: 'Families, parts and groups, and which to reach for.',
    section: 'Essentials',
    slug: 'composition',
    title: 'Composition',
  },
  {
    description: 'Real form participation, labels that resolve across a shadow root, and the disabled trap.',
    section: 'Essentials',
    slug: 'forms',
    title: 'Forms and validation',
  },
  {
    description: 'What to install, the order the stylesheets go in, and how to check it worked.',
    order: 3,
    section: 'Getting started',
    slug: 'installation',
    title: 'Installation',
  },
  {
    description: 'What Helix is, and the five tiers it ships as.',
    order: 1,
    section: 'Getting started',
    slug: 'introduction',
    title: 'Introduction',
  },
  {
    description: 'The three rules every framework reduces to, and what they look like in each.',
    parent: 'installation',
    section: 'Getting started',
    slug: 'other-frameworks',
    title: 'Other frameworks',
  },
  {
    description: 'The three ways in past a shadow root, and which one to reach for.',
    section: 'Theming',
    slug: 'overriding-a-component',
    title: 'Overriding a component',
  },
  {
    description: 'The typings, the hydration bridge, and the controlled-property constraint.',
    parent: 'installation',
    section: 'Getting started',
    slug: 'react',
    title: 'React',
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
    description: 'Why writing a property hands the element to you, and what to write instead.',
    section: 'Essentials',
    slug: 'state-and-control',
    title: 'State and control',
  },
  {
    description: 'Typed tags, and the framework that needs the least said about it.',
    parent: 'installation',
    section: 'Getting started',
    slug: 'svelte',
    title: 'Svelte',
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
  {
    description: 'The one compiler setting Vue needs, and why props and events already work.',
    parent: 'installation',
    section: 'Getting started',
    slug: 'vue',
    title: 'Vue',
  },
  {
    description: 'A page that uses Helix with no build step, and what that costs.',
    parent: 'installation',
    section: 'Getting started',
    slug: 'without-a-bundler',
    title: 'Without a bundler',
  },
]
