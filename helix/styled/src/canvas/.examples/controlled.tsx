import { useState } from 'react'

// The ruling's own spacing, so a card lands on a line rather than between two.
const STEP = 32

const snap = (value: number) => Math.round(value / STEP) * STEP

const START = [
  { color: undefined, id: 'todo', text: 'To do', x: 0, y: 0 },
  { color: '3', id: 'doing', text: 'Doing', x: 256, y: 0 },
  { color: '4', id: 'done', text: 'Done', x: 512, y: 0 },
]

export function Example() {
  const [cards, setCards] = useState(START)

  return (
    <helix-canvas
      grid="lines"
      label="This sprint"
      onhelix-before-move={(event) => {
        // Refused, so nothing moves on its own; the state decides where each card goes.
        event.preventDefault()
        const moved = new Map(event.detail.nodes.map((one) => [one.id, one]))
        setCards((before) =>
          before.map((card) => {
            const to = moved.get(card.id)
            return to ? { ...card, x: snap(to.x), y: snap(to.y) } : card
          }),
        )
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

      <helix-canvas-edge
        from="todo"
        to="doing"
      ></helix-canvas-edge>

      <helix-canvas-edge
        from="doing"
        to="done"
      ></helix-canvas-edge>
    </helix-canvas>
  )
}
