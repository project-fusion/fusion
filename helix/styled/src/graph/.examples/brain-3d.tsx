import type { HelixGraph } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'

const regions = [
  { name: 'Memory', note: 'Recollection' },
  { name: 'Language', note: 'Word' },
  { name: 'Vision', note: 'Image' },
  { name: 'Movement', note: 'Motion' },
  { name: 'Planning', note: 'Plan' },
  { name: 'Feeling', note: 'Feeling' },
  { name: 'Hearing', note: 'Sound' },
  { name: 'Balance', note: 'Posture' },
]

/* The same mind on every load. */
let seed = 11
const random = (): number => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = <T,>(list: T[]): T => list[Math.floor(random() * list.length)] as T

/* Notes in each region, a few centers most of them link to, and links
   between regions now and then. */
const nodes: { group: string; id: string; label: string; shape?: 'square' }[] = []
const links: { source: string; target: string }[] = []
for (const { name, note } of regions) {
  const centers = Array.from({ length: 6 }, (_, at) => `${name} center ${at + 1}`)
  for (const id of centers) {
    nodes.push({ group: name, id, label: id, shape: 'square' })
  }
  for (let at = 1; at <= 1000 - centers.length; at++) {
    const id = `${note} ${at}`
    nodes.push({ group: name, id, label: id })
    links.push({ source: id, target: pick(centers) })
    if (random() < 0.4) {
      links.push({ source: id, target: `${note} ${1 + Math.floor(random() * at)}` })
    }
    if (random() < 0.03) {
      links.push({
        source: id,
        target: `${pick(regions).name} center ${1 + Math.floor(random() * 6)}`,
      })
    }
  }
}

export function Example() {
  const mind = useRef<HelixGraph>(null)

  /* Thoughts passing along the links, fifteen a second. */
  useEffect(() => {
    const thinking = setInterval(() => {
      const link = pick(links)
      mind.current?.signal(link.source, link.target)
    }, 66)
    return () => clearInterval(thinking)
  }, [])

  return (
    <>
      {/* Preview frame: data-preview-graph="three" has the frame connect three.js, and data-preview-graph-model names the model the notes are drawn on, and data-preview-graph-regions sends each region of the mind to a lobe of the brain; on your page, in a module script, connectGraph(frame, threeDriver(box), { stencil: { ...(await shapeFromModel(url)), place: 'surface', regions: { Vision: 'occipital' } } }) does. */}
      <helix-graph
        data-preview-graph="three"
        data-preview-graph-model="/media/models/brain.glb"
        data-preview-graph-place="surface"
        data-preview-graph-regions="Planning: frontal, Movement: frontal, Language: frontal, Feeling: parietal, Hearing: temporal, Memory: temporal, Vision: occipital, Balance: cerebellum"
        label="A mind"
        links={links}
        nodes={nodes}
        ref={mind}
      >
        <div data-preview-graph-canvas></div>
      </helix-graph>
    </>
  )
}
