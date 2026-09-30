import { useState } from 'react'

// The grid spacing, so each card lands on a grid line.
const STEP = 32

// The nearest grid line, leaning the way the card moved, so a keyboard nudge of
// half a step reaches the next line in every direction.
const snap = (from: number, to: number) =>
  Math.round(to / STEP + Math.sign(to - from) * 0.01) * STEP

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
      label="Task board"
      onhelix-before-move={(event) => {
        // Cancel the move, then place each card on the nearest grid line.
        event.preventDefault()
        const moved = new Map(event.detail.nodes.map((one) => [one.name, one]))
        setCards((before) =>
          before.map((card) => {
            const to = moved.get(card.name)
            return to ? { ...card, x: snap(card.x, to.x), y: snap(card.y, to.y) } : card
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
