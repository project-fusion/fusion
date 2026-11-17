import { useState } from 'react'
import './preview.css'

const places = [
  [40, 40, 220, 120],
  [180, 90, 60, 150],
  [260, 30, 140, 60],
] as const

export function Example() {
  const [turn, setTurn] = useState(0)
  const [adaX, adaY, graceX, graceY] = places[turn] ?? places[0]

  // Stands in for a collaboration service reporting where each person points.
  const report = () => setTurn((before) => (before + 1) % places.length)

  return (
    <helix-flex
      align-items="start"
      direction="column"
      gap="md"
    >
      <div className="board">
        <helix-cursor
          name="Ada"
          series={1}
          x={adaX}
          y={adaY}
        ></helix-cursor>
        <helix-cursor
          name="Grace"
          series={4}
          x={graceX}
          y={graceY}
        ></helix-cursor>
      </div>

      <helix-button onClick={report}>Report new places</helix-button>
    </helix-flex>
  )
}
