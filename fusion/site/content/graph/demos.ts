/**
 * The graphs the Graph page draws, the same as the Graph component's
 * examples draw: made from a seed, so each is the same graph on every load.
 */

/** A note as the page gives one to the frame. */
export interface DemoNode {
  group: string
  id: string
  label: string
  shape?: 'diamond' | 'square'
  emphasis?: 'outlined'
  tone?: 'danger' | 'warning'
}

/** A link as the page gives one to the frame. */
export interface DemoLink {
  source: string
  target: string
}

/** A graph to draw. */
export interface DemoGraph {
  links: DemoLink[]
  nodes: DemoNode[]
}

/** A small random number generator, so a graph is the same on every load. */
export const seeded = (start: number) => {
  let seed = start
  const random = (): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)] as T
  return { pick, random }
}

/**
 * Groups of notes, each with a few hubs most of its notes link to, links
 * between its own notes now and then, and links to other groups' hubs
 * rarely. The shape every one of the page's large graphs takes.
 */
const clustered = ({
  across,
  each,
  groups,
  hub,
  hubs,
  seed,
  within,
}: {
  /** How often a note links to another group's hub, from 0 to 1. */
  across: number
  /** How many notes each group has, its hubs among them, by the group's place in the list. */
  each: (place: number) => number
  groups: readonly { name: string; note: string }[]
  /** What a hub is called after its group's name, as `center`. */
  hub: string
  hubs: number
  seed: number
  /** How often a note links to an earlier note in its group, from 0 to 1. */
  within: number
}): DemoGraph => {
  const { pick, random } = seeded(seed)
  const nodes: DemoNode[] = []
  const links: DemoLink[] = []
  groups.forEach(({ name, note }, place) => {
    const centers = Array.from({ length: hubs }, (_, at) => `${name} ${hub} ${at + 1}`)
    for (const id of centers) {
      nodes.push({ group: name, id, label: id, shape: 'square' })
    }
    for (let at = 1; at <= each(place) - hubs; at++) {
      const id = `${note} ${at}`
      nodes.push({ group: name, id, label: id })
      links.push({ source: id, target: pick(centers) })
      if (random() < within) {
        links.push({ source: id, target: `${note} ${1 + Math.floor(random() * at)}` })
      }
      if (random() < across) {
        links.push({
          source: id,
          target: `${pick(groups).name} ${hub} ${1 + Math.floor(random() * hubs)}`,
        })
      }
    }
  })
  return { links, nodes }
}

/** The regions of a mind and the word each region's notes are named with. */
const MIND = [
  { name: 'Memory', note: 'Recollection' },
  { name: 'Language', note: 'Word' },
  { name: 'Vision', note: 'Image' },
  { name: 'Movement', note: 'Motion' },
  { name: 'Planning', note: 'Plan' },
  { name: 'Feeling', note: 'Feeling' },
  { name: 'Hearing', note: 'Sound' },
  { name: 'Balance', note: 'Posture' },
]

/** Eight thousand notes in eight regions of a mind, for the brain the hero draws them on. */
export const mind = (): DemoGraph =>
  clustered({
    across: 0.03,
    each: () => 1000,
    groups: MIND,
    hub: 'center',
    hubs: 6,
    seed: 11,
    within: 0.4,
  })

/** The lobe of the brain model each region of the mind is drawn on. */
export const MIND_LOBES: Readonly<Record<string, string>> = {
  Balance: 'cerebellum',
  Feeling: 'parietal',
  Hearing: 'temporal',
  Language: 'frontal',
  Memory: 'temporal',
  Movement: 'frontal',
  Planning: 'frontal',
  Vision: 'occipital',
}

/** Three thousand services in six teams, for the knot. */
export const services = (): DemoGraph =>
  clustered({
    across: 0.03,
    each: () => 500,
    groups: ['Accounts', 'Billing', 'Catalog', 'Delivery', 'Identity', 'Search'].map((team) => ({
      name: team,
      note: `${team} service`,
    })),
    hub: 'gateway',
    hubs: 5,
    seed: 3,
    within: 0.3,
  })

/** The twelve subjects of a company's knowledge base. */
const SUBJECTS = [
  'Sales',
  'Product',
  'People',
  'Finance',
  'Support',
  'Legal',
  'Marketing',
  'Research',
  'Design',
  'Operations',
  'Security',
  'Partners',
]

/** Twenty thousand notes in twelve subjects, shared as evenly as twelve allow, for cosmos.gl. */
export const knowledge = (): DemoGraph =>
  clustered({
    across: 0.02,
    each: (place) =>
      Math.floor((20000 * (place + 1)) / SUBJECTS.length) -
      Math.floor((20000 * place) / SUBJECTS.length),
    groups: SUBJECTS.map((subject) => ({ name: subject, note: `${subject} note` })),
    hub: 'hub',
    hubs: 8,
    seed: 7,
    within: 0.4,
  })

/** Five subjects of a team's notes, each with the notes most of the rest link to. */
const TEAM: Readonly<Record<string, readonly string[]>> = {
  Finance: ['Budget', 'Forecast', 'Invoices'],
  People: ['Hiring plan', 'Onboarding', 'Team handbook'],
  Product: ['Roadmap', 'Release notes', 'Research'],
  Sales: ['Pricing', 'Sales playbook', 'Pipeline review'],
  Support: ['Support playbook', 'Escalations', 'Known issues'],
}

/** What a few of the team's notes mean, which colors them over their subject. */
const TONES: Readonly<Record<string, DemoNode['tone']>> = {
  Escalations: 'warning',
  'Known issues': 'danger',
}

/**
 * A team's notes, for Sigma.js, and the call notes that arrive while the
 * page is open: each call names its subject and the note it links to.
 */
export const team = (): DemoGraph & {
  calls: (count: number) => { link: DemoLink; node: DemoNode }[]
} => {
  const { pick, random } = seeded(7)
  const nodes: DemoNode[] = []
  const links: DemoLink[] = []
  for (const [group, hubs] of Object.entries(TEAM)) {
    for (const label of hubs) {
      const tone = TONES[label]
      nodes.push({ group, id: label, label, shape: 'square', ...(tone ? { tone } : {}) })
    }
    for (let at = 1; at <= 36; at++) {
      const id = `${group} note ${at}`
      nodes.push({ group, id, label: id })
      links.push({ source: id, target: pick(hubs) })
      if (random() < 0.5) {
        links.push({ source: id, target: `${group} note ${1 + Math.floor(random() * 36)}` })
      }
    }
  }
  /* A few notes that link one subject to another. */
  for (let at = 0; at < 24; at++) {
    links.push({ source: pick(nodes).id, target: pick(nodes).id })
  }
  links.push({ source: 'Pricing', target: 'Budget' }, { source: 'Roadmap', target: 'Hiring plan' })
  const calls = (count: number) =>
    Array.from({ length: count }, (_, at) => {
      const [group, hubs] = pick(Object.entries(TEAM)) as [string, readonly string[]]
      const id = `Call ${at + 1}`
      return {
        link: { source: id, target: pick(hubs) },
        node: { emphasis: 'outlined' as const, group, id, label: id, shape: 'diamond' as const },
      }
    })
  return { calls, links, nodes }
}
