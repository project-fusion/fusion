import { useState } from 'react'

// The ruling's own spacing, so a card lands on a line rather than between two.
const STEP = 32

const snap = (value: number) => Math.round(value / STEP) * STEP

type Card = { name: string; text: string; tone?: 'accent' | 'success'; x: number; y: number }

const START: Card[] = [
  { name: 'todo', text: 'To do', x: 0, y: 0 },
  { name: 'doing', text: 'Doing', tone: 'accent', x: 256, y: 0 },
  { name: 'done', text: 'Done', tone: 'success', x: 512, y: 0 },
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
        const moved = new Map(event.detail.nodes.map((one) => [one.name, one]))
        setCards((before) =>
          before.map((card) => {
            const to = moved.get(card.name)
            return to ? { ...card, x: snap(to.x), y: snap(to.y) } : card
          }),
        )
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
