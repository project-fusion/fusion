import type { HelixGraph } from '@fusion.dev/helix'
import { useEffect, useRef, useState } from 'react'

/* Five subjects, each with the notes most of the rest link to. */
const subjects: Record<string, string[]> = {
  Finance: ['Budget', 'Forecast', 'Invoices'],
  People: ['Hiring plan', 'Onboarding', 'Team handbook'],
  Product: ['Roadmap', 'Release notes', 'Research'],
  Sales: ['Pricing', 'Sales playbook', 'Pipeline review'],
  Support: ['Support playbook', 'Escalations', 'Known issues'],
}

interface Note {
  emphasis?: 'outlined'
  group: string
  id: string
  label: string
  shape?: 'diamond' | 'square'
  size?: number
  tone?: 'danger' | 'warning' | undefined
}

/* What a few of them mean, which colors them over their subject. */
const tones: Record<string, Note['tone']> = { Escalations: 'warning', 'Known issues': 'danger' }

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
      nodes.push({ group, id: label, label, shape: 'square', tone: tones[label] })
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

const start = graph()

/* The same choices on every load, for what happens after it. */
let seed = 11
const random = (): number => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = <T,>(list: T[]): T => list[Math.floor(random() * list.length)] as T

export function Example() {
  const frame = useRef<HelixGraph>(null)
  const [nodes, setNodes] = useState<Note[]>(start.nodes)
  const [links, setLinks] = useState(start.links)

  /* Messages passing along the links, twice a second, a few of them problems. */
  useEffect(() => {
    const sending = setInterval(() => {
      const link = pick(start.links)
      frame.current?.signal(link.source, link.target, {
        tone: random() < 0.1 ? 'danger' : 'primary',
      })
    }, 500)
    return () => clearInterval(sending)
  }, [])

  /* A new call note every few seconds, linked to its subject. A new array is
     all the frame needs: only the new note is drawn and laid out. */
  useEffect(() => {
    let calls = 0
    const arriving = setInterval(() => {
      calls += 1
      const [group, hubs] = pick(Object.entries(subjects))
      const id = `Call ${calls}`
      setNodes((all) => [...all, { emphasis: 'outlined', group, id, label: id, shape: 'diamond' }])
      setLinks((all) => [...all, { source: id, target: pick(hubs) }])
      if (calls === 12) {
        clearInterval(arriving)
      }
    }, 3000)
    return () => clearInterval(arriving)
  }, [])

  return (
    <>
      {/* Preview frame: data-preview-graph has the frame connect Sigma.js, in glass; on your page, connectGraph does. */}
      <helix-graph
        data-preview-graph
        data-preview-graph-material="glass"
        label="Company notes"
        links={links}
        nodes={nodes}
        ref={frame}
      >
        <div data-preview-graph-canvas></div>
      </helix-graph>
    </>
  )
}
