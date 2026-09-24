import type { CanvasDocument, HelixCanvas } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'
import './board.css'

/* The document is a property rather than a URL, because what a fetch returns
   cannot be server-rendered: a board that arrived only with the JavaScript
   would be empty to a crawler and to a reader before it lands. A consumer with
   a `.canvas` file reads it and sets this. */
const BOARD: CanvasDocument = {
  edges: [
    { fromNode: 'write', id: 'e1', label: 'when it builds', toNode: 'review' },
    { fromNode: 'review', id: 'e2', label: 'when it is approved', toNode: 'ship' },
  ],
  nodes: [
    { height: 130, id: 'flow', label: 'Before the tag', type: 'group', width: 360, x: -16, y: -16 },
    { height: 90, id: 'write', text: 'Write the change', type: 'text', width: 150, x: 0, y: 0 },
    {
      color: '3',
      height: 90,
      id: 'review',
      text: 'Review it',
      type: 'text',
      width: 150,
      x: 194,
      y: 0,
    },
    {
      color: '4',
      height: 90,
      id: 'ship',
      text: 'Tag and publish',
      type: 'text',
      width: 150,
      x: 97,
      y: 140,
    },
  ],
}

export function Example() {
  const board = useRef<HelixCanvas>(null)

  useEffect(() => {
    if (board.current) {
      board.current.data = structuredClone(BOARD)
    }
  }, [])

  return (
    <helix-canvas
      id="board"
      label="How a release happens"
      ref={board}
    ></helix-canvas>
  )
}
