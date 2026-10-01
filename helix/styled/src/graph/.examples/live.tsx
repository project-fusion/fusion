/* Five subjects, each with the notes most of the rest link to. */
const subjects: Record<string, string[]> = {
  Finance: ['Budget', 'Forecast', 'Invoices'],
  People: ['Hiring plan', 'Onboarding', 'Team handbook'],
  Product: ['Roadmap', 'Release notes', 'Research'],
  Sales: ['Pricing', 'Sales playbook', 'Pipeline review'],
  Support: ['Support playbook', 'Escalations', 'Known issues'],
}

interface Note {
  group: string
  id: string
  label: string
  size?: number
}

/* The same graph on every load. */
const graph = () => {
  let seed = 7
  const random = (): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const pick = <T,>(list: T[]): T => list[Math.floor(random() * list.length)] as T

  const nodes: Note[] = []
  const links: { source: string; target: string }[] = []
  for (const [group, hubs] of Object.entries(subjects)) {
    for (const label of hubs) {
      nodes.push({ group, id: label, label, size: 4 })
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
  return { links, nodes }
}

const { links, nodes } = graph()

export function Example() {
  return (
    <>
      {/* Preview frame: data-preview-graph has the frame connect Sigma.js; on your page, connectGraph does. */}
      <helix-graph
        data-preview-graph
        label="Company notes"
        links={links}
        nodes={nodes}
      >
        <div data-preview-graph-canvas></div>
      </helix-graph>
    </>
  )
}
