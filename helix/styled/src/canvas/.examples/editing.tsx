import { useRef, useState } from 'react'

type Card = { color?: string; id: string; text: string; x: number; y: number }
type Link = { from: string; fromSide?: 'top' | 'right' | 'bottom' | 'left'; id: string; to: string }

const CARDS: Card[] = [
  { id: 'post', text: 'Write the post', x: 0, y: 0 },
  { color: '3', id: 'demo', text: 'Record a demo', x: 256, y: 0 },
  { color: '4', id: 'ship', text: 'Ship it', x: 128, y: 160 },
]

const LINKS: Link[] = [{ from: 'post', id: 'post-ship', to: 'ship' }]

export function Example() {
  const [cards, setCards] = useState(CARDS)
  const [links, setLinks] = useState(LINKS)
  const made = useRef(0)

  return (
    <helix-canvas
      label="Ideas for the launch"
      onhelix-connect={(event) => {
        // Asked rather than done: the board never adds to what React renders, so state does.
        const { from, fromSide, to } = event.detail
        made.current += 1
        const id = `made-${made.current}`
        setLinks((before) => [...before, fromSide ? { from, fromSide, id, to } : { from, id, to }])
      }}
      onhelix-remove={(event) => {
        // The same for removal, which names every connection a removed card would strand.
        const nodes = new Set(event.detail.nodes)
        const edges = new Set(event.detail.edges.map((one) => one.id))
        setCards((before) => before.filter((card) => !nodes.has(card.id)))
        setLinks((before) => before.filter((link) => !edges.has(link.id)))
      }}
    >
      {cards.map((card) => (
        <helix-canvas-node
          color={card.color}
          height={64}
          id={card.id}
          key={card.id}
          width={160}
          x={card.x}
          y={card.y}
        >
          {card.text}
        </helix-canvas-node>
      ))}

      {links.map((link) => (
        <helix-canvas-edge
          from={link.from}
          from-side={link.fromSide}
          id={link.id}
          key={link.id}
          to={link.to}
        ></helix-canvas-edge>
      ))}
    </helix-canvas>
  )
}
