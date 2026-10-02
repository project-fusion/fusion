import type { HelixGraph } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'

const teams = ['Accounts', 'Billing', 'Catalog', 'Delivery', 'Identity', 'Search']

/* The same services on every load. */
let seed = 3
const random = (): number => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = <T,>(list: T[]): T => list[Math.floor(random() * list.length)] as T

/* Each team's services, a few gateways most of them answer to, and calls to
   other teams' gateways now and then. */
const nodes: { group: string; id: string; label: string; shape?: 'square' }[] = []
const links: { source: string; target: string }[] = []
for (const team of teams) {
  const gateways = Array.from({ length: 5 }, (_, at) => `${team} gateway ${at + 1}`)
  for (const id of gateways) {
    nodes.push({ group: team, id, label: id, shape: 'square' })
  }
  for (let at = 1; at <= 500 - gateways.length; at++) {
    const id = `${team} service ${at}`
    nodes.push({ group: team, id, label: id })
    links.push({ source: id, target: pick(gateways) })
    if (random() < 0.3) {
      links.push({ source: id, target: `${team} service ${1 + Math.floor(random() * at)}` })
    }
    if (random() < 0.03) {
      links.push({ source: id, target: `${pick(teams)} gateway ${1 + Math.floor(random() * 5)}` })
    }
  }
}

export function Example() {
  const services = useRef<HelixGraph>(null)

  /* Requests passing along the calls, ten a second, a few of them failing. */
  useEffect(() => {
    const sending = setInterval(() => {
      const link = pick(links)
      services.current?.signal(link.source, link.target, {
        tone: random() < 0.05 ? 'danger' : undefined,
      })
    }, 100)
    return () => clearInterval(sending)
  }, [])

  return (
    <>
      {/* Preview frame: data-preview-graph="three" has the frame connect three.js, and data-preview-graph-model names the model the notes are drawn on; on your page, connectGraph(frame, threeDriver(box), { stencil: { ...(await shapeFromModel(url)), place: 'surface' } }) does. */}
      <helix-graph
        data-preview-graph="three"
        data-preview-graph-model="/media/models/torus-knot.glb"
        data-preview-graph-place="surface"
        label="Services"
        links={links}
        nodes={nodes}
        ref={services}
      >
        <div data-preview-graph-canvas></div>
      </helix-graph>
    </>
  )
}
