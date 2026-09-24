import { useRef, useState } from 'react'

type Card = { tone?: 'accent' | 'success'; name: string; text: string; x: number; y: number }
type Link = {
  from: string
  fromSide?: 'top' | 'right' | 'bottom' | 'left'
  name: string
  to: string
}

const CARDS: Card[] = [
  { name: 'post', text: 'Write the post', x: 0, y: 0 },
  { name: 'demo', text: 'Record a demo', tone: 'accent', x: 256, y: 0 },
  { name: 'ship', text: 'Ship it', tone: 'success', x: 128, y: 160 },
]

const LINKS: Link[] = [{ from: 'post', name: 'post-ship', to: 'ship' }]

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
        const name = `made-${made.current}`
        setLinks((before) => [
          ...before,
          fromSide ? { from, fromSide, name, to } : { from, name, to },
        ])
      }}
      onhelix-remove={(event) => {
        // The same for removal, which names every connection a removed card would strand.
        const nodes = new Set(event.detail.nodes)
        const edges = new Set(event.detail.edges.map((one) => one.name))
        setCards((before) => before.filter((card) => !nodes.has(card.name)))
        setLinks((before) => before.filter((link) => !edges.has(link.name)))
      }}
    >
      {cards.map((card) => (
        <helix-canvas-node
          height={64}
          key={card.name}
          name={card.name}
          tone={card.tone}
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
          key={link.name}
          name={link.name}
          to={link.to}
          to-side={link.toSide}
        ></helix-canvas-edge>
      ))}
    </helix-canvas>
  )
}
