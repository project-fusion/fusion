import type { HelixGraph } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'

const subjects = [
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

/* The same graph on every load. */
let seed = 7
const random = (): number => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = <T,>(list: T[]): T => list[Math.floor(random() * list.length)] as T

/* Notes in each subject, a few hubs most of them link to, and links across
   subjects now and then. */
const nodes: { group: string; id: string; label: string; shape?: 'square' }[] = []
const links: { source: string; target: string }[] = []
/* Twenty thousand in all, shared as evenly as the subjects allow. */
for (const [place, group] of subjects.entries()) {
  const each =
    Math.floor((20000 * (place + 1)) / subjects.length) -
    Math.floor((20000 * place) / subjects.length)
  const hubs = Array.from({ length: 8 }, (_, at) => `${group} hub ${at + 1}`)
  for (const id of hubs) {
    nodes.push({ group, id, label: id, shape: 'square' })
  }
  for (let at = 1; at <= each - hubs.length; at++) {
    const id = `${group} note ${at}`
    nodes.push({ group, id, label: id })
    links.push({ source: id, target: pick(hubs) })
    if (random() < 0.4) {
      links.push({ source: id, target: `${group} note ${1 + Math.floor(random() * at)}` })
    }
    if (random() < 0.02) {
      links.push({ source: id, target: `${pick(subjects)} hub ${1 + Math.floor(random() * 8)}` })
    }
  }
}

export function Example() {
  const knowledge = useRef<HelixGraph>(null)

  /* Messages passing along the links, ten a second. */
  useEffect(() => {
    const sending = setInterval(() => {
      const link = pick(links)
      knowledge.current?.signal(link.source, link.target, {
        tone: random() < 0.05 ? 'danger' : undefined,
      })
    }, 100)
    return () => clearInterval(sending)
  }, [])

  return (
    <>
      {/* Preview frame: data-preview-graph="cosmos" has the frame connect cosmos.gl; on your page, connectGraph(frame, cosmosDriver(new Graph(box, { enableSimulation: true }), box)) does, the box being the div inside the frame. */}
      <helix-graph
        data-preview-graph="cosmos"
        label="Company knowledge base"
        links={links}
        nodes={nodes}
        ref={knowledge}
      >
        <div data-preview-graph-canvas></div>
      </helix-graph>
    </>
  )
}
